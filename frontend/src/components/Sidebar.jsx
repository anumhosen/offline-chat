import { VscComment, VscTrash, VscAdd, VscClose, VscSearch } from "react-icons/vsc";
import { useState } from "react";

export default function Sidebar({
  chats,
  currentChat,
  onSelectChat,
  onDeleteChat,
  onNewChat,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filteredChats = chats.filter((c) => c.title?.toLowerCase().includes(search.toLowerCase()));

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      onDeleteChat(id);
      setConfirmDelete(null);
    } else setConfirmDelete(id);
  };

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;
    if (diff < 86400000) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <aside className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="flex h-10 items-center justify-between p-3 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-300">Chats</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onNewChat}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors"
            title="New chat"
          >
            <VscAdd className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded transition-colors md:hidden"
          >
            <VscClose className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-2 border-b border-gray-800">
        <div className="relative">
          <VscSearch className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search chats..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredChats.map((chat) => (
          <div
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer text-sm transition-colors ${currentChat?.id === chat.id ? "bg-indigo-900/30 border border-indigo-800" : "hover:bg-gray-800 border border-transparent"}`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <VscComment className="m-1 w-4 h-4 text-gray-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-gray-300 truncate text-xs">{chat.title || "New Chat"}</p>
                <p className="text-[10px] text-gray-600">{formatDate(chat.updated_at)}</p>
              </div>
            </div>
            <button
              onClick={(e) => handleDelete(e, chat.id)}
              className={`p-1 rounded transition-all ${confirmDelete === chat.id ? "text-red-400 bg-red-900/20" : "text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400"}`}
            >
              <VscTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
        {filteredChats.length === 0 && (
          <p className="text-xs text-gray-600 text-center py-4">No chats found</p>
        )}
      </div>

      <div className="p-2 border-t border-gray-800 text-[10px] text-gray-600 text-center">
        {chats.length} chat{chats.length !== 1 ? "s" : ""}
      </div>
    </aside>
  );
}
