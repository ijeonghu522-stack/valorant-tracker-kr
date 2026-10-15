/* 시뮬레이션 데이터: 게임 없이 오버레이 UI를 테스트한다.
 * 대시보드 푸터의 "시뮬레이션: ON"으로 활성화. GEP 파서와 동일한 형태로 제공한다. */
(function () {
  'use strict';

  var SIM_ROSTER = [
    { name: 'Player 1#KR1', playerId: 'sim-1', agent: '?', agentRaw: '', rank: 'Diamond 2', rankRaw: 19, locked: false, local: false, teammate: true },
    { name: 'Player 2#KR1', playerId: 'sim-2', agent: '?', agentRaw: '', rank: 'Ascendant 1', rankRaw: 21, locked: false, local: false, teammate: true },
    { name: 'amoavog#KR1', playerId: 'sim-3', agent: 'Cypher', agentRaw: 'Gumshoe', rank: 'Ascendant 1', rankRaw: 21, locked: true, local: false, teammate: true },
    { name: 'Benedict#KR1', playerId: 'sim-4', agent: 'Phoenix', agentRaw: 'Phoenix', rank: 'Ascendant 2', rankRaw: 22, locked: true, local: true, teammate: true },
    { name: '이룸뭐하지#KR1', playerId: 'sim-5', agent: 'Fade', agentRaw: 'BountyHunter', rank: 'Diamond 3', rankRaw: 20, locked: true, local: false, teammate: true },
    { name: 'EnemyA#KR1', playerId: 'sim-6', agent: 'Jett', agentRaw: 'Wushu', rank: 'Diamond 1', rankRaw: 18, locked: true, local: false, teammate: false },
    { name: 'EnemyB#KR1', playerId: 'sim-7', agent: 'Sova', agentRaw: 'Hunter', rank: 'Ascendant 1', rankRaw: 21, locked: true, local: false, teammate: false },
    { name: 'EnemyC#KR1', playerId: 'sim-8', agent: 'Omen', agentRaw: 'Wraith', rank: 'Diamond 3', rankRaw: 20, locked: true, local: false, teammate: false },
    { name: 'EnemyD#KR1', playerId: 'sim-9', agent: 'Sage', agentRaw: 'Thorne', rank: 'Diamond 2', rankRaw: 19, locked: true, local: false, teammate: false },
    { name: 'EnemyE#KR1', playerId: 'sim-10', agent: 'Raze', agentRaw: 'Clay', rank: 'Ascendant 1', rankRaw: 21, locked: true, local: false, teammate: false }
  ];

  var SIM_STATE = { map: 'Ascent', mode: 'bomb', score: { won: 0, lost: 0 }, round: 0, phase: 'shopping' };

  window.SIM = { roster: SIM_ROSTER, state: SIM_STATE };
})();
