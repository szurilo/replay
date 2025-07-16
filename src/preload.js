const { contextBridge, ipcRenderer } = require("electron");

// Import desktopCapturer from the main electron module
const { desktopCapturer } = require("@electron/remote");

contextBridge.exposeInMainWorld("electronAPI", {
  desktopCapturer: desktopCapturer,
  ipcRenderer: {
    on: (channel, func) =>
      ipcRenderer.on(channel, (_, ...args) => func(...args)),
    send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  },
});
