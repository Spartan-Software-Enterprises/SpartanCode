const Database = require("better-sqlite3");

function createArtifactStore() {
  const db = new Database(":memory:", { verbose: console.log });

  // Enable WAL mode
  db.pragma("journal_mode = WAL");

  // 14 tables for artifact store
  db.exec(`
    CREATE TABLE artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE TABLE artifact_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      version INTEGER DEFAULT 1,
      content TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      key TEXT NOT NULL,
      value TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      tag TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      user_id TEXT,
      permission TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_access_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      user_id TEXT,
      action TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_qf (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      artifact_id INTEGER,
      qf_level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (artifact_id) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_fts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      content_rowid INTEGER,
      FOREIGN KEY (content_rowid) REFERENCES artifacts(id)
    );
    
    CREATE TABLE artifact_fts_content(rows UNINDEXED);
    
    CREATE TABLE artifact_fts_index(idx UNINDEXED);
    
    CREATE TABLE artifact_fts_prefix(idx UNINDEXED);
    
    CREATE TABLE artifact_fts_prefixsearch(idx UNINDEXED);
    
    CREATE TABLE artifact_fts_phrases(idx UNINDEXED);
    
    CREATE TABLE artifact_fts_snippet(idx UNINDEXED);
  `);

  // Create FTS5 virtual table
  db.exec(`
    CREATE VIRTUAL TABLE artifact_fts USING fts5(content, content_rowid UNINDEXED);
  `);

  // Trigger to sync FTS
  db.exec(`
    CREATE TRIGGER artifact_ai AFTER INSERT ON artifacts BEGIN
      INSERT INTO artifact_fts(content) VALUES (new.content);
    END;
  `);

  db.exec(`
    CREATE TRIGGER artifact_ad AFTER DELETE ON artifacts BEGIN
      INSERT INTO artifact_fts(content, content_rowid) VALUES ('delete', rowid);
    END;
  `);

  return db;
}

module.exports = { createArtifactStore };
