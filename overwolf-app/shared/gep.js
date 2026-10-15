/* Overwolf GEP(Valorant) 헬퍼.
 * 공식 문서: https://dev.overwolf.com/ow-native/live-game-data-gep/supported-games/valorant/
 * 메모리 읽기/인젝션을 직접 하지 않음 — Overwolf 공식 이벤트 API만 사용 (Vanguard 안전 원칙). */
(function () {
  'use strict';

  var FEATURES = ['me', 'game_info', 'match_info', 'kill', 'death'];

  // GEP rank 숫자 → 표시명 (공식 문서 기준)
  var RANKS = {
    0: 'Unranked', 3: 'Iron 1', 4: 'Iron 2', 5: 'Iron 3',
    6: 'Bronze 1', 7: 'Bronze 2', 8: 'Bronze 3',
    9: 'Silver 1', 10: 'Silver 2', 11: 'Silver 3',
    12: 'Gold 1', 13: 'Gold 2', 14: 'Gold 3',
    15: 'Platinum 1', 16: 'Platinum 2', 17: 'Platinum 3',
    18: 'Diamond 1', 19: 'Diamond 2', 20: 'Diamond 3',
    21: 'Ascendant 1', 22: 'Ascendant 2', 23: 'Ascendant 3',
    24: 'Immortal 1', 25: 'Immortal 2', 26: 'Immortal 3',
    27: 'Radiant'
  };

  // roster character(약칭) → 요원명
  var AGENT_SHORT = {
    Clay: 'Raze', Pandemic: 'Viper', Wraith: 'Omen', Hunter: 'Sova',
    Thorne: 'Sage', Phoenix: 'Phoenix', Wushu: 'Jett', Gumshoe: 'Cypher',
    Sarge: 'Brimstone', Breach: 'Breach', Vampire: 'Reyna', Killjoy: 'Killjoy',
    Guide: 'Skye', Stealth: 'Yoru', Rift: 'Astra', Grenadier: 'KAY/O',
    Deadeye: 'Chamber', Sprinter: 'Neon', BountyHunter: 'Fade', Mage: 'Harbor',
    AggroBot: 'Gekko', Cable: 'Deadlock', Sequoia: 'Iso', Smonk: 'Clove',
    Nox: 'Vyse', Cashew: 'Tejo', Terra: 'Waylay'
  };

  // me.agent(Clay_PC_C 형식) → 요원명
  var AGENT_PC = {
    Clay_PC_C: 'Raze', Pandemic_PC_C: 'Viper', Wraith_PC_C: 'Omen',
    Hunter_PC_C: 'Sova', Thorne_PC_C: 'Sage', Phoenix_PC_C: 'Phoenix',
    Wushu_PC_C: 'Jett', Gumshoe_PC_C: 'Cypher', Sarge_PC_C: 'Brimstone',
    Breach_PC_C: 'Breach', Vampire_PC_C: 'Reyna', Killjoy_PC_C: 'Killjoy',
    Guide_PC_C: 'Skye', Stealth_PC_C: 'Yoru', Rift_PC_C: 'Astra',
    Grenadier_PC_C: 'KAY/O', Deadeye_PC_C: 'Chamber', Sprinter_PC_C: 'Neon',
    BountyHunter_PC_C: 'Fade', Mage_PC_C: 'Harbor', AggroBot_PC_C: 'Gekko',
    Cable_PC_C: 'Deadlock', Sequoia_PC_C: 'Iso', Smonk_PC_C: 'Clove',
    Nox_PC_C: 'Vyse', Cashew_PC_C: 'Tejo', Terra_PC_C: 'Waylay'
  };

  function rankName(v) {
    var n = parseInt(v, 10);
    return RANKS[n] || 'Unranked';
  }

  function agentName(v) {
    if (!v) return '?';
    return AGENT_PC[v] || AGENT_SHORT[v] || v;
  }

  function parseRosterValue(raw) {
    try {
      var o = typeof raw === 'string' ? JSON.parse(raw) : raw;
      return {
        name: o.name || '',
        playerId: o.player_id || '',
        agent: agentName(o.character),
        agentRaw: o.character || '',
        rank: rankName(o.rank),
        rankRaw: o.rank,
        locked: !!o.locked,
        local: !!o.local,
        teammate: o.teammate !== false
      };
    } catch (e) { return null; }
  }

  function start(handlers) {
    handlers = handlers || {};
    var roster = {};      // slot -> entry
    var scoreboard = {};  // player_id -> entry
    var me = {};
    var matchState = { map: '', mode: '', score: null, round: 0, phase: '' };

    function emitRoster() {
      var list = Object.keys(roster).sort().map(function (k) { return roster[k]; });
      if (handlers.onRoster) handlers.onRoster(list);
      return list;
    }

    function handleInfoUpdate(payload) {
      if (!payload || !payload.info) return;
      var info = payload.info;

      if (info.match_info) {
        var mi = info.match_info;
        Object.keys(mi).forEach(function (key) {
          if (key.indexOf('roster_') === 0) {
            var e = parseRosterValue(mi[key]);
            if (e) roster[key] = e;
          }
        });
        if (mi.map) matchState.map = String(mi.map);
        if (mi.game_mode) {
          try {
            var gm = JSON.parse(mi.game_mode);
            matchState.mode = gm.mode || '';
          } catch (e) { matchState.mode = String(mi.game_mode); }
        }
        if (mi.score) {
          try { matchState.score = JSON.parse(mi.score); }
          catch (e) { matchState.score = null; }
        }
        if (mi.round_number) matchState.round = parseInt(mi.round_number, 10) || 0;
        if (mi.round_phase) matchState.phase = String(mi.round_phase);
        if (mi.scoreboard) {
          try {
            var sb = JSON.parse(mi.scoreboard);
            if (sb && sb.player_id) scoreboard[sb.player_id] = sb;
            if (handlers.onScoreboard) handlers.onScoreboard(scoreboard);
          } catch (e) { /* 부분 업데이트 무시 */ }
        }
        if (Object.keys(mi).some(function (k) { return k.indexOf('roster_') === 0; })) emitRoster();
        if (handlers.onMatchState) handlers.onMatchState(matchState);
      }
      if (info.me) {
        Object.keys(info.me).forEach(function (k) { me[k] = info.me[k]; });
        if (handlers.onMe) handlers.onMe(me);
      }
    }

    function handleEvent(ev) {
      if (handlers.onEvent) handlers.onEvent(ev);
    }

    overwolf.games.events.setRequiredFeatures(FEATURES, function (res) {
      if (res.status === 'error') {
        if (handlers.onError) handlers.onError(res.reason || 'GEP 구독 실패');
        return;
      }
      overwolf.games.events.onInfoUpdates2.addListener(handleInfoUpdate);
      overwolf.games.events.onNewEvents.addListener(handleEvent);
      if (handlers.onReady) handlers.onReady();
    });

    return {
      getRoster: function () { return Object.keys(roster).sort().map(function (k) { return roster[k]; }); },
      getMatchState: function () { return matchState; },
      getMe: function () { return me; }
    };
  }

  window.GEP = {
    start: start,
    rankName: rankName,
    agentName: agentName,
    FEATURES: FEATURES
  };
})();
