const path = require("path");
const fs = require("fs");
const { app } = require("electron");

class LLMService {
    constructor() {
        this.llama = null;
        this.model = null;
        this.context = null;
        this.initialized = false;
        this.modelName = null;
        this.modelPath = null;
        this.generating = false;
        this.batchSize = 512; // Default, will be overridden
        this.contextSize = 4096;
        this.threads = 4;
    }

    async initialize(modelPath, options = {}) {
        //console.log("=== LLMService.initialize ===");
        //console.log("Model:", path.basename(modelPath));
        //console.log("Options:", options);

        if (this.initialized) {
            this.initialized = false;
        }

        if (!modelPath || !fs.existsSync(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}`);
        }

        const modelSize = fs.statSync(modelPath).size;
        const modelSizeGB = modelSize / 1e9;
        //console.log(`Model size: ${modelSizeGB.toFixed(2)} GB`);

        // Use options or defaults
        this.contextSize = options.contextSize || 4096;
        this.threads = options.threads || 6;
        this.batchSize = options.batchSize || 512;

        //console.log(
        //     `Config: context=${this.contextSize}, threads=${this.threads}, batchSize=${this.batchSize}`,
        // );

        try {
            const { getLlama } = await import("node-llama-cpp");

            if (!this.llama) {
                this.llama = await getLlama({ gpu: "auto" });
            }

            if (!this.model) {
                //console.log("Loading model...");
                this.model = await this.llama.loadModel({
                    modelPath: modelPath,
                    gpuLayers: "auto",
                });
            }

            //console.log(
            //     `Creating context (contextSize=${this.contextSize}, batchSize=${this.batchSize}, threads=${this.threads})...`,
            // );
            this.context = await this.model.createContext({
                contextSize: this.contextSize,
                threads: this.threads,
                batchSize: this.batchSize,
                sequences: 1,
            });

            this.modelName = path.basename(modelPath, ".gguf");
            this.modelPath = modelPath;
            this.initialized = true;

            //console.log("✓ Model ready");
            //console.log(`  Name: ${this.modelName}`);
            //console.log(`  Context: ${this.contextSize}`);
            //console.log(`  Batch: ${this.batchSize}`);
            //console.log(`  Threads: ${this.threads}`);
            return true;
        } catch (error) {
            console.error("Failed to initialize:", error.message);

            // Try with lower batch size if VRAM error
            if (error.message.includes("VRAM") || error.message.includes("too large")) {
                const fallbackBatch = Math.floor(this.batchSize / 2);
                if (fallbackBatch >= 128) {
                    //console.log(`Retrying with batchSize=${fallbackBatch}...`);
                    try {
                        this.context = await this.model.createContext({
                            contextSize: this.contextSize,
                            threads: this.threads,
                            batchSize: fallbackBatch,
                            sequences: 1,
                        });
                        this.batchSize = fallbackBatch;
                        this.modelName = path.basename(modelPath, ".gguf");
                        this.modelPath = modelPath;
                        this.initialized = true;
                        //console.log("✓ Model ready with reduced batch size");
                        return true;
                    } catch (e) {
                        console.error("Fallback failed:", e.message);
                    }
                }
            }

            this.llama = null;
            this.model = null;
            this.context = null;
            this.initialized = false;
            throw error;
        }
    }

    async generateResponse(messages, onToken) {
        if (!this.initialized) {
            throw new Error("No model loaded");
        }

        //console.log("=== generateResponse ===");
        //console.log(`Using batchSize=${this.batchSize}, contextSize=${this.contextSize}`);

        const { LlamaChatSession } = await import("node-llama-cpp");

        let sequence;
        try {
            sequence = this.context.getSequence();
        } catch (e) {
            //console.log("No sequences left, recreating context...");
            this.context = await this.model.createContext({
                contextSize: this.contextSize,
                threads: this.threads,
                batchSize: this.batchSize,
                sequences: 1,
            });
            sequence = this.context.getSequence();
        }

        if (!sequence) {
            throw new Error("Failed to get context sequence");
        }

        const systemPrompt =
            messages.find((m) => m.role === "system")?.content ||
            "You are a helpful AI assistant. Keep answers concise and clear.";

        const session = new LlamaChatSession({
            contextSequence: sequence,
            systemPrompt: systemPrompt,
        });

        this.generating = true;
        const conversationMessages = messages.filter((m) => m.role !== "system");

        try {
            for (let i = 0; i < conversationMessages.length - 1; i++) {
                await session.prompt(conversationMessages[i].content, {
                    temperature: 0.7,
                    maxTokens: 128,
                });
            }

            const lastMessage = conversationMessages[conversationMessages.length - 1];
            //console.log(`Prompt: "${lastMessage.content.slice(0, 80)}..."`);

            const response = await session.prompt(lastMessage.content, {
                temperature: 0.7,
                maxTokens: 2048,
            });

            this.generating = false;
            //console.log(`Response: ${response.length} chars`);

            if (onToken) {
                onToken(response);
            }

            return response;
        } catch (error) {
            console.error("Generation error:", error.message);
            this.generating = false;
            throw error;
        }
    }

    stopGeneration() {
        this.generating = false;
    }

    static getAvailableModels() {
        const modelsDir = path.join(app.getPath("userData"), "models");
        if (!fs.existsSync(modelsDir)) {
            fs.mkdirSync(modelsDir, { recursive: true });
            return [];
        }

        try {
            return fs
                .readdirSync(modelsDir)
                .filter((f) => f.endsWith(".gguf"))
                .map((f) => {
                    const fullPath = path.join(modelsDir, f);
                    return {
                        name: f.replace(".gguf", ""),
                        path: fullPath,
                        size: fs.statSync(fullPath).size,
                    };
                });
        } catch {
            return [];
        }
    }

    static getRecommendedModels() {
        return [
            {
                name: "Llama-3.2-1B-Instruct",
                size: "~1GB",
                url: "https://huggingface.co/bartowski/Llama-3.2-1B-Instruct-GGUF/resolve/main/Llama-3.2-1B-Instruct-Q4_K_M.gguf",
                description: "Tiny - Works on 2GB VRAM",
            },
            {
                name: "Qwen2.5-1.5B-Instruct",
                size: "~1GB",
                url: "https://huggingface.co/bartowski/Qwen2.5-1.5B-Instruct-GGUF/resolve/main/Qwen2.5-1.5B-Instruct-Q4_K_M.gguf",
                description: "Small but capable",
            },
            {
                name: "Llama-3.2-3B-Instruct",
                size: "~2GB",
                url: "https://huggingface.co/bartowski/Llama-3.2-3B-Instruct-GGUF/resolve/main/Llama-3.2-3B-Instruct-Q4_K_M.gguf",
                description: "Great balance of speed and quality",
            },
        ];
    }
}

module.exports = LLMService;
