import { contextBridge, ipcRenderer } from 'electron'

// Typed API surface exposed to the renderer process
// The renderer NEVER has direct access to Node.js or Electron APIs

export interface JobOffer {
  id?: number
  title: string
  company: string
  location: string
  platform: string
  description: string
  url: string
  scraped_at: string
  status: string
}

export interface Application {
  id?: number
  offer_id: number
  company: string
  position: string
  platform: string
  status: string
  applied_at: string
  last_follow_up: string
  cv_path: string
  cover_letter: string
  notes: string
}

export interface LogEntry {
  id?: number
  timestamp: string
  level: string
  message: string
}

export interface ScrapeResult {
  success: boolean
  count: number
  newOffers: number
  message: string
}

export interface GenerateResult {
  success: boolean
  content: string
  filePath?: string
  error?: string
}

const electronAPI = {
  // --- DB: Job Offers ---
  getOffers: (filters?: { platform?: string; location?: string; status?: string }) =>
    ipcRenderer.invoke('db:get-offers', filters),
  saveOffer: (offer: Omit<JobOffer, 'id'>) =>
    ipcRenderer.invoke('db:save-offer', offer),
  updateOfferStatus: (id: number, status: string) =>
    ipcRenderer.invoke('db:update-offer-status', id, status),
  deleteOffer: (id: number) =>
    ipcRenderer.invoke('db:delete-offer', id),

  // --- DB: Applications ---
  getApplications: () =>
    ipcRenderer.invoke('db:get-applications'),
  saveApplication: (app: Omit<Application, 'id'>) =>
    ipcRenderer.invoke('db:save-application', app),
  updateApplication: (id: number, updates: Partial<Application>) =>
    ipcRenderer.invoke('db:update-application', id, updates),
  deleteApplication: (id: number) =>
    ipcRenderer.invoke('db:delete-application', id),

  // --- DB: Logs ---
  getLogs: (limit?: number) =>
    ipcRenderer.invoke('db:get-logs', limit),
  addLog: (level: string, message: string) =>
    ipcRenderer.invoke('db:add-log', level, message),

  // --- Scraping ---
  startScraping: () =>
    ipcRenderer.invoke('scrape:start'),
  getScrapeStatus: () =>
    ipcRenderer.invoke('scrape:status'),

  // --- AI Agent ---
  generateCV: (offerId: number) =>
    ipcRenderer.invoke('agent:generate-cv', offerId),
  generateCoverLetter: (offerId: number) =>
    ipcRenderer.invoke('agent:generate-cover-letter', offerId),
  saveOutput: (filename: string, content: string) =>
    ipcRenderer.invoke('agent:save-output', filename, content),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('agent:read-file', filePath),

  // --- Settings ---
  getApiKey: () =>
    ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (key: string) =>
    ipcRenderer.invoke('settings:set-api-key', key),
  getProfile: () =>
    ipcRenderer.invoke('settings:get-profile'),
  saveProfile: (profile: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:save-profile', profile),
  getCvBase: () =>
    ipcRenderer.invoke('settings:get-cv-base'),
  saveCvBase: (content: string) =>
    ipcRenderer.invoke('settings:save-cv-base', content),
  exportPdf: (content: string, filename: string) =>
    ipcRenderer.invoke('agent:export-pdf', content, filename),

  // --- System ---
  notify: (title: string, body: string) =>
    ipcRenderer.invoke('notify', title, body),
  windowMinimize: () =>
    ipcRenderer.invoke('window:minimize'),
  windowMaximize: () =>
    ipcRenderer.invoke('window:maximize'),
  windowClose: () =>
    ipcRenderer.invoke('window:close'),

  // --- Event listeners ---
  onTrayStartScraping: (callback: () => void) => {
    ipcRenderer.on('tray:start-scraping', callback)
    return () => ipcRenderer.removeListener('tray:start-scraping', callback)
  },
  onScrapingProgress: (callback: (event: Electron.IpcRendererEvent, data: { message: string; progress: number }) => void) => {
    ipcRenderer.on('scraping:progress', callback)
    return () => ipcRenderer.removeListener('scraping:progress', callback)
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)

export type ElectronAPI = typeof electronAPI
