const Database = require("better-sqlite3");
const db = new Database("nitw_portal.db");

// Create tables if they don't exist
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        logged_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        subject TEXT,
        attended INTEGER,
        total INTEGER,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gpa (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT,
        cgpa REAL,
        saved_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

module.exports = db;