/* 대시보드: Riot ID 조회 → 커리어 집계 렌더 → Tracker Score → Pro 게이팅 */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function fmt(n) { return (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('ko-KR'); }

  // 탭 전환
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(function (x) { x.classList.remove('active'); });
      t.classList.add('active');
      document.querySelectorAll('.tabpanel').forEach(function (p) { p.classList.add('hidden'); });
      $('tab-' + t.dataset.tab).classList.remove('hidden');
    });
  });

  function notice(msg) {
    var n = $('notice');
    if (!msg) { n.classList.add('hidden'); return; }
    n.textContent = msg;
    n.classList.remove('hidden');
  }

  function bar(id, val, max) {
    var el = $(id);
    el.style.width = Math.max(0, Math.min(100, (val / Math.max(1, max)) * 100)) + '%';
  }

  function render(c) {
    $('playMeta').textContent = (c.matches || 0) + ' Matches';
    $('rankName').textContent = c.rank || 'Unranked';
    $('stDpr').textContent = fmt(Math.round(c.dpr));
    $('stKd').textContent = c.kd != null ? Number(c.kd).toFixed(1) : '-';
    $('stKills').textContent = fmt(c.kills);
    $('stWin').textContent = c.winRate != null ? (c.winRate * 100).toFixed(1) + '%' : '-';
    $('stHs').textContent = c.hsRate != null ? Math.round(c.hsRate * 100) + '%' : '-';
    renderForm(c.recent || '');

    var atk = c.attack || { k: 0, d: 0, a: 0 }, def = c.defense || { k: 0, d: 0, a: 0 };
    $('atkKv').textContent = fmt(atk.k); $('atkDv').textContent = fmt(atk.d); $('atkAv').textContent = fmt(atk.a);
    $('defKv').textContent = fmt(def.k); $('defDv').textContent = fmt(def.d); $('defAv').textContent = fmt(def.a);
    var mk = Math.max(atk.k, def.k, 1), md = Math.max(atk.d, def.d, 1), ma = Math.max(atk.a, def.a, 1);
    bar('atkK', atk.k, mk); bar('defK', def.k, mk);
    bar('atkD', atk.d, md); bar('defD', def.d, md);
    bar('atkA', atk.a, ma); bar('defA', def.a, ma);

    // 요원별
    var grid = $('agentGrid'); grid.innerHTML = '';
    (c.agents || []).slice(0, 12).forEach(function (a) {
      var d = document.createElement('div');
      d.className = 'card';
      d.innerHTML = '<div class="label"></div><div class="value"></div><div class="meta"></div>';
      d.children[0].textContent = a.agent;
      d.children[1].textContent = 'K/D ' + (a.kd != null ? Number(a.kd).toFixed(2) : '-');
      d.children[2].textContent = '승률 ' + (a.winRate != null ? (a.winRate * 100).toFixed(0) + '%' : '-') + ' · ' + (a.matches || 0) + '판';
      grid.appendChild(d);
    });

    // 맵별 승률 (무료 상위 3개 / Pro 전체)
    var maps = c.maps || [];
    var showMaps = window.__pro ? maps : maps.slice(0, 3);
    var mt = $('mapTable');
    mt.innerHTML = '';
    showMaps.forEach(function (m) {
      var tr = document.createElement('tr');
      var td1 = document.createElement('td'); td1.textContent = m.map;
      var td2 = document.createElement('td'); td2.textContent = (m.matches || 0) + '판';
      var td3 = document.createElement('td'); td3.textContent = m.winRate != null ? Math.round(m.winRate * 100) + '%' : '-';
      tr.appendChild(td1); tr.appendChild(td2); tr.appendChild(td3);
      mt.appendChild(tr);
    });
    $('mapMeta').textContent = '상위 ' + showMaps.length + '/' + maps.length + '개 표시' + (window.__pro ? '' : ' (무료)');

    // Tracker Score
    var s = TrackerScore.compute({ kd: c.kd, dpr: c.dpr, winRate: c.winRate, hsRate: c.hsRate, matches: c.matches });
    $('scoreNum').textContent = s.score + '점';
    $('scoreBadge').textContent = s.grade;
    var colors = { S: '#35c7c7', A: '#35c759', B: '#d9a400', C: '#9aa3b5', D: '#555' };
    $('scoreBadge').style.background = colors[s.grade] || '#555';
    $('scoreNote').textContent = s.note || (c.mock ? 'MOCK 데이터 (백엔드 연결 후 실제 전적 표시)' : '최근 ' + (c.matches || 0) + '경기 기준');
    renderPredict(c, s);
  }

  function renderPredict(c, s) {
    var box = $('predictTxt');
    if (!box) return;
    var cands = TrackerScore.GRADES.filter(function (g) { return g.min > s.score; });
    var next = cands.length ? cands[cands.length - 1] : null;
    if (!next) { box.textContent = '최고 등급 S 달성!'; return; }
    var gap = next.min - s.score;
    var wr = c.winRate || 0;
    var pace = wr >= 0.55 ? '상승세예요' : (wr >= 0.45 ? '유지 중이에요' : '하락세 — K/D와 DPR부터 잡으세요');
    box.textContent = next.grade + '까지 ' + gap + '점 (' + pace + ')';
  }

  function renderForm(recent) {
    var box = $('recentForm'); box.innerHTML = '';
    var seq = String(recent).slice(0, 10).split('');
    seq.forEach(function (r) {
      var d = document.createElement('span');
      d.className = 'dot ' + (r === 'W' ? 'w' : 'l');
      d.textContent = r;
      box.appendChild(d);
    });
    var streakType = seq[0] || '';
    var tail = 0;
    for (var i = 0; i < seq.length && seq[i] === streakType; i++) tail++;
    $('streak').textContent = seq.length ? (tail + (streakType === 'W' ? '연승' : '연패') + ' 중') : '';
  }

  // 시뮬레이션 토글 (게임 없이 오버레이 테스트)
  overwolf.storage.local.get('vlt_sim', function (res) {
    var on = res && res.vlt_sim === '1';
    paintSim(on);
  });
  function paintSim(on) {
    var b = $('simToggle');
    b.textContent = '시뮬레이션: ' + (on ? 'ON' : 'OFF');
    b.classList.toggle('on', !!on);
  }
  $('simToggle').addEventListener('click', function () {
    overwolf.storage.local.get('vlt_sim', function (res) {
      var on = !(res && res.vlt_sim === '1');
      overwolf.storage.local.set({ vlt_sim: on ? '1' : '0' }, function () { paintSim(on); });
    });
  });

  function mock(name) {
    return {
      mock: true, name: name, matches: 20, rank: 'Silver 2',
      dpr: 138, kd: 1.1, kills: 141, deaths: 128, assists: 41,
      winRate: 0.5, hsRate: 0.24,
      maps: [
        { map: 'Ascent', matches: 7, winRate: 0.571 },
        { map: 'Bind', matches: 5, winRate: 0.6 },
        { map: 'Lotus', matches: 4, winRate: 0.25 },
        { map: 'Sunset', matches: 4, winRate: 0.5 }
      ],
      attack: { k: 70, d: 66, a: 20 }, defense: { k: 71, d: 62, a: 21 },
      agents: [
        { agent: 'Raze', kd: 1.2, winRate: 0.52, matches: 12 },
        { agent: 'Brimstone', kd: 0.9, winRate: 0.5, matches: 5 },
        { agent: 'Omen', kd: 1.0, winRate: 0.33, matches: 3 }
      ]
    };
  }

  // 마지막 계정 기억 (다음 실행 때 자동 입력)
  function memGet(k) { try { return localStorage.getItem('vlt_' + k) || ''; } catch (e) { return ''; } }
  function memSet(k, v) { try { localStorage.setItem('vlt_' + k, v); } catch (e) {} }
  var lastId = memGet('lastId');
  if (lastId) $('riotId').value = lastId;

  function search() {
    var v = $('riotId').value.trim();
    memSet('lastId', v);
    if (!v || v.indexOf('#') < 0) { notice('Riot ID 형식으로 입력하세요. 예: 이름#KR1'); return; }
    var parts = v.split('#');
    notice('조회 중…');
    RiotClient.getCareer(parts[0], parts[1], window.__pro ? 30 : 10, function (err, out) {
      if (err || !out || !out.ok) {
        notice('백엔드/키 문제로 MOCK 데이터를 표시합니다. (' + (err ? String(err) : 'HTTP ' + (out && out.status)) + ')');
        render(mock(v));
        return;
      }
      notice('');
      render(out.data);
    });
  }

  $('searchBtn').addEventListener('click', search);
  $('riotId').addEventListener('keydown', function (e) { if (e.key === 'Enter') search(); });

  // 백엔드 주소 저장
  overwolf.storage.local.get('vlt_backend_url', function (res) {
    $('backendUrl').value = (res && res.vlt_backend_url) || 'http://localhost:8787';
  });
  $('saveBackend').addEventListener('click', function () {
    RiotClient.setBackend($('backendUrl').value, function () { notice('백엔드 주소 저장됨'); });
  });

  // Pro 상태 (?pro=1 우선 — exe 라이선스, 그 외 Overwolf 구독, 기본 Free)
  var proQuery = false;
  try { proQuery = /[?&]pro=1/.test(window.location.search); } catch (e) { proQuery = false; }
  window.__pro = proQuery;
  function refreshPro() {
    var pro = window.__pro;
    $('proState').textContent = pro ? '✅ Pro 활성 상태입니다. (최근 30경기 분석)' : '현재 Free 플랜입니다. (최근 10경기 분석)';
    $('buyPro').style.display = pro ? 'none' : '';
    $('scoreLock').style.display = pro ? 'none' : '';
    $('mapLock').style.display = pro ? 'none' : '';
    var pb = $('predictBox'); if (pb) pb.style.display = pro ? '' : 'none';
    Subs.applyProGating(document, pro);
  }
  refreshPro();
  Subs.isPro(function (_, pro) {
    window.__pro = proQuery || pro;
    refreshPro();
  });
  $('buyPro').addEventListener('click', function () {
    notice('토스뱅크 1908-4172-3421 천우진 으로 20,000원을 입금(입금자명=주문자명)하면 키를 보내드립니다.');
  });
  // Pro 테마 선택 (무료는 잠금)
  (function themes() {
    var row = $('themeRow');
    if (!row || !window.Themes) return;
    var names = { red: '레드', gold: '골드', blue: '블루', purple: '퍼플' };
    function paint() {
      row.innerHTML = '';
      Themes.THEMES.forEach(function (t) {
        var b = document.createElement('button');
        b.className = 'theme-btn';
        b.dataset.t = t;
        b.textContent = names[t] + (window.__pro ? '' : ' 🔒');
        b.addEventListener('click', function () {
          if (!window.__pro) { notice('테마 변경은 Pro 전용입니다.'); return; }
          Themes.set(t, paintSel);
        });
        row.appendChild(b);
      });
      paintSel();
    }
    function paintSel() {
      Themes.get(function (cur) {
        Array.prototype.forEach.call(row.children, function (b) {
          if (b.dataset.t === cur) b.classList.add('sel');
          else b.classList.remove('sel');
        });
      });
    }
    paint();
  })();

  $('openLicense').addEventListener('click', function () {
    if (window.electron && window.electron.openLicense) window.electron.openLicense();
    else notice('exe에서 Shift+F8을 눌러 등록창을 여세요.');
  });

  // 저장된 계정이 있으면 자동 조회
  if (lastId && lastId.indexOf('#') >= 0) search();
  else render(mock('_player'));
})();
