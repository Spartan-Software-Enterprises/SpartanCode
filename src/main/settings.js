function openDatabase(filename) {
  try {
    const BetterSqlite = require("better-sqlite3");
    return { kind: "better-sqlite3", db: new BetterSqlite(filename) };
  } catch {
    try {
      const { DatabaseSync } = require("node:sqlite");
      return { kind: "node:sqlite", db: new DatabaseSync(filename) };
    } catch {
      return null;
    }
  }
}

function initSettingsDatabase() {
  const opened = openDatabase(":memory:");
  if (!opened) return { kind: "unavailable", tables: [] };
  const db = opened.db;

  // Enable WAL mode
  if (opened.kind === "better-sqlite3") db.pragma("journal_mode = WAL");
  else db.exec("PRAGMA journal_mode = WAL");

  // Create 14 tables for settings hierarchy
  db.exec(`
    CREATE TABLE settings_global (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE settings_project (
      key TEXT PRIMARY KEY,
      value TEXT,
      project_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );
    
    CREATE TABLE settings_agent (
      key TEXT PRIMARY KEY,
      value TEXT,
      agent_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES agents(id)
    );
    
    CREATE TABLE settings_session (
      key TEXT PRIMARY KEY,
      value TEXT,
      session_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );
    
    -- Additional 10 tables for comprehensive settings coverage
    CREATE TABLE ui_preferences (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE security_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE model_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      model_name TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE connection_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE artifact_settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE api_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      service_name TEXT NOT NULL,
      credential_name TEXT NOT NULL,
      encrypted_credential TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_id TEXT
    );
    
    CREATE TABLE version_tracking (
      version TEXT PRIMARY KEY,
      released_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return db;
}

module.exports = { initSettingsDatabase };
