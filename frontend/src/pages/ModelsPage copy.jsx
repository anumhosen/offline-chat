import { useState, useEffect, useCallback, useRef } from "react";
import { VscFolderOpened, VscSearch, VscFilter, VscRefresh } from "react-icons/vsc";
import { useAppContext } from "@context/AppContext";
import ModelCard from "@components/ModelCard";
import {
  RECOMMENDED_MODELS,
  MODEL_FAMILIES,
  MODEL_TYPES,
  MODEL_SIZES,
  filterModels,
} from "../data/models";

export default function ModelsPage() {
  const { modelStatus, checkModelStatus } = useAppContext();
  const [installedModels, setInstalledModels] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [sizeFilter, setSizeFilter] = useState("all");
  const [starFilter, setStarFilter] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(null);
  const [downloadError, setDownloadError] = useState(null);
  const [modelsDirectory, setModelsDirectory] = useState("");
  const [downloadingFile, setDownloadingFile] = useState(null);

  // Use ref to track the cleanup function
  const cleanupRef = useRef(null);

  useEffect(() => {
    loadModels();
    loadModelsDirectory();

    // Set up progress listener
    //console.log('Setting up download progress listener...');
    cleanupRef.current = window.api.onDownloadProgress((data) => {
      //console.log('Progress received:', data);
      setDownloadProgress(data);
    });

    return () => {
      // Cleanup listener on unmount
      if (cleanupRef.current) {
        //console.log('Cleaning up download progress listener');
        cleanupRef.current();
      }
    };
  }, []);

  // Listen for download progress
  useEffect(() => {
    const cleanup = window.api.onDownloadProgress((data) => {
      setDownloadProgress(data);
    });
    return cleanup;
  }, []);

  const loadModels = async () => {
    try {
      setInstalledModels(await window.api.getModels());
    } catch (e) {}
  };

  const loadModelsDirectory = async () => {
    try {
      const dir = await window.api.getModelsDirectory();
      setModelsDirectory(dir || "");
    } catch (e) {}
  };

  const handleDownload = useCallback(async (model) => {
    if (!model) {
      // Cancel download
      setDownloadProgress(null);
      setDownloadError(null);
      setDownloadingFile(null);
      return;
    }

    //console.log('Starting download for:', model.name);
    setDownloadError(null);
    setDownloadProgress({ filename: model.name, progress: 0, downloaded: 0, total: 0, speed: 0 });
    setDownloadingFile(model.name);

    try {
      const result = await window.api.downloadModel({
        url: model.url,
        filename: model.name + ".gguf",
      });

      //console.log('Download result:', result);

      if (result?.success) {
        // Refresh installed models after a delay
        setTimeout(async () => {
          await loadModels();
          setDownloadProgress(null);
          setDownloadingFile(null);
        }, 1500);
      }
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadError(error.message || "Download failed");
      setDownloadProgress(null);
      setDownloadingFile(null);
    }
  }, []);

  const handleLoadModel = async (model) => {
    const installed = installedModels.find((m) => m.name === model.name);
    if (!installed) return;

    setLoading(true);
    const result = await window.api.loadModel(installed.path);
    if (result?.success) checkModelStatus();
    setLoading(false);
  };

  const handleChangeDirectory = async () => {
    const result = await window.api.changeModelsDirectory();
    if (result?.path) {
      setModelsDirectory(result.path);
      loadModels();
    }
  };

  const handleOpenFolder = () => {
    window.api.openModelsFolder();
    setTimeout(loadModels, 1500);
  };

  const filteredModels = filterModels(RECOMMENDED_MODELS, {
    search,
    type: typeFilter,
    family: familyFilter,
    size: sizeFilter,
    stars: starFilter,
  });

  const isInstalled = (name) => installedModels.some((m) => m.name === name);
  const isLoaded = (name) => modelStatus?.modelName === name;

  return (
    <div className="max-w-6xl mx-auto p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Models</h1>
          <p className="text-xs text-gray-500 mt-1">{RECOMMENDED_MODELS.length} models available</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadModels}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-800 rounded transition-colors"
            title="Refresh"
          >
            <VscRefresh className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm transition-colors"
          >
            <VscFolderOpened className="w-4 h-4" />
            Open Folder
          </button>
        </div>
      </div>

      {/* Current Directory */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <VscFolderOpened className="w-4 h-4 text-yellow-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Models Directory</p>
              <p className="text-sm text-gray-300 truncate">
                {modelsDirectory || "Default directory"}
              </p>
            </div>
          </div>
          <button
            onClick={handleChangeDirectory}
            className="text-xs px-3 py-1.5 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-800 rounded transition-colors flex-shrink-0 ml-2"
          >
            Change
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <VscSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by name, description, or family..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              showFilters
                ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
            }`}
          >
            <VscFilter className="w-3.5 h-3.5" />
            Filters
            {typeFilter !== "all" ||
            familyFilter !== "all" ||
            sizeFilter !== "all" ||
            starFilter > 0 ? (
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center">
                !
              </span>
            ) : null}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-3 pt-3 border-t border-gray-800">
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Type
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...MODEL_TYPES].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 text-[11px] rounded capitalize transition-colors ${
                      typeFilter === t
                        ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Family
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...MODEL_FAMILIES].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFamilyFilter(f)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      familyFilter === f
                        ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Parameters
              </label>
              <div className="flex flex-wrap gap-1.5">
                {["all", ...MODEL_SIZES].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSizeFilter(s)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      sizeFilter === s
                        ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5 block">
                Minimum Rating
              </label>
              <div className="flex gap-1.5">
                {[0, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStarFilter(s)}
                    className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
                      starFilter === s
                        ? "bg-indigo-900/30 text-indigo-300 border border-indigo-700"
                        : "bg-gray-800 text-gray-400 hover:text-gray-200 border border-gray-700"
                    }`}
                  >
                    {s === 0 ? "All" : `${"★".repeat(s)}${"☆".repeat(5 - s)}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(typeFilter !== "all" ||
              familyFilter !== "all" ||
              sizeFilter !== "all" ||
              starFilter > 0) && (
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setFamilyFilter("all");
                  setSizeFilter("all");
                  setStarFilter(0);
                  setSearch("");
                }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Installed Models */}
      {installedModels.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-300 mb-2">
            Installed Models ({installedModels.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {installedModels.map((m) => {
              const model = RECOMMENDED_MODELS.find((rm) => rm.name === m.name) || {
                name: m.name,
                type: "unknown",
                family: "Unknown",
                parameters: "?",
                size: formatSize(m.size),
                contextSize: "?",
                quantization: "?",
                description: "",
                stars: 0,
              };
              return (
                <ModelCard
                  key={m.path}
                  model={model}
                  isInstalled={true}
                  isLoaded={isLoaded(m.name)}
                  onLoad={() => handleLoadModel(model)}
                  onDownload={() => {}}
                  downloadProgress={null}
                  downloadError={null}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Model Grid */}
      <h2 className="text-sm font-semibold text-gray-300 mb-2">
        Available Models ({filteredModels.length})
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {filteredModels.map((model) => (
          <ModelCard
            key={model.name}
            model={model}
            isInstalled={isInstalled(model.name)}
            isLoaded={isLoaded(model.name)}
            onLoad={handleLoadModel}
            onDownload={handleDownload}
            downloadProgress={downloadProgress?.filename === model.name ? downloadProgress : null}
            downloadError={downloadProgress?.filename === model.name ? downloadError : null}
          />
        ))}
      </div>

      {/* No Results */}
      {filteredModels.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <VscSearch className="w-12 h-12 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500">No models match your filters</p>
            <button
              onClick={() => {
                setSearch("");
                setTypeFilter("all");
                setFamilyFilter("all");
                setSizeFilter("all");
                setStarFilter(0);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 mt-2"
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {/* Count */}
      <div className="text-center py-6 text-[10px] text-gray-600">
        Showing {filteredModels.length} of {RECOMMENDED_MODELS.length} models
        {installedModels.length > 0 && ` • ${installedModels.length} installed`}
      </div>
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return "";
  if (bytes > 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes > 1e6) return `${(bytes / 1e6).toFixed(0)} MB`;
  return `${bytes} B`;
}
