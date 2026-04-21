import { ipcMain, app } from 'electron'
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'apply.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  createTables()
  console.log(`[DB] Initialized at ${dbPath}`)
}

function createTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      platform TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      scraped_at TEXT NOT NULL,
      status TEXT DEFAULT 'new'
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_job_offers_url ON job_offers(url);

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      offer_id INTEGER,
      company TEXT NOT NULL,
      position TEXT NOT NULL,
      platform TEXT NOT NULL,
      status TEXT DEFAULT 'draft',
      applied_at TEXT NOT NULL,
      last_follow_up TEXT,
      cv_path TEXT,
      cover_letter TEXT,
      notes TEXT,
      FOREIGN KEY (offer_id) REFERENCES job_offers(id)
    );

    CREATE TABLE IF NOT EXISTS jules_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jules_task_id TEXT,
      task_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      result TEXT,
      error TEXT,
      started_at TEXT NOT NULL,
      completed_at TEXT,
      duration_ms INTEGER
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)
}

export function getDb(): Database.Database {
  return db
}

export function registerDbHandlers() {
  // --- Job Offers ---
  ipcMain.handle('db:get-offers', (_event, filters?: { platform?: string; location?: string; status?: string }) => {
    try {
      let query = 'SELECT * FROM job_offers WHERE 1=1'
      const params: string[] = []

      if (filters?.platform && filters.platform !== 'all') {
        query += ' AND LOWER(platform) = LOWER(?)'
        params.push(filters.platform)
      }
      if (filters?.location && filters.location !== 'all') {
        query += ' AND LOWER(location) LIKE LOWER(?)'
        params.push(`%${filters.location}%`)
      }
      if (filters?.status && filters.status !== 'all') {
        query += ' AND status = ?'
        params.push(filters.status)
      }

      query += ' ORDER BY scraped_at DESC'
      const stmt = db.prepare(query)
      return stmt.all(...params)
    } catch (err) {
      console.error('[DB] get-offers error:', err)
      return []
    }
  })

  ipcMain.handle('db:save-offer', (_event, offer: {
    title: string; company: string; location: string; platform: string;
    description: string; url: string; scraped_at: string; status: string
  }) => {
    try {
      const existing = db.prepare('SELECT id FROM job_offers WHERE url = ?').get(offer.url)
      if (existing) return { id: (existing as { id: number }).id, inserted: false }

      const stmt = db.prepare(`
        INSERT INTO job_offers (title, company, location, platform, description, url, scraped_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(
        offer.title, offer.company, offer.location, offer.platform,
        offer.description, offer.url, offer.scraped_at, offer.status || 'new'
      )
      return { id: result.lastInsertRowid, inserted: true }
    } catch (err) {
      console.error('[DB] save-offer error:', err)
      throw err
    }
  })

  ipcMain.handle('db:update-offer-status', (_event, id: number, status: string) => {
    try {
      db.prepare('UPDATE job_offers SET status = ? WHERE id = ?').run(status, id)
      return { success: true }
    } catch (err) {
      console.error('[DB] update-offer-status error:', err)
      throw err
    }
  })

  ipcMain.handle('db:delete-offer', (_event, id: number) => {
    try {
      db.prepare('DELETE FROM job_offers WHERE id = ?').run(id)
      return { success: true }
    } catch (err) {
      console.error('[DB] delete-offer error:', err)
      throw err
    }
  })

  // --- Applications ---
  ipcMain.handle('db:get-applications', () => {
    try {
      return db.prepare('SELECT * FROM applications ORDER BY applied_at DESC').all()
    } catch (err) {
      console.error('[DB] get-applications error:', err)
      return []
    }
  })

  ipcMain.handle('db:save-application', (_event, application: {
    offer_id: number; company: string; position: string; platform: string;
    status: string; applied_at: string; last_follow_up: string;
    cv_path: string; cover_letter: string; notes: string
  }) => {
    try {
      const stmt = db.prepare(`
        INSERT INTO applications (offer_id, company, position, platform, status, applied_at, last_follow_up, cv_path, cover_letter, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      const result = stmt.run(
        application.offer_id, application.company, application.position,
        application.platform, application.status || 'draft', application.applied_at,
        application.last_follow_up || '', application.cv_path || '',
        application.cover_letter || '', application.notes || ''
      )
      return { id: result.lastInsertRowid }
    } catch (err) {
      console.error('[DB] save-application error:', err)
      throw err
    }
  })

  ipcMain.handle('db:update-application', (_event, id: number, updates: Record<string, unknown>) => {
    try {
      const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ')
      const values = Object.values(updates)
      db.prepare(`UPDATE applications SET ${fields} WHERE id = ?`).run(...values, id)
      return { success: true }
    } catch (err) {
      console.error('[DB] update-application error:', err)
      throw err
    }
  })

  ipcMain.handle('db:delete-application', (_event, id: number) => {
    try {
      db.prepare('DELETE FROM applications WHERE id = ?').run(id)
      return { success: true }
    } catch (err) {
      console.error('[DB] delete-application error:', err)
      throw err
    }
  })

  // --- Logs ---
  ipcMain.handle('db:get-logs', (_event, limit: number = 100) => {
    try {
      return db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').all(limit)
    } catch (err) {
      console.error('[DB] get-logs error:', err)
      return []
    }
  })

  ipcMain.handle('db:add-log', (_event, level: string, message: string) => {
    try {
      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), level, message
      )
      return { success: true }
    } catch (err) {
      console.error('[DB] add-log error:', err)
      throw err
    }
  })

  // --- Settings ---
  ipcMain.handle('settings:get-api-key', () => {
    try {
      const envKey = process.env.GROQ_API_KEY || process.env.GOOGLE_AI_API_KEY
      if (envKey) return envKey
      const row = db.prepare("SELECT value FROM settings WHERE key = 'api_key'").get() as { value: string } | undefined
      return row?.value || ''
    } catch {
      return ''
    }
  })

  ipcMain.handle('settings:set-api-key', (_event, key: string) => {
    try {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('api_key', ?)").run(key)
      return { success: true }
    } catch (err) {
      console.error('[DB] set-api-key error:', err)
      throw err
    }
  })

  // --- Jules Tasks ---
  ipcMain.handle('jules:get-tasks', (_event, limit: number = 20) => {
    try {
      return db.prepare('SELECT * FROM jules_tasks ORDER BY started_at DESC LIMIT ?').all(limit)
    } catch (err) {
      console.error('[DB] jules:get-tasks error:', err)
      return []
    }
  })

  ipcMain.handle('jules:get-key-status', () => {
    return !!process.env.JULES_API_KEY
  })

  ipcMain.handle('settings:get-profile', () => {
    try {
      const profilePath = getProfilePath()
      if (fs.existsSync(profilePath)) {
        const content = fs.readFileSync(profilePath, 'utf-8')
        return JSON.parse(content)
      }
      return null
    } catch (err) {
      console.error('[DB] get-profile error:', err)
      return null
    }
  })

  ipcMain.handle('settings:save-profile', (_event, profile: Record<string, unknown>) => {
    try {
      const profilePath = getProfilePath()
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2), 'utf-8')
      return { success: true }
    } catch (err) {
      console.error('[DB] save-profile error:', err)
      throw err
    }
  })
}

function getProfilePath(): string {
  const isDev = process.env.NODE_ENV === 'development'
  if (isDev) {
    return path.join(process.cwd(), 'user-profile', 'profile.json')
  }
  return path.join(process.resourcesPath, 'user-profile', 'profile.json')
}
