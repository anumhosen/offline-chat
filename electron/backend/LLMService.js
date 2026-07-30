const path = require("path");
const fs = require("fs");
const { app } = require("electron");

/**
 * LLMService - Manages loading and inference of GGUF models via node-llama-cpp
 */
class LLMService {
    constructor() {
        this.llama = null;
        this.model = null;
        this.context = null;
        this.initialized = false;
        this.modelName = null;
        this.modelPath = null;
        this.generating = false;
        
        // Default configuration
        this.config = {
            batchSize: 512,
            contextSize: 4096,
            threads: 4,
        };
    }

    /**
     * Initialize the LLM with the specified model file
     * @param {string} modelPath - Path to the GGUF model file
     * @param {Object} options - Configuration options
     * @param {number} options.contextSize - Context window size (default: 4096)
     * @param {number} options.threads - Number of CPU threads (default: 6)
     * @param {number} options.batchSize - Batch size for inference (default: 512)
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize(modelPath, options = {}) {
        if (this.initialized) {
            this.reset();
        }

        this.validateModelPath(modelPath);
        this.updateConfig(options);

        try {
            const { getLlama } = await import("node-llama-cpp");

            this.llama = await getLlama({ gpu: "auto" });
            this.model = await this.llama.loadModel({
                modelPath,
                gpuLayers: "auto",
            });

            this.context = await this.createContext();
            this.modelName = path.basename(modelPath, ".gguf");
            this.modelPath = modelPath;
            this.initialized = true;

            return true;
        } catch (error) {
            return this.handleInitializationError(error, modelPath);
        }
    }

    /**
     * Validate that the model file exists
     * @private
     */
    validateModelPath(modelPath) {
        if (!modelPath || !fs.existsSync(modelPath)) {
            throw new Error(`Model file not found: ${modelPath}`);
        }
    }

    /**
     * Update configuration with provided options
     * @private
     */
    updateConfig(options) {
        this.config.contextSize = options.contextSize || this.config.contextSize;
        this.config.threads = options.threads || this.config.threads;
        this.config.batchSize = options.batchSize || this.config.batchSize;
    }

    /**
     * Create context with current configuration
     * @private
     */
    async createContext(overrides = {}) {
        const config = { ...this.config, ...overrides };
        return this.model.createContext({
            contextSize: config.contextSize,
            threads: config.threads,
            batchSize: config.batchSize,
            sequences: 1,
        });
    }

    /**
     * Handle initialization errors with fallback strategies
     * @private
     */
    async handleInitializationError(error, modelPath) {
        console.error("Failed to initialize:", error.message);

        if (this.isVramError(error)) {
            return this.tryFallbackBatchSize(modelPath);
        }

        this.cleanup();
        throw error;
    }

    /**
     * Check if error is VRAM-related
     * @private
     */
    isVramError(error) {
        return error.message.includes("VRAM") || error.message.includes("too large");
    }

    /**
     * Attempt initialization with reduced batch size
     * @private
     */
    async tryFallbackBatchSize(modelPath) {
        const fallbackBatch = Math.floor(this.config.batchSize / 2);
        
        if (fallbackBatch < 128) {
            this.cleanup();
            throw new Error("Cannot reduce batch size further");
        }

        try {
            this.context = await this.createContext({ batchSize: fallbackBatch });
            this.config.batchSize = fallbackBatch;
            this.modelName = path.basename(modelPath, ".gguf");
            this.modelPath = modelPath;
            this.initialized = true;
            return true;
        } catch (e) {
            console.error("Fallback failed:", e.message);
            this.cleanup();
            throw e;
        }
    }

    /**
     * Reset service state
     * @private
     */
    reset() {
        this.initialized = false;
        this.cleanup();
    }

    /**
     * Clean up resources
     * @private
     */
    cleanup() {
        this.llama = null;
        this.model = null;
        this.context = null;
        this.initialized = false;
    }

    /**
     * Generate a response from the model
     * @param {Array} messages - Array of message objects with role and content
     * @param {Function} onToken - Callback for streaming tokens
     * @returns {Promise<string>} Generated response text
     */
    async generateResponse(messages, onToken) {
        this.validateInitialized();

        const { LlamaChatSession } = await import("node-llama-cpp");
        const sequence = this.getSequence();

        const systemPrompt = this.extractSystemPrompt(messages);
        const session = new LlamaChatSession({
            contextSequence: sequence,
            systemPrompt,
        });

        this.generating = true;
        const conversationMessages = messages.filter((m) => m.role !== "system");

        try {
            await this.processConversationHistory(session, conversationMessages);
            const response = await this.generateCompletion(session, conversationMessages);

            this.generating = false;

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

    /**
     * Validate that the service is initialized
     * @private
     */
    validateInitialized() {
        if (!this.initialized) {
            throw new Error("No model loaded");
        }
    }

    /**
     * Get or recreate a sequence from the context
     * @private
     */
    getSequence() {
        try {
            return this.context.getSequence();
        } catch (e) {
            this.context = this.recreateContext();
            return this.context.getSequence();
        }
    }

    /**
     * Recreate context with current configuration
     * @private
     */
    async recreateContext() {
        return this.createContext();
    }

    /**
     * Extract system prompt from messages
     * @private
     */
    extractSystemPrompt(messages) {
        return (
            messages.find((m) => m.role === "system")?.content ||
            "You are a helpful AI assistant. Keep answers concise and clear."
        );
    }

    /**
     * Process conversation history before the final message
     * @private
     */
    async processConversationHistory(session, messages) {
        const historyMessages = messages.slice(0, -1);
        for (const message of historyMessages) {
            await session.prompt(message.content, {
                temperature: 0.7,
                maxTokens: 128,
            });
        }
    }

    /**
     * Generate completion for the last message
     * @private
     */
    async generateCompletion(session, messages) {
        const lastMessage = messages[messages.length - 1];
        return session.prompt(lastMessage.content, {
            temperature: 0.7,
            maxTokens: 2048,
        });
    }

    /**
     * Stop ongoing generation
     */
    stopGeneration() {
        this.generating = false;
    }

    /**
     * Get list of available models from the models directory
     * @returns {Array} Array of model objects with name, path, and size
     */
    static getAvailableModels() {
        const modelsDir = this.getModelsDirectory();
        
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

    /**
     * Get the models directory path
     * @private
     */
    static getModelsDirectory() {
        return path.join(app.getPath("userData"), "models");
    }

    /**
     * Get recommended models for download
     * @returns {Array} Array of recommended model metadata
     */
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
