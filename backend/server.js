/* Valorant Tracker KR 백엔드
 * - Riot API 키는 여기서만 보관 (클라이언트에 절대 노출 금지)
 * - 계정 조회: asia 라우트 / VALORANT 매치: kr 플랫폼 라우트
 * - 수동결제 주문 → 입금확인 → 라이선스 발급 → 비상 회수/정지 (관리자 API)
 * 실행: npm install && npm start  (기본 http://localhost:8787)
 */
'use strict';

require('dotenv').config({ path: '../.env' });
require('dotenv').config({ path: './.env' });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8787;
const RIOT_KEY = process.env.RIOT_API_KEY || '';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-me-now';
const MOCK = !RIOT_KEY;

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function loadDb() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { return { orders: [], licenses: [], audit: [] }; }
}
function saveDb(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }
function audit(db, action, detail) {
  db.audit.unshift({ at: new Date().toISOString(), action, detail });
  db.audit = db.audit.slice(0, 500);
}
function genKey() {
  const seg = () => crypto.randomBytes(3).toString('hex').toUpperCase();
  return `VLTKR-${seg()}-${seg()}-${seg()}`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- Riot 프록시 ---------- */
async function riotFetch(host, riotPath) {
  const r = await fetch(`https://${host}${riotPath}`, {
    headers: { 'X-Riot-Token': RIOT_KEY }
  });
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch (e) { data = { raw: text }; }
  return { ok: r.ok, status: r.status, data };
}

app.get('/api/riot/account/:gameName/:tag', async (req, res) => {
  if (MOCK) return res.json({ puuid: 'mock-puuid', gameName: req.params.gameName, tagLine: req.params.tag, mock: true });
  const out = await riotFetch('asia.api.riotgames.com',
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(req.params.gameName)}/${encodeURIComponent(req.params.tag)}`);
  res.status(out.status).json(out.data);
});

app.get('/api/riot/matchlist/:puuid', async (req, res) => {
  if (MOCK) return res.json({ history: [{ matchId: 'mock-1' }, { matchId: 'mock-2' }], mock: true });
  const out = await riotFetch('kr.api.riotgames.com',
    `/val/match/v1/matchlists/by-puuid/${encodeURIComponent(req.params.puuid)}`);
  res.status(out.status).json(out.data);
});

app.get('/api/riot/match/:id', async (req, res) => {
  if (MOCK) return res.json({ matchId: req.params.id, mock: true });
  const out = await riotFetch('kr.api.riotgames.com',
    `/val/match/v1/matches/${encodeURIComponent(req.params.id)}`);
  res.status(out.status).json(out.data);
});

/* 커리어 집계: 최근 N경기 평균 (K/D, DPR, 승률, HS%, 공/수, 요원별, 맵별)
 * 경로(/:gameName/:tag)와 쿼리(?name=&tag=) 모두 직접 처리 (리다이렉트 없음) */
async function careerHandler(req, res) {
  const gameName = req.params.gameName || req.query.name;
  const tag = req.params.tag || req.query.tag;
  if (!gameName || !tag) return res.status(400).json({ error: 'name-and-tag-required' });
  const N = Math.min(parseInt(req.query.n || '20', 10) || 20, 30);
  if (MOCK) return res.json(mockCareer(gameName, tag));

  const acc = await riotFetch('asia.api.riotgames.com',
    `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tag)}`);
  if (!acc.ok) return res.status(acc.status).json({ error: 'account-lookup-failed', detail: acc.data });
  const puuid = acc.data.puuid;

  const list = await riotFetch('kr.api.riotgames.com',
    `/val/match/v1/matchlists/by-puuid/${encodeURIComponent(puuid)}`);
  if (!list.ok) return res.status(list.status).json({ error: 'matchlist-failed', detail: list.data });
  const ids = (list.data.history || []).slice(0, N).map((h) => h.matchId).filter(Boolean);

  const agg = { matches: 0, kills: 0, deaths: 0, assists: 0, wins: 0, damage: 0, rounds: 0, hs: 0, shots: 0, atk: { k: 0, d: 0, a: 0 }, def: { k: 0, d: 0, a: 0 }, agents: {}, maps: {} };
  const recent = [];
  for (const id of ids) {
    const m = await riotFetch('kr.api.riotgames.com', `/val/match/v1/matches/${encodeURIComponent(id)}`);
    await sleep(650); // 개발키/기본 제한 보호
    if (!m.ok) continue;
    const d = m.data || {};
    const me = (d.players || []).find((p) => p.puuid === puuid || p.subject === puuid);
    if (!me) continue;
    const s = me.stats || {};
    agg.matches++;
    agg.kills += s.kills || 0; agg.deaths += s.deaths || 0; agg.assists += s.assists || 0;
    const myTeam = me.teamId;
    const teams = d.teams || [];
    // 승패: teams 배열의 won 플래그 우선
    let win = false;
    const t0 = teams.find((t) => (t.teamId || t.team_id) === myTeam);
    if (t0 && typeof t0.won === 'boolean') win = t0.won;
    if (win) { agg.wins++; recent.push('W'); } else recent.push('L');
    const mapName = d.mapId || d.map || (d.matchInfo && d.matchInfo.mapId) || 'Unknown';
    agg.maps[mapName] = agg.maps[mapName] || { matches: 0, wins: 0 };
    agg.maps[mapName].matches++;
    if (win) agg.maps[mapName].wins++;
    const charId = me.characterId || me.agent || 'Unknown';
    agg.agents[charId] = agg.agents[charId] || { matches: 0, kills: 0, deaths: 0, wins: 0 };
    agg.agents[charId].matches++;
    agg.agents[charId].kills += s.kills || 0;
    agg.agents[charId].deaths += s.deaths || 0;
    if (win) agg.agents[charId].wins++;
    // 라운드별 데미지/헤드샷 (roundResults가 있을 때만)
    (d.roundResults || d.round_results || []).forEach((rr) => {
      agg.rounds++;
      const ps = (rr.playerStats || rr.player_stats || []).find((p) => p.puuid === puuid || p.subject === puuid);
      if (ps) {
        (ps.damage || []).forEach((dm) => {
          agg.damage += dm.damage || 0;
          agg.hs += dm.headshots || 0;
          agg.shots += (dm.headshots || 0) + (dm.bodyshots || 0) + (dm.legshots || 0);
        });
      }
    });
  }

  const kd = agg.deaths ? agg.kills / agg.deaths : agg.kills;
  res.json({
    name: `${gameName}#${tag}`,
    matches: agg.matches,
    kills: agg.kills, deaths: agg.deaths, assists: agg.assists,
    wins: agg.wins,
    kd: +kd.toFixed(2),
    dpr: agg.rounds ? +(agg.damage / agg.rounds).toFixed(1) : null,
    winRate: agg.matches ? +(agg.wins / agg.matches).toFixed(3) : null,
    hsRate: agg.shots ? +(agg.hs / agg.shots).toFixed(3) : null,
    attack: agg.atk, defense: agg.def,
    maps: Object.entries(agg.maps).map(([map, m]) => ({
      map, matches: m.matches,
      winRate: m.matches ? +(m.wins / m.matches).toFixed(3) : null
    })).sort((a, b) => b.matches - a.matches),
    agents: Object.entries(agg.agents).map(([agent, a]) => ({
      agent, matches: a.matches,
      kd: a.deaths ? +(a.kills / a.deaths).toFixed(2) : a.kills,
      winRate: a.matches ? +(a.wins / a.matches).toFixed(3) : null
    })).sort((a, b) => b.matches - a.matches),
    recent: recent.slice(0, 10).join(''),
    rank: null // 공개 API에 개인 MMR 조회가 없어 리더보드 상위권이 아니면 표시 불가
  });
}
app.get('/api/career', careerHandler);
app.get('/api/career/:gameName/:tag', careerHandler);

function mockCareer(gameName, tag) {
  return {
    mock: true, name: `${gameName}#${tag}`, matches: 20, rank: 'Silver 2',
    maps: [
      { map: 'Ascent', matches: 7, winRate: 0.571 },
      { map: 'Bind', matches: 5, winRate: 0.6 },
      { map: 'Lotus', matches: 4, winRate: 0.25 },
      { map: 'Sunset', matches: 4, winRate: 0.5 }
    ],
    kills: 141, deaths: 128, assists: 41, wins: 10,
    kd: 1.1, dpr: 138.4, winRate: 0.5, hsRate: 0.24,
    attack: { k: 70, d: 66, a: 20 }, defense: { k: 71, d: 62, a: 21 },
    agents: [
      { agent: 'Raze', matches: 12, kd: 1.2, winRate: 0.52 },
      { agent: 'Brimstone', matches: 5, kd: 0.9, winRate: 0.5 },
      { agent: 'Omen', matches: 3, kd: 1.0, winRate: 0.33 }
    ],
    recent: 'WWLLWWLWLW'
  };
}

/* ---------- 구독 미러 (Tebex 웹훅 → Pro 여부) ---------- */
app.post('/api/tebex-webhook', (req, res) => {
  const db = loadDb();
  audit(db, 'tebex-webhook', req.body && (req.body.type || req.body.event || 'event'));
  saveDb(db);
  res.json({ ok: true });
});

app.get('/api/entitlement', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.query.key && l.status === 'active');
  res.json({ pro: !!lic, plan: lic ? 'pro-monthly-20' : 'free' });
});

/* ---------- 라이선스 (수동결제용 자체 키) ---------- */
app.post('/api/license/activate', (req, res) => {
  const { key, device } = req.body || {};
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === key);
  if (!lic) return res.status(404).json({ ok: false, error: 'unknown-key' });
  if (lic.status !== 'active') return res.status(403).json({ ok: false, error: lic.status });
  if (lic.expiresAt && new Date(lic.expiresAt) < new Date())
    return res.status(403).json({ ok: false, error: 'expired' });
  const fp = String(device || 'default');
  lic.devices = lic.devices || [];
  if (!lic.devices.includes(fp)) {
    if (lic.devices.length >= (lic.maxDevices || 1))
      return res.status(409).json({ ok: false, error: 'device-limit', devices: lic.devices.length });
    lic.devices.push(fp);
  }
  lic.lastCheck = new Date().toISOString();
  audit(db, 'license-activate', { key, device: fp });
  saveDb(db);
  res.json({ ok: true, pro: true, expiresAt: lic.expiresAt || null });
});

app.get('/api/license/check', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.query.key);
  if (!lic) return res.json({ ok: false });
  res.json({ ok: lic.status === 'active', status: lic.status, expiresAt: lic.expiresAt || null });
});

/* ---------- 관리자 API (x-admin-token 필요) ---------- */
function adminOnly(req, res, next) {
  if (req.headers['x-admin-token'] !== ADMIN_TOKEN)
    return res.status(401).json({ error: 'unauthorized' });
  next();
}
app.use('/api/admin', adminOnly);

app.get('/api/admin/orders', (req, res) => res.json(loadDb().orders));
app.post('/api/admin/orders', (req, res) => {
  const db = loadDb();
  const o = {
    id: 'ORD-' + Date.now().toString(36).toUpperCase(),
    customer: req.body.customer || '', amount: req.body.amount || 20000,
    memo: req.body.memo || '', status: 'pending_payment',
    createdAt: new Date().toISOString()
  };
  db.orders.unshift(o);
  audit(db, 'order-create', o.id);
  saveDb(db);
  res.json(o);
});
// 입금 확인 → 결제완료 + 라이선스 1회 발급 (멱등)
app.post('/api/admin/orders/:id/paid', (req, res) => {
  const db = loadDb();
  const o = db.orders.find((x) => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'no-order' });
  if (o.status === 'paid' && o.licenseKey) return res.json({ order: o, reused: true });
  o.status = 'paid';
  o.paidAt = new Date().toISOString();
  const lic = {
    key: genKey(), orderId: o.id, customer: o.customer,
    status: 'active', maxDevices: 1, devices: [],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() // 월 구독
  };
  db.licenses.unshift(lic);
  o.licenseKey = lic.key;
  audit(db, 'order-paid-license-issued', { order: o.id, key: lic.key });
  saveDb(db);
  res.json({ order: o, license: lic });
});

app.get('/api/admin/licenses', (req, res) => res.json(loadDb().licenses));
// 비상 회수 / 일시정지 / 복구
app.post('/api/admin/licenses/:key/revoke', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.params.key);
  if (!lic) return res.status(404).json({ error: 'no-license' });
  lic.status = 'revoked';
  audit(db, 'license-revoke', lic.key);
  saveDb(db);
  res.json(lic);
});
app.post('/api/admin/licenses/:key/suspend', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.params.key);
  if (!lic) return res.status(404).json({ error: 'no-license' });
  lic.status = 'suspended';
  audit(db, 'license-suspend', lic.key);
  saveDb(db);
  res.json(lic);
});
app.post('/api/admin/licenses/:key/unsuspend', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.params.key);
  if (!lic) return res.status(404).json({ error: 'no-license' });
  lic.status = 'active';
  audit(db, 'license-unsuspend', lic.key);
  saveDb(db);
  res.json(lic);
});
app.post('/api/admin/licenses/:key/devices/remove', (req, res) => {
  const db = loadDb();
  const lic = db.licenses.find((l) => l.key === req.params.key);
  if (!lic) return res.status(404).json({ error: 'no-license' });
  lic.devices = (lic.devices || []).filter((d) => d !== req.body.device);
  audit(db, 'device-remove', { key: lic.key, device: req.body.device });
  saveDb(db);
  res.json(lic);
});
app.get('/api/admin/audit', (req, res) => res.json(loadDb().audit));

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/api/health', (req, res) => res.json({ ok: true, mock: MOCK }));

app.listen(PORT, () => {
  console.log(`VLT backend on http://localhost:${PORT} (mock=${MOCK})`);
  if (MOCK) console.log('⚠️  RIOT_API_KEY 없음 → MOCK 모드. .env에 키를 넣고 재시작하세요.');
});
