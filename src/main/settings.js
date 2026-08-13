const Database = require('better-sqlite3');

function initSettingsDatabase() {
  const db = new Database(':memory:', { verbose: console.log });
  
  // Enable WAL mode
  db.pragma('journal_mode = WAL');
  
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
