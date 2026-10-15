(function () {
  var btn = document.getElementById('dlBtn');
  var note = document.getElementById('dlNote');
  var url = (window.VLT_DOWNLOAD_URL || '').trim();
  if (btn) {
    if (url) {
      btn.href = url;
      if (note) note.textContent = '버전 ' + (window.VLT_VERSION || '') + ' · 약 79MB';
    } else {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (note) note.textContent = '설치 파일 업로드 준비 중입니다. 잠시 후 다시 시도해 주세요.';
      });
    }
  }
})();
(function () {
  var go = document.getElementById('go');
  if (!go) return;
  function gradeOf(s) {
    if (s >= 825) return ['S', '#0a3a4a'];
    if (s >= 650) return ['A', '#0a4a22'];
    if (s >= 475) return ['B', '#5a4a00'];
    if (s >= 300) return ['C', '#3a4152'];
    return ['D', '#2a2f3a'];
  }
  function scoreOf(c) {
    function cl(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    var kd = cl(((c.kd - 0.4) / 1.4) * 1000, 0, 1000);
    var dpr = cl((((c.dpr || 0) - 60) / 160) * 1000, 0, 1000);
    var win = cl(((c.winRate || 0) / 0.75) * 1000, 0, 1000);
    var hs = cl((((c.hsRate || 0) - 0.08) / 0.35) * 1000, 0, 1000);
    return Math.round(kd * 0.35 + dpr * 0.3 + win * 0.25 + hs * 0.1);
  }
  function $(id) { return document.getElementById(id); }
  async function run() {
    var v = $('q').value.trim();
    if (!v || v.indexOf('#') < 0) { $('msg').textContent = 'Riot ID 형식으로 입력하세요. 예: 이름#KR1'; return; }
    var p = v.split('#');
    $('msg').textContent = '조회 중…';
    $('res').classList.add('hidden');
    try {
      const r = await fetch('/api/career?name=' + encodeURIComponent(p[0]) + '&tag=' + encodeURIComponent(p[1]));
      const c = await r.json();
      if (c.error) { $('msg').textContent = '조회 실패: ' + c.error; return; }
      $('msg').textContent = c.mock ? '데모 데이터 표시 중 (Riot 승인 후 실제 전적으로 전환)' : '최근 ' + c.matches + '경기 기준';
      $('rName').textContent = c.name + (c.rank ? ' · ' + c.rank : '');
      var s = scoreOf(c);
      var g = gradeOf(s);
      $('rGrade').textContent = g[0];
      $('rGrade').style.background = g[1];
      $('rScore').textContent = s + '점';
      $('rKd').textContent = c.kd != null ? c.kd.toFixed(2) : '-';
      $('rDpr').textContent = c.dpr != null ? Math.round(c.dpr) : '-';
      $('rWin').textContent = c.winRate != null ? Math.round(c.winRate * 100) + '%' : '-';
      $('rHs').textContent = c.hsRate != null ? Math.round(c.hsRate * 100) + '%' : '-';
      $('rM').textContent = c.matches;
      $('rMaps').textContent = (c.maps || []).map(function (m) { return m.map + ' ' + Math.round((m.winRate || 0) * 100) + '%(' + m.matches + '판)'; }).join(' · ');
      $('res').classList.remove('hidden');
    } catch (e) { $('msg').textContent = '연결 실패. 잠시 후 다시 시도하세요.'; }
  }
  go.addEventListener('click', run);
  $('q').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
})();
document.querySelectorAll('.faq button').forEach(function (btn) {
  btn.addEventListener('click', function () {
    var box = btn.parentElement;
    var was = box.classList.contains('open');
    document.querySelectorAll('.faq').forEach(function (f) { f.classList.remove('open'); });
    if (!was) box.classList.add('open');
  });
});
document.querySelectorAll('a[href^="#"]').forEach(function (a) {
  a.addEventListener('click', function (e) {
    var t = document.querySelector(a.getAttribute('href'));
    if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth' }); }
  });
});
