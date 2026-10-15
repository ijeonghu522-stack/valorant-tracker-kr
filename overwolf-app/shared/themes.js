/* Pro 테마: red(기본) / gold / blue / purple.
 * 저장소는 overwolf.storage.local 우선, 없으면 localStorage. */
(function () {
  'use strict';

  var KEY = 'vlt_theme';
  var THEMES = ['red', 'gold', 'blue', 'purple'];

  function lsGet() { try { return localStorage.getItem(KEY) || 'red'; } catch (e) { return 'red'; } }
  function lsSet(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function get(cb) {
    try {
      overwolf.storage.local.get(KEY, function (res) {
        cb((res && res[KEY]) || lsGet());
      });
    } catch (e) { cb(lsGet()); }
  }

  function set(name, cb) {
    if (THEMES.indexOf(name) < 0) name = 'red';
    apply(name);
    try {
      var o = {}; o[KEY] = name;
      overwolf.storage.local.set(o, function () { lsSet(name); if (cb) cb(); });
    } catch (e) { lsSet(name); if (cb) cb(); }
  }

  function apply(name) {
    if (THEMES.indexOf(name) < 0) name = 'red';
    try { document.body.dataset.theme = name; } catch (e) {}
    return name;
  }

  // 부팅 시 저장된 테마 즉시 적용
  get(apply);

  window.Themes = { get: get, set: set, apply: apply, THEMES: THEMES };
})();
