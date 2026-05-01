import { VscAccount, VscRobot, VscCopy, VscCheck } from "react-icons/vsc";
import { useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

export default function ChatMessage({ message, isStreaming }) {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === "user";

    // Parse attachments safely
    let attachments = [];
    if (message.attachments) {
        if (typeof message.attachments === "string") {
            try {
                attachments = JSON.parse(message.attachments);
            } catch {}
        } else if (Array.isArray(message.attachments)) {
            attachments = message.attachments;
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {}
    };

    return (
        <div className={`flex gap-4 ${isUser ? "justify-end" : "justify-start"} group`}>
            {/* Bot Avatar */}
            {/* {!isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border border-indigo-800/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <VscRobot className="w-4 h-4 text-indigo-300" />
                </div>
            )} */}

            {/* Message Bubble */}
            <div className={`${isUser ? "order-first" : ""}`}>
                {/* Attachments */}
                {attachments.length > 0 && (
                    <div className="flex gap-1.5 mb-2 flex-wrap">
                        {attachments.map((file, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-1 px-2.5 py-1 bg-gray-800/80 rounded-full text-xs text-gray-300 border border-gray-700/50"
                            >
                                <span>📎</span>
                                <span className="truncate max-w-[120px]">
                                    {typeof file === "string"
                                        ? file.split("/").pop()
                                        : file?.name || "File"}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Message Card */}
                {isUser ? (
                    <div className="bg-gray-800/60 rounded-2xl rounded-br-md px-4 py-2.5 border border-gray-700/30">
                        <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {message.content}
                        </p>
                    </div>
                ) : (
                    <div className="rounded-2xl rounded-bl-md px-4 py-2.5">
                        <div className="text-sm text-gray-300 leading-relaxed">
                            <MarkdownRenderer content={message.content || ""} />
                        </div>

                        {/* Copy Button */}
                        <div className="flex items-center justify-between mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 rounded transition-colors"
                            >
                                {copied ? (
                                    <>
                                        <VscCheck className="w-3 h-3 text-green-400" /> Copied
                                    </>
                                ) : (
                                    <>
                                        <VscCopy className="w-3 h-3" /> Copy
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Timestamp */}
                {message.created_at && (
                    <p className="text-[10px] text-gray-600 mt-1 px-1">
                        {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </p>
                )}
            </div>

            {/* User Avatar */}
            {/* {isUser && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <VscAccount className="w-4 h-4 text-gray-400" />
                </div>
            )} */}
        </div>
    );
}
