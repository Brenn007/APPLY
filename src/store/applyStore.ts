import { useState, useCallback, useEffect } from 'react'

export type View = 'dashboard' | 'offers' | 'applications' | 'settings'

export interface JobOffer {
  id: number
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
  id: number
  offer_id: number
  company: string
  position: string
  platform: string
  status: ApplicationStatus
  applied_at: string
  last_follow_up: string
  cv_path: string
  cover_letter: string
  notes: string
}

export type ApplicationStatus = 'draft' | 'sent' | 'seen' | 'interview' | 'rejected' | 'accepted'

export interface LogEntry {
  id: number
  timestamp: string
  level: string
  message: string
}

export interface ScrapingState {
  isRunning: boolean
  message: string
  progress: number
}

export interface StoreState {
  currentView: View
  offers: JobOffer[]
  selectedOffer: JobOffer | null
  applications: Application[]
  logs: LogEntry[]
  scraping: ScrapingState
  generatedCV: string
  generatedLetter: string
  isGeneratingCV: boolean
  isGeneratingLetter: boolean
  generationError: string
  apiKey: string
  profile: Record<string, unknown> | null
}

// Global store using module-level state + React hooks for reactivity
let state: StoreState = {
  currentView: 'dashboard',
  offers: [],
  selectedOffer: null,
  applications: [],
  logs: [],
  scraping: { isRunning: false, message: '', progress: 0 },
  generatedCV: '',
  generatedLetter: '',
  isGeneratingCV: false,
  isGeneratingLetter: false,
  generationError: '',
  apiKey: '',
  profile: null
}

type Listener = () => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach(l => l())
}

function setState(partial: Partial<StoreState>) {
  state = { ...state, ...partial }
  notify()
}

export function useStore(): [StoreState, typeof actions] {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1)
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }, [])

  return [state, actions]
}

export const actions = {
  setView: (view: View) => setState({ currentView: view }),

  // Offers
  loadOffers: async (filters?: { platform?: string; location?: string; status?: string }) => {
    const offers = await window.electronAPI.getOffers(filters)
    setState({ offers: offers as JobOffer[] })
  },

  selectOffer: (offer: JobOffer | null) => {
    setState({ selectedOffer: offer, generatedCV: '', generatedLetter: '', generationError: '' })
  },

  // Applications
  loadApplications: async () => {
    const applications = await window.electronAPI.getApplications()
    setState({ applications: applications as Application[] })
  },

  updateApplicationStatus: async (id: number, status: ApplicationStatus) => {
    await window.electronAPI.updateApplication(id, { status })
    await actions.loadApplications()
  },

  createApplication: async (offerId: number, company: string, position: string, platform: string) => {
    await window.electronAPI.saveApplication({
      offer_id: offerId,
      company,
      position,
      platform,
      status: 'draft',
      applied_at: new Date().toISOString(),
      last_follow_up: '',
      cv_path: '',
      cover_letter: '',
      notes: ''
    })
    await actions.loadApplications()
  },

  updateApplicationNotes: async (id: number, notes: string) => {
    await window.electronAPI.updateApplication(id, { notes })
    await actions.loadApplications()
  },

  deleteApplication: async (id: number) => {
    await window.electronAPI.deleteApplication(id)
    await actions.loadApplications()
  },

  // Scraping
  startScraping: async () => {
    setState({ scraping: { isRunning: true, message: 'Démarrage...', progress: 0 } })

    const cleanup = window.electronAPI.onScrapingProgress((_event, data) => {
      setState({ scraping: { isRunning: true, message: data.message, progress: data.progress } })
    })

    try {
      const result = await window.electronAPI.startScraping()
      setState({ scraping: { isRunning: false, message: result.message, progress: 100 } })
      await actions.loadOffers()
      await actions.loadLogs()
      return result
    } finally {
      cleanup()
      setTimeout(() => {
        setState({ scraping: { isRunning: false, message: '', progress: 0 } })
      }, 3000)
    }
  },

  // AI Generation
  generateCV: async (offerId: number) => {
    setState({ isGeneratingCV: true, generatedCV: '', generationError: '' })
    const result = await window.electronAPI.generateCV(offerId)
    if (result.success) {
      setState({ isGeneratingCV: false, generatedCV: result.content })
    } else {
      setState({ isGeneratingCV: false, generationError: result.error || 'Erreur inconnue' })
    }
  },

  generateCoverLetter: async (offerId: number) => {
    setState({ isGeneratingLetter: true, generatedLetter: '', generationError: '' })
    const result = await window.electronAPI.generateCoverLetter(offerId)
    if (result.success) {
      setState({ isGeneratingLetter: false, generatedLetter: result.content })
    } else {
      setState({ isGeneratingLetter: false, generationError: result.error || 'Erreur inconnue' })
    }
  },

  clearGeneratedContent: () => {
    setState({ generatedCV: '', generatedLetter: '', generationError: '' })
  },

  // Logs
  loadLogs: async () => {
    const logs = await window.electronAPI.getLogs(50)
    setState({ logs: logs as LogEntry[] })
  },

  // Settings
  loadApiKey: async () => {
    const key = await window.electronAPI.getApiKey()
    setState({ apiKey: key as string })
  },

  saveApiKey: async (key: string) => {
    await window.electronAPI.setApiKey(key)
    setState({ apiKey: key })
  },

  loadProfile: async () => {
    const profile = await window.electronAPI.getProfile()
    setState({ profile: profile as Record<string, unknown> | null })
  },

  saveProfile: async (profile: Record<string, unknown>) => {
    await window.electronAPI.saveProfile(profile)
    setState({ profile })
  }
}
