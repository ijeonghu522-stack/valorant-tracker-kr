/* Tracker Score: 0~1000점 + D/C/B/A/S 등급.
 * 등급 컷(예시 이미지 기준): D <300, C 300-474, B 475-649, A 650-824, S >=825 */
(function () {
  'use strict';

  var GRADES = [
    { min: 825, grade: 'S' },
    { min: 650, grade: 'A' },
    { min: 475, grade: 'B' },
    { min: 300, grade: 'C' },
    { min: 0, grade: 'D' }
  ];

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  // stats: { kd, dpr, winRate(0-1), hsRate(0-1), matches }
  function compute(stats) {
    stats = stats || {};
    var kd = Number(stats.kd) || 0;
    var dpr = Number(stats.dpr) || 0;
    var win = Number(stats.winRate) || 0;
    var hs = Number(stats.hsRate) || 0;
    var matches = Number(stats.matches) || 0;

    // 각 지표 0~1000 스케일
    var kdScore = clamp(((kd - 0.4) / 1.4) * 1000, 0, 1000);   // 0.4→0, 1.8→1000
    var dprScore = clamp(((dpr - 60) / 160) * 1000, 0, 1000);  // 60→0, 220→1000
    var winScore = clamp((win / 0.75) * 1000, 0, 1000);        // 75%→1000
    var hsScore = clamp(((hs - 0.08) / 0.35) * 1000, 0, 1000); // 8%→0, 43%→1000

    var score = Math.round(kdScore * 0.35 + dprScore * 0.30 + winScore * 0.25 + hsScore * 0.10);

    // 표본이 적으면 신뢰도 표시용으로 캡 (10판 미만은 최대 B)
    var capped = score;
    var note = '';
    if (matches > 0 && matches < 10) { capped = Math.min(score, 649); note = '표본 부족(10판 미만)'; }

    var grade = 'D';
    for (var i = 0; i < GRADES.length; i++) {
      if (capped >= GRADES[i].min) { grade = GRADES[i].grade; break; }
    }
    return { score: capped, raw: score, grade: grade, note: note, matches: matches };
  }

  window.TrackerScore = { compute: compute, GRADES: GRADES };
})();
