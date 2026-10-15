/* 브라우저 미리보기용 overwolf API 스텁.
 * 크롬에서 dashboard.html / overlay.html을 직접 열어 UI를 확인할 때만 동작.
 * Overwolf 클라이언트 안에서는 window.overwolf가 이미 있어서 아무 일도 안 함. */
(function () {
  'use strict';
  var hasOw = false;
  try { hasOw = !!(window.overwolf || (typeof overwolf !== 'undefined' && overwolf)); } catch (e) { hasOw = false; }
  if (hasOw) return;

  var store = {};
  try { store = JSON.parse(localStorage.getItem('vlt_stub') || '{}'); } catch (e) { store = {}; }
  function save() { try { localStorage.setItem('vlt_stub', JSON.stringify(store)); } catch (e) {} }

  var ow = {
    storage: {
      local: {
        get: function (k, cb) {
          var o = {};
          if (k in store) o[k] = store[k];
          setTimeout(function () { cb(o); }, 0);
        },
        set: function (o, cb) {
          for (var x in o) { if (Object.prototype.hasOwnProperty.call(o, x)) store[x] = o[x]; }
          save();
          setTimeout(function () { if (cb) cb(); }, 0);
        }
      }
    },
    windows: {
      obtainDeclaredWindow: function (n, cb) { cb({ status: 'success', window: { id: n } }); },
      restore: function (id, cb) { if (cb) cb({ status: 'success' }); },
      bringToFront: function () {},
      close: function () {},
      getWindowState: function (n, cb) { cb({ status: 'success', window_state: 'closed' }); }
    },
    games: {
      getRunningGameInfo: function (cb) { cb({ gameInfo: { isRunning: false } }); },
      onGameInfoUpdated: { addListener: function () {} },
      events: {
        setRequiredFeatures: function (f, cb) { cb({ status: 'error', reason: 'browser-preview' }); },
        onInfoUpdates2: { addListener: function () {} },
        onNewEvents: { addListener: function () {} }
      }
    },
    settings: { hotkeys: { onPressed: { addListener: function () {} } } }
  };
  window.overwolf = ow;
  try { globalThis.overwolf = ow; } catch (e) {}
})();
