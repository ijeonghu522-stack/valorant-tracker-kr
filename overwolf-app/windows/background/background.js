/* 백그라운드 컨트롤러: 게임 실행 감지 → 창 관리 → GEP 구독 → 핫키 처리.
 * 화면이 없는 창이므로 모든 상태는 overwolf.storage.local + window 이벤트로 공유한다. */
(function () {
  'use strict';

  var VALORANT_ID = 21640;
  var OVERLAY = 'overlay';
  var DASHBOARD = 'dashboard';

  function openWindow(name, cb) {
    overwolf.windows.obtainDeclaredWindow(name, function (res) {
      if (res.status !== 'success') return;
      overwolf.windows.restore(res.window.id, function () {
        overwolf.windows.bringToFront(res.window.id, function () {});
        if (cb) cb(res.window);
      });
    });
  }

  function closeWindow(name) {
    overwolf.windows.obtainDeclaredWindow(name, function (res) {
      if (res.status === 'success') overwolf.windows.close(res.window.id, function () {});
    });
  }

  function onGameInfo(gameInfo) {
    if (!gameInfo || !gameInfo.gameInfo) return;
    var running = gameInfo.gameInfo.isRunning;
    var focused = gameInfo.gameInfo.isInFocus;
    if (running && focused) {
      // 게임 중: 대시보드는 닫고 오버레이 대기 (GEP roster 수신 시 표시)
      closeWindow(DASHBOARD);
    } else if (!running) {
      closeWindow(OVERLAY);
    }
  }

  function onHotkeyPressed(payload) {
    if (!payload || payload.status !== 'success') return;
    var name = payload.name;
    if (name === 'toggle_overlay') {
      overwolf.windows.getWindowState(OVERLAY, function (res) {
        if (res.status === 'success' && res.window_state === 'normal') closeWindow(OVERLAY);
        else openWindow(OVERLAY);
      });
    } else if (name === 'toggle_dashboard') {
      overwolf.windows.getWindowState(DASHBOARD, function (res) {
        if (res.status === 'success' && res.window_state === 'normal') closeWindow(DASHBOARD);
        else openWindow(DASHBOARD);
      });
    }
  }

  function boot() {
    // 1. 게임 실행/포커스 감지
    overwolf.games.getRunningGameInfo(onGameInfo);
    overwolf.games.onGameInfoUpdated.addListener(onGameInfo);

    // 2. 핫키
    if (overwolf.settings && overwolf.settings.hotkeys && overwolf.settings.hotkeys.onPressed) {
      overwolf.settings.hotkeys.onPressed.addListener(onHotkeyPressed);
    }

    // 3. GEP 구독 (요원 선택창 로스터/스코어보드 수신)
    if (window.GEP && GEP.start) {
      GEP.start({
        onRoster: function (roster) {
          // 로스터가 들어오면 오버레이를 띄우고 최신 로스터를 저장
          overwolf.storage.local.set({ latestRoster: JSON.stringify(roster) }, function () {});
          overwolf.games.getRunningGameInfo(function (gi) {
            if (gi && gi.gameInfo && gi.gameInfo.isRunning) openWindow(OVERLAY);
          });
        }
      });
    }

    // 4. 앱 시작 시 대시보드 (발로란트가 꺼져 있을 때)
    overwolf.games.getRunningGameInfo(function (gi) {
      var running = gi && gi.gameInfo && gi.gameInfo.isRunning;
      if (!running) openWindow(DASHBOARD);
    });
  }

  if (document.readyState === 'complete') boot();
  else window.addEventListener('load', boot, { once: true });
})();
