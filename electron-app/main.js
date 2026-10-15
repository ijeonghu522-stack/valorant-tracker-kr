/* 발로란트 트래커 KR — 개인 exe 메인 프로세스.
 * 구조: 대시보드 창 + 투명 오버레이 창 + 라이선스 게이트.
 * 전적/키는 기존 backend 서버(localhost:8787)에 물어본다. */
'use strict';

const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');

const BACKEND = process.env.VLT_BACKEND || 'http://localhost:8787';

// UI 위치: 개발 중엔 overwolf-app 폴더, 패키징 후엔 extraResources/tracker-ui
function uiRoot() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'tracker-ui');
  return path.join(__dirname, '..', 'overwolf-app');
}

function deviceId() {
  const macs = Object.values(os.networkInterfaces()).flat()
    .filter((n) => n && !n.internal && n.mac && n.mac !== '00:00:00:00:00:00')
    .map((n) => n.mac).sort().join(',');
  return crypto.createHash('sha256').update(os.hostname() + '|' + os.userInfo().username + '|' + macs).digest('hex').slice(0, 32);
}

function licensePath() { return path.join(app.getPath('userData'), 'license.json'); }
function loadKey() {
  try { return JSON.parse(fs.readFileSync(licensePath(), 'utf8')).key || ''; }
  catch (e) { return ''; }
}
function saveKey(key) {
  fs.mkdirSync(path.dirname(licensePath()), { recursive: true });
  fs.writeFileSync(licensePath(), JSON.stringify({ key }));
}

async function checkKey(key) {
  if (!key) return false;
  try {
    const r = await fetch(BACKEND + '/api/license/check?key=' + encodeURIComponent(key));
    const j = await r.json();
    return !!(j && j.ok);
  } catch (e) { return false; }
}

let dashWin = null;
let overlayWin = null;
let overlayVisible = false;
let lastPro = false;
let clickThrough = true;

function openDashboard(pro) {
  if (dashWin && !dashWin.isDestroyed()) { dashWin.focus(); return; }
  dashWin = new BrowserWindow({
    width: 1280, height: 840, minWidth: 1024, minHeight: 640,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  dashWin.loadFile(path.join(uiRoot(), 'windows', 'dashboard', 'dashboard.html'), { query: { pro: pro ? '1' : '0' } });
}

function openLicense() {
  const w = new BrowserWindow({
    width: 460, height: 560, resizable: false, autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });
  w.loadFile(path.join(__dirname, 'renderer', 'license.html'));
}

function toggleOverlay() {
  if (!overlayWin || overlayWin.isDestroyed()) {
    overlayWin = new BrowserWindow({
      width: 980, height: 620,
      transparent: true, frame: false, alwaysOnTop: true,
      skipTaskbar: true, resizable: false,
      webPreferences: { preload: path.join(__dirname, 'preload.js') }
    });
    // exe에서는 GEP가 없으므로 시뮬레이션 로스터로 표시 (?sim=1)
    overlayWin.loadFile(path.join(uiRoot(), 'windows', 'overlay', 'overlay.html'), { query: { sim: '1', pro: lastPro ? '1' : '0' } });
    overlayWin.setIgnoreMouseEvents(true);
    clickThrough = true;
    overlayVisible = true;
    return;
  }
  overlayVisible = !overlayVisible;
  if (overlayVisible) overlayWin.show();
  else overlayWin.hide();
}

function toggleClickThrough() {
  if (!overlayWin || overlayWin.isDestroyed()) return;
  clickThrough = !clickThrough;
  overlayWin.setIgnoreMouseEvents(clickThrough);
}

ipcMain.handle('vlt:device-id', () => deviceId());
ipcMain.on('vlt:open-license', () => openLicense());
ipcMain.handle('vlt:activate', async (ev, key) => {
  try {
    const r = await fetch(BACKEND + '/api/license/activate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, device: deviceId() })
    });
    const j = await r.json();
    if (j && j.ok) {
      saveKey(key);
      lastPro = true;
      openDashboard(true);
      const wins = BrowserWindow.getAllWindows();
      const lic = wins.find((w) => !dashWin || w.id !== dashWin.id);
      if (dashWin && lic && !lic.isDestroyed() && lic !== dashWin) lic.close();
      return { ok: true };
    }
    return { ok: false, error: (j && j.error) || 'activate-failed' };
  } catch (e) { return { ok: false, error: 'backend-unreachable' }; }
});

app.whenReady().then(async () => {
  // 무료 버전은 키 없이 바로 실행. Pro 키가 있으면 ?pro=1로 고급 기능 해제
  lastPro = await checkKey(loadKey());
  openDashboard(lastPro);

  globalShortcut.register('Shift+F5', toggleOverlay);
  globalShortcut.register('Shift+F6', () => openDashboard());
  globalShortcut.register('Shift+F7', toggleClickThrough);
  globalShortcut.register('Shift+F8', () => openLicense());

  app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) checkKey(loadKey()).then(openDashboard);
});
});

// 발로란트 실행 감지 → 오버레이 자동 표시 (계정 인식: 마지막 조회 ID는 대시보드가 기억)
let gameSeen = false;
setInterval(() => {
  exec('tasklist /FI "IMAGENAME eq VALORANT-Win64-Shipping.exe" /NH', (e, out) => {
    const running = !e && /VALORANT-Win64-Shipping/i.test(out || '');
    if (running && !gameSeen) {
      gameSeen = true;
      if (!overlayWin || overlayWin.isDestroyed()) toggleOverlay();
      else { overlayWin.show(); overlayVisible = true; }
      if (dashWin && !dashWin.isDestroyed()) dashWin.minimize();
    }
    if (!running) gameSeen = false;
  });
}, 5000);

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
