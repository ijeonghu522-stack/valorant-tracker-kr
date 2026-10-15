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
