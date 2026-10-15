/* Riot API 호출은 항상 자체 백엔드 프록시를 경유한다.
 * 이유: Riot API 키를 클라이언트(오버레이 앱)에 넣으면 유출되어 악용된다.
 * 백엔드 기본 주소는 설정에서 변경 가능. 키가 없으면 MOCK 모드로 동작. */
(function () {
  'use strict';

  var BACKEND_KEY = 'vlt_backend_url';
  var DEFAULT_BACKEND = 'http://localhost:8787';

  function backendBase(cb) {
    try {
      overwolf.storage.local.get(BACKEND_KEY, function (res) {
        var url = (res && res[BACKEND_KEY]) || DEFAULT_BACKEND;
        cb(String(url).replace(/\/$/, ''));
      });
    } catch (e) { cb(DEFAULT_BACKEND); }
  }

  function get(path, cb) {
    backendBase(function (base) {
      fetch(base + path, { headers: { 'Accept': 'application/json' } })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
        .then(function (out) { cb(null, out); })
        .catch(function (err) { cb(err); });
    });
  }

  function setBackend(url, cb) {
    var o = {}; o[BACKEND_KEY] = String(url).replace(/\/$/, '');
    overwolf.storage.local.set(o, function () { if (cb) cb(); });
  }

  // Riot ID → 계정(PUUID)
  function getAccount(gameName, tagLine, cb) {
    get('/api/riot/account/' + encodeURIComponent(gameName) + '/' + encodeURIComponent(tagLine), cb);
  }

  // PUUID → 최근 매치 ID 목록
  function getMatchlist(puuid, cb) {
    get('/api/riot/matchlist/' + encodeURIComponent(puuid), cb);
  }

  // 매치 상세
  function getMatch(matchId, cb) {
    get('/api/riot/match/' + encodeURIComponent(matchId), cb);
  }

  // 이름(Riot ID)으로 커리어 집계 (쿼리 방식, n = 분석 경기 수: 무료 10 / Pro 30)
  function getCareer(gameName, tagLine, n, cb) {
    if (typeof n === 'function') { cb = n; n = 20; }
    get('/api/career?name=' + encodeURIComponent(gameName) + '&tag=' + encodeURIComponent(tagLine) + '&n=' + (n || 20), cb);
  }

  window.RiotClient = {
    getAccount: getAccount,
    getMatchlist: getMatchlist,
    getMatch: getMatch,
    getCareer: getCareer,
    setBackend: setBackend
  };
})();
