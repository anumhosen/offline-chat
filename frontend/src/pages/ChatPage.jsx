import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAppContext } from "@context/AppContext";
import ChatMessage from "@components/ChatMessage";
import ChatInput from "@components/ChatInput";
import Sidebar from "@components/Sidebar";
import ModelSelector from "@components/ModelSelector";
import { VscAdd, VscSparkle, VscChip, VscRobot, VscArrowDown } from "react-icons/vsc";
import { LuPanelLeftOpen } from "react-icons/lu";

export default function ChatPage() {
    const { currentChat, setCurrentChat, chats, setChats, modelStatus, checkModelStatus } =
        useAppContext();
    const [messages, setMessages] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [streamingContent, setStreamingContent] = useState("");
    const [showSidebar, setShowSidebar] = useState(false);
    const [showScrollButton, setShowScrollButton] = useState(false);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const abortRef = useRef(false);

    useEffect(() => {
        if (currentChat) loadMessages(currentChat.id);
    }, [currentChat?.id]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, streamingContent]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const isNearBottom =
                container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            setShowScrollButton(!isNearBottom);
        };

        container.addEventListener("scroll", handleScroll);
        return () => container.removeEventListener("scroll", handleScroll);
    }, []);

    const loadMessages = async (chatId) => {
        try {
            const msgs = await window.api.getMessages(chatId);
            setMessages(msgs || []);
        } catch (e) {
            console.error("Failed to load messages:", e);
        }
    };

    const scrollToBottom = (smooth = true) => {
        messagesEndRef.current?.scrollIntoView({
            behavior: smooth ? "smooth" : "auto",
        });
    };

    const handleSend = async (content, attachments, options = {}) => {
        if (!modelStatus?.initialized) {
            alert("Please load a model first.");
            return;
        }

        let chat = currentChat;
        if (!chat) {
            chat = {
                id: uuidv4(),
                title: content.slice(0, 50),
                model: modelStatus?.modelName,
            };
            await window.api.createChat(chat.id, chat.title, chat.model);
            setCurrentChat(chat);
            setChats((prev) => [chat, ...prev]);
        }

        const userMsg = {
            id: uuidv4(),
            chat_id: chat.id,
            role: "user",
            content,
            attachments: attachments || [],
            created_at: new Date().toISOString(),
        };

        await window.api.addMessage(userMsg.id, chat.id, "user", content, attachments);
        setMessages((prev) => [...prev, userMsg]);

        // RAG Context
        let ragContext = "";
        if (attachments?.length > 0) {
            for (const file of attachments) {
                if (file.path) {
                    try {
                        const result = await window.api.processFile(file.path);
                        if (result?.text) {
                            ragContext += `\n\n[File: ${file.name}]\n${result.text.slice(0, 2000)}\n`;
                        }
                    } catch (e) {}
                }
            }
        }

        // Web Search
        let searchContext = "";
        if (options.webSearch && content.trim()) {
            setIsGenerating(true);
            setStreamingContent("");
            try {
                const result = await window.api.searchContext(content);
                if (result?.context) searchContext = result.context;
            } catch (e) {}
        }

        const combinedContext = [ragContext, searchContext].filter(Boolean).join("\n");

        const llmMessages = [
            ...(combinedContext
                ? [
                      {
                          role: "system",
                          content: `You have context to help answer. Use it if relevant.\n\n${combinedContext}`,
                      },
                  ]
                : []),
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content },
        ];

        setIsGenerating(true);
        setStreamingContent("");
        abortRef.current = false;

        try {
            const response = await window.api.sendMessage(llmMessages);

            if (response) {
                const assistantMsg = {
                    id: uuidv4(),
                    chat_id: chat.id,
                    role: "assistant",
                    content: response,
                    created_at: new Date().toISOString(),
                };
                await window.api.addMessage(assistantMsg.id, chat.id, "assistant", response);
                setMessages((prev) => [...prev, assistantMsg]);
            }

            if (messages.length === 0 && content.trim()) {
                const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
                await window.api.updateChatTitle(chat.id, title);
            }
        } catch (error) {
            console.error("Chat error:", error);
        } finally {
            setIsGenerating(false);
            setStreamingContent("");
        }
    };

    const handleStopGeneration = () => {
        abortRef.current = true;
        setIsGenerating(false);
        window.api.stopGeneration();
    };

    const handleNewChat = () => {
        setCurrentChat(null);
        setMessages([]);
        setShowSidebar(false);
    };

    const handleSelectChat = (chat) => {
        setCurrentChat(chat);
        setShowSidebar(false);
    };

    const handleDeleteChat = async (id) => {
        await window.api.deleteChat(id);
        if (currentChat?.id === id) {
            setCurrentChat(null);
            setMessages([]);
        }
        setChats((prev) => prev.filter((c) => c.id !== id));
    };

    return (
        <div className="flex h-full bg-gray-950">
            {/* Sidebar Overlay */}
            {showSidebar && (
                <div className="fixed top-8 inset-0 z-40 flex">
                    <div className="w-72 flex-shrink-0 h-full bg-gray-900 border-r border-gray-800 shadow-2xl">
                        <Sidebar
                            chats={chats}
                            currentChat={currentChat}
                            onSelectChat={handleSelectChat}
                            onDeleteChat={handleDeleteChat}
                            onNewChat={handleNewChat}
                            onClose={() => setShowSidebar(false)}
                        />
                    </div>
                    <div
                        className="flex-1 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowSidebar(false)}
                    />
                </div>
            )}

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col w-full">
                {/* Top Navigation Bar */}
                <header className="flex items-center justify-between px-4 h-10 flex-shrink-0 bg-gray-950/80 backdrop-blur-sm border-b border-gray-800/50">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowSidebar(true)}
                            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                        >
                            <LuPanelLeftOpen className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleNewChat}
                            className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded-lg transition-colors"
                        >
                            <VscAdd className="w-4 h-4" />
                        </button>
                        <div className="text-sm text-gray-400 font-medium truncate w-full">
                            {currentChat?.title || "New Chat"}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {modelStatus?.initialized && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-900/20 border border-green-800/50 rounded-full">
                                <VscChip className="w-3 h-3 text-green-400" />
                                <span className="text-[10px] text-green-400 font-medium truncate max-w-[100px]">
                                    {modelStatus.modelName}
                                </span>
                            </div>
                        )}
                        <ModelSelector />
                    </div>
                </header>

                {/* Messages Area */}
                <div ref={messagesContainerRef} className="flex-1 overflow-y-auto scroll-smooth">
                    {messages.length === 0 && !isGenerating ? (
                        /* Welcome Screen */
                        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                            <div className="w-16 h-16 rounded-2xl bg-indigo-900/30 border border-indigo-800/50 flex items-center justify-center mb-6">
                                <VscSparkle className="w-8 h-8 text-indigo-400" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-200 mb-3">
                                {modelStatus?.initialized
                                    ? "What can I help with?"
                                    : "Offline AI Chat"}
                            </h1>
                            <p className="text-gray-500 text-sm text-center max-w-md mb-8">
                                {modelStatus?.initialized
                                    ? "Ask me anything. I can search the web, analyze files, and help with code."
                                    : "Load a model from Settings to start chatting offline."}
                            </p>

                            {/* Suggestion Cards */}
                            {modelStatus?.initialized && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                                    {[
                                        { icon: "💻", text: "Write a Python script to..." },
                                        { icon: "📊", text: "Explain the concept of..." },
                                        { icon: "🔍", text: "What are the best practices for..." },
                                        { icon: "📝", text: "Summarize this text: ..." },
                                    ].map((suggestion, i) => (
                                        <button
                                            key={i}
                                            onClick={() =>
                                                handleSend(
                                                    suggestion.text.replace("...", ""),
                                                    [],
                                                    {},
                                                )
                                            }
                                            className="flex items-center gap-3 p-3.5 bg-gray-900 border border-gray-800 rounded-xl 
                                 hover:border-gray-700 hover:bg-gray-800/50 transition-all text-left group"
                                        >
                                            <span className="text-lg flex-shrink-0">
                                                {suggestion.icon}
                                            </span>
                                            <span className="text-xs text-gray-400 group-hover:text-gray-300 line-clamp-2">
                                                {suggestion.text}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Messages */
                        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
                            {messages.map((msg) => (
                                <ChatMessage key={msg.id} message={msg} />
                            ))}

                            {isGenerating && streamingContent && (
                                <ChatMessage
                                    message={{ role: "assistant", content: streamingContent }}
                                    isStreaming
                                />
                            )}

                            {isGenerating && !streamingContent && (
                                <div className="flex items-center gap-3 px-4">
                                    <div className="w-7 h-7 rounded-full bg-indigo-900/30 border border-indigo-800/50 flex items-center justify-center">
                                        <VscRobot className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="flex gap-1">
                                        <div
                                            className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        />
                                        <div
                                            className="w-2 h-2 bg-indigo-400/60 rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Scroll to Bottom Button */}
                {showScrollButton && (
                    <button
                        onClick={() => scrollToBottom()}
                        className="absolute bottom-24 right-8 w-9 h-9 bg-gray-800 border border-gray-700 rounded-full 
                       flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors z-10"
                    >
                        <VscArrowDown className="w-4 h-4 text-gray-300" />
                    </button>
                )}

                {/* Input Area */}
                <div className="flex-shrink-0 max-w-3xl mx-auto w-full px-4 pb-4">
                    <ChatInput
                        onSend={handleSend}
                        onStop={handleStopGeneration}
                        isGenerating={isGenerating}
                        disabled={!modelStatus?.initialized}
                    />
                </div>
            </div>
        </div>
    );
}
