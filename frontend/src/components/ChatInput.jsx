import { useState, useRef, useEffect } from "react";
import { VscSend, VscAdd, VscClose, VscGlobe, VscFileCode, VscStopCircle } from "react-icons/vsc";

export default function ChatInput({ onSend, onStop, isGenerating, disabled }) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [webSearch, setWebSearch] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [isGenerating]);

  const handleSubmit = () => {
    if (isGenerating) {
      onStop();
      return;
    }
    if (!input.trim() && !attachments.length) return;
    onSend(input, attachments, { webSearch });
    setInput("");
    setAttachments([]);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleAddFile = async () => {
    const file = await window.api.selectFile();
    if (file) setAttachments((prev) => [...prev, file]);
  };

  const getFileIcon = (type) => {
    if (type?.includes("image") || [".png", ".jpg", ".jpeg", ".gif", ".webp"].includes(type)) {
      return <VscFileMedia className="w-4 h-4 text-pink-400" />;
    }
    if (type?.includes("pdf") || type === ".pdf") {
      return <VscFilePdf className="w-4 h-4 text-red-400" />;
    }
    if (type?.includes("docx") || type === ".docx") {
      return <VscFileCode className="w-4 h-4 text-blue-400" />;
    }
    if (type?.includes("csv") || type === ".csv") {
      return <VscFileCode className="w-4 h-4 text-green-400" />;
    }
    return <VscFileCode className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div
      className={`rounded-2xl border transition-all ${
        isFocused
          ? "border-indigo-500/50 bg-gray-800/60 shadow-lg shadow-indigo-500/5"
          : webSearch
            ? "border-green-700/50 bg-gray-800/40"
            : "border-gray-700/50 bg-gray-800/40"
      }`}
    >
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="flex gap-2 px-4 pt-3 pb-0 flex-wrap">
          {attachments.map((file, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-gray-700/60 rounded-lg px-3 py-1.5 text-xs border border-gray-600/30"
            >
              <VscFileCode className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-gray-300 truncate max-w-[150px]">{file.name}</span>
              <button
                onClick={() => setAttachments((prev) => prev.filter((_, j) => j !== i))}
                className="text-gray-500 hover:text-gray-300 ml-1"
              >
                <VscClose className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={disabled ? "Load a model to start..." : "Message..."}
        disabled={disabled}
        rows={1}
        className="w-full bg-transparent border-none px-4 pt-3 pb-3 text-sm text-gray-200 
                   placeholder-gray-500 resize-none focus:outline-none
                   disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ maxHeight: "200px", minHeight: "48px" }}
        onInput={(e) => {
          e.target.style.height = "auto";
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
        }}
      />

      {/* Bottom Bar */}
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-1">
          {/* File Upload */}
          <button
            onClick={handleAddFile}
            className="p-2 text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Attach file"
          >
            <VscAdd className="w-4 h-4" />
          </button>

          {/* Web Search Toggle */}
          <button
            onClick={() => setWebSearch(!webSearch)}
            className={`flex items-center gap-1.5 p-2 rounded-lg text-xs transition-all ${
              webSearch
                ? "bg-green-900/30 text-green-400 border border-green-800/50"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-700/50"
            }`}
            title={webSearch ? "Web search enabled" : "Enable web search"}
          >
            <VscGlobe className="w-4 h-4" />
            {webSearch && <span>Search</span>}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Character Count */}
          {input.length > 0 && <span className="text-[10px] text-gray-600">{input.length}</span>}

          {/* Send/Stop Button */}
          <button
            onClick={handleSubmit}
            disabled={disabled || (!input.trim() && !attachments.length && !isGenerating)}
            className={`p-2 rounded-xl transition-all ${
              isGenerating
                ? "bg-red-600 hover:bg-red-700 text-white animate-pulse"
                : input.trim() || attachments.length > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25"
                  : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isGenerating ? (
              <VscStopCircle className="w-6 h-6 -m-1" />
            ) : (
              <VscSend className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
