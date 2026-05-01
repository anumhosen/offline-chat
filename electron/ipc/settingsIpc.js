const { ipcMain, dialog, app } = require("electron");
const path = require("path");
const fs = require("fs");

function registerSettingsIpc(state) {
    // Get settings
    ipcMain.handle("settings:get", () => ({
        temperature: state.db.getSetting("temperature") || 0.7,
        maxTokens: state.db.getSetting("maxTokens") || 4096,
        contextSize: state.db.getSetting("contextSize") || 8192,
        threads: state.db.getSetting("threads") || 6,
        batchSize: state.db.getSetting("batchSize") || 512, // Add this
        systemPrompt: state.db.getSetting("systemPrompt") || "",
        autoLoadModel: state.db.getSetting("autoLoadModel") || false,
        lastModelPath: state.db.getSetting("lastModelPath") || "",
        modelsDirectory:
            state.db.getSetting("modelsDirectory") || path.join(app.getPath("userData"), "models"),
    }));

    // Save settings
    ipcMain.handle("settings:save", (event, settings) => {
        // Save ALL settings including batchSize
        const keys = [
            "temperature",
            "maxTokens",
            "contextSize",
            "threads",
            "batchSize",
            "systemPrompt",
            "autoLoadModel",
            "lastModelPath",
            "modelsDirectory",
        ];

        keys.forEach((key) => {
            if (settings[key] !== undefined && settings[key] !== null) {
                state.db.setSetting(key, settings[key]);
            }
        });

        return true;
    });

    // Select models directory
    ipcMain.handle("settings:selectModelsDirectory", async () => {
        const result = await dialog.showOpenDialog({
            title: "Select Models Directory",
            properties: ["openDirectory", "createDirectory"],
            defaultPath: state.db.getSetting("modelsDirectory") || app.getPath("userData"),
        });

        if (result.canceled || result.filePaths.length === 0) return null;

        const dirPath = result.filePaths[0];
        state.db.setSetting("modelsDirectory", dirPath);

        return { path: dirPath };
    });

    // Get models directory
    ipcMain.handle("settings:getModelsDirectory", () => {
        return (
            state.db.getSetting("modelsDirectory") || path.join(app.getPath("userData"), "models")
        );
    });

    // Get settings status
    ipcMain.handle("settings:getStatus", () => ({
        database: !!state.db,
        hasModelsDir: !!state.db.getSetting("modelsDirectory"),
    }));
}

module.exports = { registerSettingsIpc };
