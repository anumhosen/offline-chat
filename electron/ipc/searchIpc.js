const { ipcMain } = require("electron");
const SearchService = require("../backend/SearchService");

function registerSearchIpc(state) {
  // Web search
  ipcMain.handle("search:web", async (event, query) => {
    //console.log("=== search:web ===");
    //console.log("Query:", query);

    if (!query || !query.trim()) {
      return { results: [] };
    }

    try {
      const results = await SearchService.smartSearch(query, 5);
      return { results, query };
    } catch (error) {
      console.error("Search failed:", error);
      return { results: [], error: error.message };
    }
  });

  // Search and format for context
  ipcMain.handle("search:context", async (event, query) => {
    //console.log("=== search:context ===");
    //console.log("Query:", query);

    try {
      // Use smartSearch which tries multiple sources
      const results = await SearchService.smartSearch(query, 3);
      const context = SearchService.formatResults(results, query);
      return { context, results };
    } catch (error) {
      console.error("Search context failed:", error);
      return { context: "", error: error.message };
    }
  });
}

module.exports = { registerSearchIpc };
