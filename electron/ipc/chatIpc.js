const { ipcMain } = require("electron");

function registerChatIpc(state) {
  //console.log('Registering Chat IPC handlers...');

  // Simple send message (non-streaming)
  ipcMain.handle("chat:send", async (event, messages) => {
    //console.log('=== chat:send called ===');
    //console.log('Messages count:', messages?.length);

    if (!state.llmService?.initialized) {
      console.error("No model loaded!");
      throw new Error("No model loaded. Please load a model first.");
    }

    try {
      const response = await state.llmService.generateResponse(messages);
      //console.log('Response generated:', response?.length || 0, 'chars');
      return response;
    } catch (error) {
      console.error("Chat error:", error.message);
      throw error;
    }
  });

  // Streaming send
  ipcMain.handle("chat:sendStream", async (event, messages) => {
    //console.log('=== chat:sendStream called ===');

    if (!state.llmService?.initialized) {
      throw new Error("No model loaded");
    }

    try {
      const response = await state.llmService.generateResponse(messages, (token) => {
        if (event.sender && !event.sender.isDestroyed()) {
          event.sender.send("chat:token", token);
        }
      });

      // Send completion signal
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("chat:done", response);
      }

      return response;
    } catch (error) {
      console.error("Stream error:", error.message);
      if (event.sender && !event.sender.isDestroyed()) {
        event.sender.send("chat:error", error.message);
      }
      throw error;
    }
  });

  // Stop generation
  ipcMain.on("chat:stop", () => {
    //console.log('chat:stop called');
    state.llmService?.stopGeneration();
  });

  //console.log('Chat IPC handlers registered');
}

module.exports = { registerChatIpc };
