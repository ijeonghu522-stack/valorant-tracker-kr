/* 인게임 오버레이: GEP 로스터 → 아군은 커리어 스탯까지, 상대는 요원+랭크만.
 * (Riot 정책: 경기 전 상대 스카우팅 금지 → 상세 스탯 표시 안 함) */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  var statCache = {}; // "이름#태그" -> career
  var ISPRO = false; // ?pro=1일 때만 상세 스탯 표시

  function splitName(full) {
    var i = full.lastIndexOf('#');
    if (i < 0) return null;
    return { name: full.slice(0, i), tag: full.slice(i + 1) };
  }

  function renderAllies(list) {
    var tb = $('allies');
    tb.innerHTML = '';
    list.forEach(function (p) {
      var tr = document.createElement('tr');
      if (p.local) tr.className = 'me';
      var key = p.name;
      var c = statCache[key];
      tr.innerHTML =
        '<td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = (p.locked ? '🔒 ' : '') + p.agent;
      tr.children[1].textContent = p.rank;
      if (ISPRO && c && !c.error) {
        var sc = TrackerScore.compute({ kd: c.kd, dpr: c.dpr, winRate: c.winRate, hsRate: c.hsRate, matches: c.matches });
        tr.children[2].textContent = sc.grade + ' ' + sc.score;
        tr.children[2].title = 'Tracker Score';
        tr.children[3].textContent = c.kd != null ? Number(c.kd).toFixed(2) : '-';
        tr.children[4].textContent = c.winRate != null ? Math.round(c.winRate * 100) + '%' : '-';
        tr.children[5].textContent = c.dpr != null ? Math.round(c.dpr) : '-';
        tr.children[6].textContent = c.hsRate != null ? Math.round(c.hsRate * 100) + '%' : '-';
        tr.children[7].textContent = c.recent || '-';
      } else if (!ISPRO) {
        for (var i = 2; i < 8; i++) { tr.children[i].textContent = '🔒'; tr.children[i].className = 'dim'; }
        tr.children[0].textContent += ' · ' + p.name;
      } else {
        for (var i = 2; i < 8; i++) { tr.children[i].textContent = '…'; tr.children[i].className = 'dim'; }
        tr.children[0].textContent += ' · ' + p.name;
      }
      tb.appendChild(tr);
    });
    if (!list.length) tb.innerHTML = '<tr><td colspan="8" class="dim">요원 선택창에서 로스터 수신 대기…</td></tr>';
  }

  function renderEnemies(list) {
    var tb = $('enemies');
    tb.innerHTML = '';
    list.forEach(function (p) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td></td><td></td><td></td><td></td><td></td><td></td><td></td>';
      tr.children[0].textContent = (p.locked ? '🔒 ' : '') + p.agent;
      tr.children[1].textContent = p.rank;
      for (var i = 2; i < 7; i++) { tr.children[i].textContent = '—'; tr.children[i].className = 'dim'; }
      tb.appendChild(tr);
    });
    if (!list.length) tb.innerHTML = '<tr><td colspan="7" class="dim">-</td></tr>';
  }

  function enrich(list) {
    if (!ISPRO) return; // 무료: 요원+랭크만 표시, 커리어 조회 안 함
    // 아군만 커리어 조회 (호출 제한 보호: 600ms 간격 순차)
    var queue = list.filter(function (p) { return p.teammate && !statCache[p.name]; });
    var i = 0;
    (function next() {
      if (i >= queue.length) return;
      var p = queue[i++];
      var s = splitName(p.name);
      if (!s || /^(Me|미노출)$/.test(p.name)) { statCache[p.name] = { error: 'hidden' }; renderAllies(list.filter(function (x) { return x.teammate; })); setTimeout(next, 100); return; }
      RiotClient.getCareer(s.name, s.tag, function (err, out) {
        statCache[p.name] = (err || !out || !out.ok) ? { error: true } : out.data;
        renderAllies(list.filter(function (x) { return x.teammate; }));
        setTimeout(next, 600);
      });
    })();
  }

  function onRoster(roster) {
    var allies = roster.filter(function (p) { return p.teammate; });
    var enemies = roster.filter(function (p) { return !p.teammate; });
    renderAllies(allies);
    renderEnemies(enemies);
    enrich(roster);
    $('status').textContent = '로스터 ' + roster.length + '명 수신 · ' + (ISPRO ? '아군 상세(Pro) / 상대 요원+랭크만 표시' : '무료 모드: 요원+랭크만 표시 (상세 스탯은 Pro)');
  }

  function boot() {
    // 시뮬레이션 모드: 게임 없이 가짜 로스터로 오버레이 테스트
    var simQuery = false;
    try {
      ISPRO = /[?&]pro=1/.test(window.location.search);
      if (ISPRO && document.body) document.body.classList.add('pro');
    } catch (e) { ISPRO = false; }
    try { simQuery = /[?&]sim=1/.test(window.location.search); } catch (e) { simQuery = false; }
    if (simQuery && window.SIM) {
      $('matchTag').textContent = 'bomb · Ascent (SIM)';
      onRoster(window.SIM.roster);
      return;
    }
    try {
      overwolf.storage.local.get('vlt_sim', function (res) {
        if (res && res.vlt_sim === '1' && window.SIM) {
          $('matchTag').textContent = 'bomb · Ascent (SIM)';
          onRoster(window.SIM.roster);
          return;
        }
        bootLive();
      });
    } catch (e) { bootLive(); }
  }

  function bootLive() {
    // 백그라운드가 저장한 최신 로스터가 있으면 즉시 표시
    try {
      overwolf.storage.local.get('latestRoster', function (res) {
        if (res && res.latestRoster) {
          try { onRoster(JSON.parse(res.latestRoster)); } catch (e) { /* 무시 */ }
        }
      });
    } catch (e) { /* 무시 */ }
    // 이 창에서도 직접 GEP 구독 (백그라운드 미실행 대비)
    if (window.GEP && GEP.start) {
      GEP.start({
        onRoster: onRoster,
        onMatchState: function (st) {
          $('matchTag').textContent = (st.mode || 'match') + (st.map ? ' · ' + st.map : '');
        },
        onError: function (reason) { $('status').textContent = 'GEP 오류: ' + reason; }
      });
    }
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });
})();
