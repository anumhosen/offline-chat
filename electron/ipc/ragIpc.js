const { ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

function registerRagIpc(state) {
  // Process file for RAG
  ipcMain.handle("rag:process", async (event, filePath) => {
    //console.log("=== rag:process ===");
    //console.log("File:", filePath);

    if (!filePath || !fs.existsSync(filePath)) {
      return { text: "", error: "File not found" };
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      let text = "";

      // PDF files - Use legacy build for Node.js
      if (ext === ".pdf") {
        try {
          //console.log("Processing PDF...");

          // Use pdfjs-dist legacy build for Node.js
          const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

          //console.log("PDF.js legacy loaded");

          // Read the PDF file
          const data = new Uint8Array(fs.readFileSync(filePath));
          //console.log(`PDF file size: ${(data.length / 1024).toFixed(1)} KB`);

          // Load the PDF document
          const loadingTask = pdfjsLib.getDocument({
            data,
            useWorkerFetch: false,
            isEvalSupported: false,
            useSystemFonts: true,
          });

          const pdf = await loadingTask.promise;

          //console.log(`PDF loaded: ${pdf.numPages} pages`);

          // Extract text from pages (limit to first 30 pages)
          const maxPages = Math.min(pdf.numPages, 30);
          const pages = [];

          for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items
              .map((item) => {
                // Handle different text item formats
                if (item.str) return item.str;
                return "";
              })
              .filter(Boolean)
              .join(" ");

            if (pageText.trim()) {
              pages.push(pageText);
            }
          }

          text = pages.join("\n\n");
          //console.log(`PDF parsed: ${text.length} chars from ${pages.length} pages`);

          if (!text || text.trim().length === 0) {
            return {
              text: "",
              error:
                "PDF appears to be scanned or image-based (no extractable text). Try a text-based PDF.",
            };
          }
        } catch (pdfError) {
          console.error("PDF.js failed:", pdfError.message);

          // Try alternative: use simple pdf-parse with proper import
          try {
            //console.log("Trying pdf-parse fallback...");
            const pdfParse = (await import("pdf-parse")).default;
            const dataBuffer = fs.readFileSync(filePath);
            const result = await pdfParse(dataBuffer);
            text = result.text || "";
            //console.log(`pdf-parse extracted: ${text.length} chars`);
          } catch (fallbackError) {
            console.error("Both PDF parsers failed");
            console.error("  pdfjs-dist:", pdfError.message);
            console.error("  pdf-parse:", fallbackError.message);
            return {
              text: "",
              error: `Cannot extract text from this PDF. It may be scanned or image-based. Try converting to text first or use OCR software.`,
            };
          }
        }
      }
      // DOCX files
      else if (ext === ".docx") {
        try {
          const mammoth = await import("mammoth");
          const result = await mammoth.extractRawText({ path: filePath });
          text = result.value || "";
          //console.log(`DOCX parsed: ${text.length} chars`);
        } catch (docxError) {
          return { text: "", error: `Failed to parse DOCX: ${docxError.message}` };
        }
      }
      // Text files
      else if (
        [
          ".txt",
          ".md",
          ".json",
          ".js",
          ".py",
          ".rb",
          ".go",
          ".java",
          ".c",
          ".cpp",
          ".h",
          ".css",
          ".html",
          ".xml",
          ".yaml",
          ".sh",
          ".sql",
          ".php",
          ".swift",
          ".r",
          ".log",
        ].includes(ext)
      ) {
        text = fs.readFileSync(filePath, "utf8");
        //console.log(`Text file: ${text.length} chars`);
      }
      // CSV files
      else if (ext === ".csv") {
        text = fs.readFileSync(filePath, "utf8");
        //console.log(`CSV file: ${text.length} chars`);
      }
      // Unsupported
      else {
        return {
          text: `[File type "${ext}" not fully supported. Try PDF, DOCX, TXT, or code files.]`,
          name: path.basename(filePath),
          type: ext,
        };
      }

      // Truncate to avoid context overflow
      const maxLength = 15000;
      const truncated = text.length > maxLength ? text.slice(0, maxLength) : text;

      return {
        text: truncated,
        name: path.basename(filePath),
        type: ext,
        fullLength: text.length,
        truncated: text.length > maxLength,
      };
    } catch (error) {
      console.error("File processing error:", error);
      return { text: "", error: error.message };
    }
  });

  // Select file dialog
  ipcMain.handle("dialog:selectFile", async () => {
    const result = await dialog.showOpenDialog({
      title: "Select File",
      properties: ["openFile"],
      filters: [
        { name: "All Supported", extensions: ["pdf", "docx", "txt", "md", "csv", "json", "log"] },
        { name: "PDF Documents", extensions: ["pdf"] },
        { name: "Word Documents", extensions: ["docx"] },
        { name: "Text Files", extensions: ["txt", "md", "csv", "log", "json"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });

    if (result.canceled) return null;

    const filePath = result.filePaths[0];
    const stats = fs.statSync(filePath);

    return {
      path: filePath,
      name: path.basename(filePath),
      type: path.extname(filePath).toLowerCase(),
      size: stats.size,
    };
  });
}

module.exports = { registerRagIpc };
