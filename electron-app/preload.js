'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  deviceId: () => ipcRenderer.invoke('vlt:device-id'),
  activate: (key) => ipcRenderer.invoke('vlt:activate', key),
  openLicense: () => ipcRenderer.send('vlt:open-license')
});
