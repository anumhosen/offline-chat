import { useState, useEffect } from "react";
import {
    VscSettings,
    VscSave,
    VscCheck,
    VscFolderOpened,
    VscChip,
    VscTrash,
    VscAdd,
    VscLoading,
} from "react-icons/vsc";
import { useAppContext } from "@context/AppContext";

export default function SettingsPage() {
    const { modelStatus, checkModelStatus } = useAppContext();
    const [settings, setSettings] = useState({
        temperature: 0.7,
        maxTokens: 4096,
        contextSize: 8192,
        threads: 6,
        batchSize: 512,
        systemPrompt: "",
        autoLoadModel: false,
        lastModelPath: "",
        modelsDirectory: "",
    });
    const [saved, setSaved] = useState(false);
    const [installedModels, setInstalledModels] = useState([]);
    const [loadingModel, setLoadingModel] = useState(false);

    useEffect(() => {
        loadSettings();
        loadModels();
    }, []);

    const loadSettings = async () => {
        try {
            const s = await window.api.getSettings();
            if (s) setSettings((prev) => ({ ...prev, ...s }));
        } catch (e) {}
    };

    const loadModels = async () => {
        try {
            setInstalledModels(await window.api.getModels());
        } catch (e) {}
    };

    const handleSave = async () => {
        await window.api.saveSettings(settings);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const handleSelectModelsDirectory = async () => {
        const result = await window.api.selectModelsDirectory();
        if (result?.path) {
            setSettings((prev) => ({ ...prev, modelsDirectory: result.path }));
            await window.api.saveSettings({ modelsDirectory: result.path });
            loadModels();
        }
    };

    const handleSelectModelFile = async () => {
        const result = await window.api.selectModelFile();
        if (result) {
            setLoadingModel(true);
            const loadResult = await window.api.loadModel(result.path);
            if (loadResult?.success) {
                checkModelStatus();
                setSettings((prev) => ({ ...prev, lastModelPath: result.path }));
            }
            setLoadingModel(false);
            loadModels();
        }
    };

    const handleLoadModel = async (path) => {
        setLoadingModel(true);
        const result = await window.api.loadModel(path);
        if (result?.success) {
            checkModelStatus();
            setSettings((prev) => ({ ...prev, lastModelPath: path }));
        }
        setLoadingModel(false);
    };

    const handleUnloadModel = async () => {
        await window.api.unloadModel();
        checkModelStatus();
    };

    const formatSize = (bytes) => {
        if (!bytes) return "";
        if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
        if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
        return `${(bytes / 1e3).toFixed(0)} KB`;
    };

    return (
        <div className="px-20 lg:px-40 xl:px-80 py-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
                <button
                    onClick={handleSave}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        saved
                            ? "bg-green-800 text-green-200"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white"
                    }`}
                >
                    {saved ? (
                        <>
                            <VscCheck className="w-4 h-4" /> Saved
                        </>
                    ) : (
                        <>
                            <VscSave className="w-4 h-4" /> Save
                        </>
                    )}
                </button>
            </div>

            {/* Quick Presets */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Quick Presets</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() =>
                            setSettings((prev) => ({
                                ...prev,
                                contextSize: 2048,
                                maxTokens: 1024,
                                threads: 4,
                                batchSize: 256,
                                temperature: 0.7,
                            }))
                        }
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 border border-gray-700 transition-colors"
                    >
                        💾 Low VRAM (2K ctx)
                    </button>
                    <button
                        onClick={() =>
                            setSettings((prev) => ({
                                ...prev,
                                contextSize: 8192,
                                maxTokens: 4096,
                                threads: 6,
                                batchSize: 512,
                                temperature: 0.7,
                            }))
                        }
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 border border-gray-700 transition-colors"
                    >
                        ⚡ Balanced (8K ctx)
                    </button>
                    <button
                        onClick={() =>
                            setSettings((prev) => ({
                                ...prev,
                                contextSize: 16384,
                                maxTokens: 8192,
                                threads: 8,
                                batchSize: 1024,
                                temperature: 0.8,
                            }))
                        }
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 border border-gray-700 transition-colors"
                    >
                        🚀 Maximum (16K ctx)
                    </button>
                    <button
                        onClick={() =>
                            setSettings((prev) => ({
                                ...prev,
                                contextSize: 4096,
                                maxTokens: 2048,
                                threads: 4,
                                batchSize: 512,
                                temperature: 1.5,
                            }))
                        }
                        className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 border border-gray-700 transition-colors"
                    >
                        🎨 Creative (High Temp)
                    </button>
                </div>
            </div>

            {/* Models Directory */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Models Directory</h2>
                <div className="flex gap-2 mb-3">
                    <button
                        onClick={handleSelectModelsDirectory}
                        className="flex items-center gap-2 px-4 py-2.5 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800 rounded-lg text-sm transition-colors"
                    >
                        <VscFolderOpened className="w-4 h-4" /> Select Folder
                    </button>
                    <button
                        onClick={() => window.api.openModelsFolder()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                    >
                        <VscFolderOpened className="w-4 h-4" /> Open Folder
                    </button>
                </div>
                {settings.modelsDirectory && (
                    <div className="p-3 bg-gray-800 rounded-lg">
                        <p className="text-xs text-gray-500 mb-0.5">Current location:</p>
                        <p className="text-sm text-gray-300 truncate">{settings.modelsDirectory}</p>
                    </div>
                )}
            </div>

            {/* Model Selection */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-gray-300">Model Selection</h2>
                    <button
                        onClick={handleSelectModelFile}
                        disabled={loadingModel}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800 rounded text-xs transition-colors disabled:opacity-50"
                    >
                        <VscAdd className="w-3.5 h-3.5" /> Browse for Model
                    </button>
                </div>

                {/* Current Model Status */}
                <div
                    className={`p-3 rounded-lg border mb-3 ${
                        modelStatus?.initialized
                            ? "bg-green-900/10 border-green-800"
                            : "bg-gray-800 border-gray-700"
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <VscChip
                                className={`w-4 h-4 ${modelStatus?.initialized ? "text-green-400" : "text-gray-500"}`}
                            />
                            <span
                                className={`text-sm ${modelStatus?.initialized ? "text-green-300" : "text-gray-400"}`}
                            >
                                {modelStatus?.initialized
                                    ? `✓ ${modelStatus.modelName}`
                                    : "No model loaded"}
                            </span>
                        </div>
                        {modelStatus?.initialized && (
                            <button
                                onClick={handleUnloadModel}
                                className="text-xs px-2 py-1 bg-red-900/20 text-red-400 hover:bg-red-900/30 rounded transition-colors"
                            >
                                <VscTrash className="w-3 h-3 inline mr-1" /> Unload
                            </button>
                        )}
                    </div>
                </div>

                {/* Installed Models */}
                {installedModels.length > 0 && (
                    <div>
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                            Installed Models
                        </h3>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                            {installedModels.map((m) => (
                                <div
                                    key={m.path}
                                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
                                        modelStatus?.modelPath === m.path
                                            ? "bg-green-900/10 border-green-800"
                                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <VscChip
                                            className={`w-3.5 h-3.5 flex-shrink-0 ${modelStatus?.modelPath === m.path ? "text-green-400" : "text-gray-500"}`}
                                        />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-300 truncate">
                                                {m.name}
                                            </p>
                                            <p className="text-[10px] text-gray-600">
                                                {formatSize(m.size)}
                                            </p>
                                        </div>
                                    </div>
                                    {modelStatus?.modelPath === m.path ? (
                                        <span className="text-[10px] px-2 py-0.5 bg-green-900/20 text-green-400 rounded">
                                            Active
                                        </span>
                                    ) : (
                                        <button
                                            onClick={() => handleLoadModel(m.path)}
                                            className="text-[10px] px-2 py-0.5 bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30 rounded transition-colors"
                                        >
                                            Load
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Generation Parameters */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">Generation Parameters</h2>

                <div className="space-y-5">
                    {/* Temperature */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs text-gray-400">Temperature</label>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-gray-300 bg-gray-800 px-2 py-0.5 rounded">
                                    {settings.temperature?.toFixed(1)}
                                </span>
                            </div>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.05"
                            value={settings.temperature || 0.7}
                            onChange={(e) =>
                                setSettings((prev) => ({
                                    ...prev,
                                    temperature: parseFloat(e.target.value),
                                }))
                            }
                            className="w-full accent-indigo-500 h-2 rounded-lg appearance-none bg-gray-700 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                            <span>
                                0.0
                                <br />
                                Precise
                            </span>
                            <span>
                                0.5
                                <br />
                                Focused
                            </span>
                            <span>
                                1.0
                                <br />
                                Balanced
                            </span>
                            <span>
                                1.5
                                <br />
                                Creative
                            </span>
                            <span>
                                2.0
                                <br />
                                Random
                            </span>
                        </div>
                    </div>

                    {/* Grid of inputs */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Context Size */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5">
                                Context Size
                            </label>
                            <select
                                value={settings.contextSize || 8192}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        contextSize: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="1024">1,024</option>
                                <option value="2048">2,048</option>
                                <option value="4096">4,096</option>
                                <option value="8192">8,192</option>
                                <option value="16384">16,384</option>
                                <option value="32768">32,768</option>
                            </select>
                        </div>

                        {/* Max Tokens */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5">Max Tokens</label>
                            <select
                                value={settings.maxTokens || 4096}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        maxTokens: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="256">256</option>
                                <option value="512">512</option>
                                <option value="1024">1,024</option>
                                <option value="2048">2,048</option>
                                <option value="4096">4,096</option>
                                <option value="8192">8,192</option>
                                <option value="16384">16,384</option>
                            </select>
                        </div>

                        {/* CPU Threads */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5">
                                CPU Threads
                            </label>
                            <select
                                value={settings.threads || 6}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        threads: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="2">2</option>
                                <option value="4">4</option>
                                <option value="6">6</option>
                                <option value="8">8</option>
                                <option value="10">10</option>
                                <option value="12">12</option>
                            </select>
                        </div>

                        {/* Batch Size - NEW */}
                        <div>
                            <label className="block text-xs text-gray-400 mb-1.5">Batch Size</label>
                            <select
                                value={settings.batchSize || 512}
                                onChange={(e) =>
                                    setSettings((prev) => ({
                                        ...prev,
                                        batchSize: parseInt(e.target.value),
                                    }))
                                }
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                            >
                                <option value="128">128</option>
                                <option value="256">256</option>
                                <option value="512">512</option>
                                <option value="1024">1,024</option>
                                <option value="2048">2,048</option>
                            </select>
                            <p className="text-[10px] text-gray-600 mt-1">
                                Higher = faster but more VRAM
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* System Prompt */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5 mb-4">
                <h2 className="text-sm font-semibold text-gray-300 mb-4">System Prompt</h2>
                <textarea
                    value={settings.systemPrompt || ""}
                    onChange={(e) =>
                        setSettings((prev) => ({ ...prev, systemPrompt: e.target.value }))
                    }
                    placeholder="Custom system prompt (leave empty for default)..."
                    rows={4}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
                <p className="text-[10px] text-gray-600 mt-1.5">
                    Defines the AI's behavior and personality. Leave empty for default.
                </p>
            </div>

            {/* Auto-load */}
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-5">
                <label className="flex items-center justify-between cursor-pointer">
                    <div>
                        <p className="text-sm text-gray-300">Auto-load last model on startup</p>
                        <p className="text-xs text-gray-500">
                            Automatically load the previously used model
                        </p>
                    </div>
                    <input
                        type="checkbox"
                        checked={settings.autoLoadModel || false}
                        onChange={(e) =>
                            setSettings((prev) => ({ ...prev, autoLoadModel: e.target.checked }))
                        }
                        className="w-9 h-5 bg-gray-700 rounded-full appearance-none cursor-pointer relative
                       checked:bg-indigo-600 after:content-[''] after:absolute after:top-0.5 after:left-0.5
                       after:bg-white after:w-4 after:h-4 after:rounded-full after:transition-transform
                       checked:after:translate-x-4"
                    />
                </label>
            </div>
        </div>
    );
}
