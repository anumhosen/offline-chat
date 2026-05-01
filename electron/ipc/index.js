const { registerWindowIpc } = require("./windowIpc");
const { registerChatIpc } = require("./chatIpc");
const { registerModelIpc } = require("./modelIpc");
const { registerRagIpc } = require("./ragIpc");
const { registerHistoryIpc } = require("./historyIpc");
const { registerSettingsIpc } = require("./settingsIpc");
const { registerSearchIpc } = require("./searchIpc"); // ADD THIS
const AppDatabase = require("../backend/Database");
const LLMService = require("../backend/LLMService");

const state = {
  db: null,
  llmService: null,
  mainWindow: null,
};

function registerAllIpc() {
  state.db = new AppDatabase();
  state.llmService = new LLMService();

  const { BrowserWindow } = require("electron");
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) state.mainWindow = windows[0];

  registerWindowIpc(state);
  registerChatIpc(state);
  registerModelIpc(state);
  registerRagIpc(state);
  registerHistoryIpc(state);
  registerSettingsIpc(state);
  registerSearchIpc(state); // ADD THIS

  //console.log("All IPC handlers registered");
}

module.exports = { registerAllIpc, state };
