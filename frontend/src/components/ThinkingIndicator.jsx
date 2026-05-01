export default function ThinkingIndicator() {
    return (
        <div className="flex items-center gap-3 px-4">
            <div className="w-7 h-7 rounded-full bg-indigo-900/30 border border-indigo-800/50 flex items-center justify-center">
                <div className="flex gap-0.5">
                    <div
                        className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <div
                        className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <div
                        className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
            </div>
            <span className="text-xs text-gray-500">Thinking...</span>
        </div>
    );
}
