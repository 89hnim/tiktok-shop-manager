const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openExcel: () => ipcRenderer.invoke('open-excel'),
  syncExcel: (data) => ipcRenderer.invoke('sync-excel', data),
  getExcelPath: () => ipcRenderer.invoke('get-excel-path'),
  setExcelPath: () => ipcRenderer.invoke('set-excel-path'),
  selectImages: () => ipcRenderer.invoke('select-images'),
  showItemInFolder: (path) => ipcRenderer.invoke('show-item-in-folder', path),
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkUpdate: (repo) => ipcRenderer.invoke('check-update', repo),
  downloadUpdate: (data) => ipcRenderer.invoke('download-update', data),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  onDownloadProgress: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on('download-progress', subscription);
    return () => ipcRenderer.removeListener('download-progress', subscription);
  },
});
