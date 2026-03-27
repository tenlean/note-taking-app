const { contextBridge, ipcRenderer } = require("electron");

// Exposes a minimal, explicit API to the renderer
// Renderer never gets direct access to Node.js or Electron internals
contextBridge.exposeInMainWorld("electron", {
  // Text notes file operations
  notes: {
    loadAll: () => ipcRenderer.invoke("notes:loadAll"),
    save: (note) => ipcRenderer.invoke("notes:save", note),
    delete: (id) => ipcRenderer.invoke("notes:delete", id),
  },
  // Drawing PNG file operations
  drawings: {
    loadAll: () => ipcRenderer.invoke("drawings:loadAll"),
    save: (drawing) => ipcRenderer.invoke("drawings:save", drawing),
    delete: (id) => ipcRenderer.invoke("drawings:delete", id),
  },
});
