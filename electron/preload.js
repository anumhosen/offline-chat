const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // Window controls
  minimizeWindow: () => ipcRenderer.send("window:minimize"),
  maximizeWindow: () => ipcRenderer.send("window:maximize"),
  unmaximizeWindow: () => ipcRenderer.send("window:unmaximize"),
  closeWindow: () => ipcRenderer.send("window:close"),
  isMaximized: () => ipcRenderer.invoke("window:isMaximized"),
  onMaximizeChange: (callback) => {
    const handler = (event, isMaximized) => callback(isMaximized);
    ipcRenderer.on("window:maximizeChange", handler);
    return () => ipcRenderer.removeListener("window:maximizeChange", handler);
  },

  // chat
  sendMessage: (msg) => ipcRenderer.invoke("chat:send", msg),
  streamMessage: (msg, cb) => {
    const handler = (e, token) => cb(token);
    ipcRenderer.on("chat:token", handler);
    ipcRenderer.invoke("chat:sendStream", msg);
    return () => ipcRenderer.removeListener("chat:token", handler);
  },
  stopGeneration: () => ipcRenderer.send("chat:stop"),

  // File handling
  selectFile: () => ipcRenderer.invoke("dialog:selectFile"),
  selectImage: () => ipcRenderer.invoke("dialog:selectImage"),
  processFile: (filePath) => ipcRenderer.invoke("rag:process", filePath),

  // Models
  getModels: () => ipcRenderer.invoke("model:list"),
  selectModelFile: () => ipcRenderer.invoke("model:selectFile"),
  loadModel: (path) => ipcRenderer.invoke("model:load", path),
  loadLastModel: () => ipcRenderer.invoke("model:loadLast"),
  unloadModel: () => ipcRenderer.invoke("model:unload"),
  getModelStatus: () => ipcRenderer.invoke("model:status"),
  openModelsFolder: () => ipcRenderer.invoke("model:openFolder"),
  changeModelsDirectory: () => ipcRenderer.invoke("model:changeDirectory"),
  getModelsDirectory: () => ipcRenderer.invoke("settings:getModelsDirectory"),
  getRecommendedModels: () => ipcRenderer.invoke("model:recommended"),

  // Model Download
  downloadModel: (options) => ipcRenderer.invoke("model:download", options),
  cancelDownload: (filename) => ipcRenderer.invoke("model:cancelDownload", filename),
  onDownloadProgress: (cb) => {
    //console.log("Registering download progress listener");
    const handler = (event, data) => {
      //console.log("IPC received progress:", data);
      cb(data);
    };
    ipcRenderer.on("model:downloadProgress", handler);
    // Return cleanup function
    return () => {
      //console.log("Removing download progress listener");
      ipcRenderer.removeListener("model:downloadProgress", handler);
    };
  },

  // history
  getChats: () => ipcRenderer.invoke("history:list"),
  getChat: (id) => ipcRenderer.invoke("history:get", id),
  getMessages: (chatId) => ipcRenderer.invoke("history:messages", chatId),
  createChat: (id, title, model) => ipcRenderer.invoke("history:createChat", id, title, model),
  addMessage: (id, chatId, role, content, attachments) =>
    ipcRenderer.invoke("history:addMessage", id, chatId, role, content, attachments),
  updateChatTitle: (id, title) => ipcRenderer.invoke("history:updateTitle", id, title),
  deleteChat: (id) => ipcRenderer.invoke("history:delete", id),

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (s) => ipcRenderer.invoke("settings:save", s),
  selectModelsDirectory: () => ipcRenderer.invoke("settings:selectModelsDirectory"),
  getModelsDirectory: () => ipcRenderer.invoke("settings:getModelsDirectory"),

  // Search
  searchWeb: (query) => ipcRenderer.invoke("search:web", query),
  searchContext: (query) => ipcRenderer.invoke("search:context", query),
  searchMulti: (queries) => ipcRenderer.invoke("search:multi", queries),
});
