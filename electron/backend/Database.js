const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

/**
 * AppDatabase - SQLite database wrapper for chat application
 */
class AppDatabase {
  constructor(dbPath) {
    const defaultPath = path.join(app.getPath('userData'), 'offlinechat.db');
    this.db = new Database(dbPath || defaultPath);
    this.configureDatabase();
    this.initSchema();
  }

  /**
   * Configure database pragmas
   * @private
   */
  configureDatabase() {
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  /**
   * Initialize database schema
   * @private
   */
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        title TEXT DEFAULT 'New Chat',
        model TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        attachments TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  /**
   * Create a new chat
   * @param {string} id - Chat ID
   * @param {string} title - Chat title
   * @param {string} model - Model name
   */
  createChat(id, title, model) {
    this.db.prepare('INSERT INTO chats (id, title, model) VALUES (?, ?, ?)').run(id, title, model);
  }

  /**
   * Get all chats
   * @returns {Array} Array of chat records
   */
  getChats() {
    return this.db.prepare('SELECT * FROM chats ORDER BY updated_at DESC').all();
  }

  /**
   * Get a single chat by ID
   * @param {string} id - Chat ID
   * @returns {Object|null} Chat record or null
   */
  getChat(id) {
    return this.db.prepare('SELECT * FROM chats WHERE id = ?').get(id);
  }

  /**
   * Delete a chat by ID
   * @param {string} id - Chat ID
   */
  deleteChat(id) {
    this.db.prepare('DELETE FROM chats WHERE id = ?').run(id);
  }

  /**
   * Update chat title
   * @param {string} id - Chat ID
   * @param {string} title - New title
   */
  updateChatTitle(id, title) {
    this.db
      .prepare("UPDATE chats SET title = ?, updated_at = datetime('now') WHERE id = ?")
      .run(title, id);
  }

  /**
   * Add a message to a chat
   * @param {string} id - Message ID
   * @param {string} chatId - Chat ID
   * @param {string} role - Message role (user/assistant/system)
   * @param {string} content - Message content
   * @param {Array|null} attachments - Optional attachments
   */
  addMessage(id, chatId, role, content, attachments = null) {
    const attachmentsStr = this.serializeAttachments(attachments);

    this.db
      .prepare(
        'INSERT INTO messages (id, chat_id, role, content, attachments) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, chatId, role, content, attachmentsStr);

    this.db.prepare("UPDATE chats SET updated_at = datetime('now') WHERE id = ?").run(chatId);
  }

  /**
   * Serialize attachments to JSON string
   * @private
   */
  serializeAttachments(attachments) {
    if (!attachments) return null;
    return typeof attachments === 'string' ? attachments : JSON.stringify(attachments);
  }

  /**
   * Get all messages for a chat
   * @param {string} chatId - Chat ID
   * @returns {Array} Array of message records with parsed attachments
   */
  getMessages(chatId) {
    const messages = this.db
      .prepare('SELECT * FROM messages WHERE chat_id = ? ORDER BY created_at ASC')
      .all(chatId);

    return messages.map((msg) => ({
      ...msg,
      attachments: this.parseAttachments(msg.attachments),
    }));
  }

  /**
   * Parse attachments from JSON string
   * @private
   */
  parseAttachments(attachmentsStr) {
    if (!attachmentsStr || typeof attachmentsStr !== 'string') {
      return [];
    }
    try {
      return JSON.parse(attachmentsStr);
    } catch {
      return [];
    }
  }

  /**
   * Get a setting by key
   * @param {string} key - Setting key
   * @returns {*} Setting value or null
   */
  getSetting(key) {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? JSON.parse(row.value) : null;
  }

  /**
   * Set a setting value
   * @param {string} key - Setting key
   * @param {*} value - Setting value
   */
  setSetting(key, value) {
    this.db
      .prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')
      .run(key, JSON.stringify(value));
  }

  /**
   * Close the database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = AppDatabase;
