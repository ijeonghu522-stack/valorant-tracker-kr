/* 사이트 Worker: 정적 파일 + 전적 검색 API.
 * RIOT_API_KEY는 시크릿으로 주입 (없거나 무효면 MOCK 응답 + mock:true 표시).
 * 실제 키 발급 후: 키 파일로 sites_set_secret(RIOT_API_KEY) → 재배포. */
function mockCareer(name, tag) {
  return {
    mock: true, name: name + '#' + tag, matches: 20, rank: 'Silver 2',
    kills: 141, deaths: 128, assists: 41, wins: 10,
    kd: 1.1, dpr: 138.4, winRate: 0.5, hsRate: 0.24,
    maps: [
      { map: 'Ascent', matches: 7, winRate: 0.571 },
      { map: 'Bind', matches: 5, winRate: 0.6 },
      { map: 'Lotus', matches: 4, winRate: 0.25 },
      { map: 'Sunset', matches: 4, winRate: 0.5 }
    ],
    agents: [
      { agent: 'Raze', matches: 12, kd: 1.2, winRate: 0.52 },
      { agent: 'Brimstone', matches: 5, kd: 0.9, winRate: 0.5 },
      { agent: 'Omen', matches: 3, kd: 1.0, winRate: 0.33 }
    ],
    recent: 'WWLLWWLWLW'
  };
}

async function riot(host, path, key) {
  const r = await fetch('https://' + host + path, { headers: { 'X-Riot-Token': key } });
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  return { ok: r.ok, status: r.status, data };
}

async function liveCareer(name, tag, n, key) {
  const acc = await riot('asia.api.riotgames.com',
    '/riot/account/v1/accounts/by-riot-id/' + encodeURIComponent(name) + '/' + encodeURIComponent(tag), key);
  if (!acc.ok) return { error: 'account-lookup-failed', status: acc.status };
  const puuid = acc.data.puuid;
  const list = await riot('kr.api.riotgames.com',
    '/val/match/v1/matchlists/by-puuid/' + encodeURIComponent(puuid), key);
  if (!list.ok) return { error: 'matchlist-failed', status: list.status };
  const ids = ((list.data && list.data.history) || []).slice(0, n).map((h) => h.matchId).filter(Boolean);
  const agg = { matches: 0, kills: 0, deaths: 0, assists: 0, wins: 0, damage: 0, rounds: 0, hs: 0, shots: 0, agents: {}, maps: {} };
  const recent = [];
  for (const id of ids) {
    const m = await riot('kr.api.riotgames.com', '/val/match/v1/matches/' + encodeURIComponent(id), key);
    if (!m.ok) continue;
    const d = m.data || {};
    const me = (d.players || []).find((p) => p.puuid === puuid || p.subject === puuid);
    if (!me) continue;
    const s = me.stats || {};
    agg.matches++;
    agg.kills += s.kills || 0; agg.deaths += s.deaths || 0; agg.assists += s.assists || 0;
    const myTeam = me.teamId;
    const t0 = (d.teams || []).find((t) => (t.teamId || t.team_id) === myTeam);
    const win = !!(t0 && t0.won === true);
    if (win) { agg.wins++; recent.push('W'); } else recent.push('L');
    const mapName = d.mapId || d.map || 'Unknown';
    agg.maps[mapName] = agg.maps[mapName] || { matches: 0, wins: 0 };
    agg.maps[mapName].matches++;
    if (win) agg.maps[mapName].wins++;
    const ch = me.characterId || me.agent || 'Unknown';
    agg.agents[ch] = agg.agents[ch] || { matches: 0, kills: 0, deaths: 0, wins: 0 };
    agg.agents[ch].matches++;
    agg.agents[ch].kills += s.kills || 0;
    agg.agents[ch].deaths += s.deaths || 0;
    if (win) agg.agents[ch].wins++;
    (d.roundResults || d.round_results || []).forEach((rr) => {
      agg.rounds++;
      const ps = (rr.playerStats || rr.player_stats || []).find((p) => p.puuid === puuid || p.subject === puuid);
      if (ps) (ps.damage || []).forEach((dm) => {
        agg.damage += dm.damage || 0;
        agg.hs += dm.headshots || 0;
        agg.shots += (dm.headshots || 0) + (dm.bodyshots || 0) + (dm.legshots || 0);
      });
    });
  }
  const kd = agg.deaths ? agg.kills / agg.deaths : agg.kills;
  return {
    name: name + '#' + tag, matches: agg.matches,
    kills: agg.kills, deaths: agg.deaths, assists: agg.assists, wins: agg.wins,
    kd: +kd.toFixed(2),
    dpr: agg.rounds ? +(agg.damage / agg.rounds).toFixed(1) : null,
    winRate: agg.matches ? +(agg.wins / agg.matches).toFixed(3) : null,
    hsRate: agg.shots ? +(agg.hs / agg.shots).toFixed(3) : null,
    maps: Object.entries(agg.maps).map(([map, m]) => ({ map, matches: m.matches, winRate: m.matches ? +(m.wins / m.matches).toFixed(3) : null })).sort((a, b) => b.matches - a.matches),
    agents: Object.entries(agg.agents).map(([agent, a]) => ({ agent, matches: a.matches, kd: a.deaths ? +(a.kills / a.deaths).toFixed(2) : a.kills, winRate: a.matches ? +(a.wins / a.matches).toFixed(3) : null })).sort((a, b) => b.matches - a.matches),
    recent: recent.slice(0, 10).join(''), rank: null
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/career') {
      const name = url.searchParams.get('name') || '';
      const tag = url.searchParams.get('tag') || '';
      const n = Math.min(parseInt(url.searchParams.get('n') || '10', 10) || 10, 20);
      if (!name || !tag) {
        return Response.json({ error: 'name-and-tag-required' }, { status: 400 });
      }
      const key = (env && env.RIOT_API_KEY) || '';
      if (!key) {
        return Response.json(mockCareer(name, tag));
      }
      try {
        const out = await liveCareer(name, tag, n, key);
        if (out.error) return Response.json(mockCareer(name, tag));
        return Response.json(out);
      } catch (e) {
        return Response.json(mockCareer(name, tag));
      }
    }
    if (url.pathname === '/api/health') {
      const key = (env && env.RIOT_API_KEY) || '';
      return Response.json({ ok: true, mock: !key });
    }
    return env.ASSETS.fetch(request);
  }
};
