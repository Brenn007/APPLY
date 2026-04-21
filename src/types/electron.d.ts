// Type declarations for the Electron API exposed via contextBridge

interface ScrapeResult {
  success: boolean
  count: number
  newOffers: number
  message: string
}

interface GenerateResult {
  success: boolean
  content: string
  filePath?: string
  error?: string
}

interface ElectronAPI {
  // DB: Job Offers
  getOffers: (filters?: { platform?: string; location?: string; status?: string }) => Promise<unknown[]>
  saveOffer: (offer: Record<string, unknown>) => Promise<{ id: number; inserted: boolean }>
  updateOfferStatus: (id: number, status: string) => Promise<{ success: boolean }>
  deleteOffer: (id: number) => Promise<{ success: boolean }>

  // DB: Applications
  getApplications: () => Promise<unknown[]>
  saveApplication: (app: Record<string, unknown>) => Promise<{ id: number }>
  updateApplication: (id: number, updates: Record<string, unknown>) => Promise<{ success: boolean }>
  deleteApplication: (id: number) => Promise<{ success: boolean }>

  // DB: Logs
  getLogs: (limit?: number) => Promise<unknown[]>
  addLog: (level: string, message: string) => Promise<{ success: boolean }>

  // Jules
  getJulesTasks: (limit?: number) => Promise<unknown[]>
  getJulesKeyStatus: () => Promise<boolean>

  // Scraping
  startScraping: () => Promise<ScrapeResult>
  getScrapeStatus: () => Promise<{ isScraping: boolean }>

  // AI Agent
  generateCV: (offerId: number) => Promise<GenerateResult>
  generateCoverLetter: (offerId: number) => Promise<GenerateResult>
  saveOutput: (filename: string, content: string) => Promise<{ success: boolean; filePath: string }>
  readFile: (filePath: string) => Promise<{ success: boolean; content: string; error?: string }>

  // Settings
  getApiKey: () => Promise<string>
  setApiKey: (key: string) => Promise<{ success: boolean }>
  getProfile: () => Promise<Record<string, unknown> | null>
  saveProfile: (profile: Record<string, unknown>) => Promise<{ success: boolean }>
  getCvBase: () => Promise<{ success: boolean; content: string; error?: string }>
  saveCvBase: (content: string) => Promise<{ success: boolean; error?: string }>
  exportPdf: (content: string, filename: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

  // System
  notify: (title: string, body: string) => Promise<void>
  windowMinimize: () => Promise<void>
  windowMaximize: () => Promise<void>
  windowClose: () => Promise<void>

  // Event listeners
  onTrayStartScraping: (callback: () => void) => () => void
  onScrapingProgress: (callback: (event: Electron.IpcRendererEvent, data: { message: string; progress: number }) => void) => () => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
