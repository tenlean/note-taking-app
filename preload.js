const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
  notes: {
    loadAll: () => ipcRenderer.invoke("notes:loadAll"),
    save: (note) => ipcRenderer.invoke("notes:save", note),
    delete: (id) => ipcRenderer.invoke("notes:delete", id),
  },
  drawings: {
    loadAll: () => ipcRenderer.invoke("drawings:loadAll"),
    save: (drawing) => ipcRenderer.invoke("drawings:save", drawing),
    delete: (id) => ipcRenderer.invoke("drawings:delete", id),
  },
});
