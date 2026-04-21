import React, { useEffect } from 'react'
import { useStore, actions } from './store/applyStore'
import type { View } from './store/applyStore'
import { Dashboard } from './views/Dashboard'
import { OffersView } from './views/OffersView'
import { ApplicationsView } from './views/ApplicationsView'
import { SettingsView } from './views/SettingsView'

const NAV_ITEMS: { id: View; label: string; icon: React.ReactNode }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 13a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1h-4a1 1 0 01-1-1v-5z" />
      </svg>
    )
  },
  {
    id: 'offers',
    label: 'Offres',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    )
  },
  {
    id: 'applications',
    label: 'Candidatures',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    )
  },
  {
    id: 'settings',
    label: 'Paramètres',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
]

const TitleBar: React.FC = () => {
  const handleMinimize = () => window.electronAPI?.windowMinimize()
  const handleMaximize = () => window.electronAPI?.windowMaximize()
  const handleClose = () => window.electronAPI?.windowClose()

  return (
    <div
      className="flex items-center justify-between h-9 px-3 bg-dark-950 border-b border-dark-800 flex-shrink-0 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-xs font-bold leading-none">A</span>
        </div>
        <span className="text-xs font-semibold text-dark-300">APPLY</span>
      </div>
      <div
        className="flex items-center gap-1"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={handleMinimize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-dark-700 text-dark-500 hover:text-dark-200 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-dark-500 hover:text-white transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const [state] = useStore()

  // Listen for tray scraping trigger
  useEffect(() => {
    if (!window.electronAPI) return
    const cleanup = window.electronAPI.onTrayStartScraping(() => {
      actions.setView('offers')
      actions.startScraping()
    })
    return cleanup
  }, [])

  const renderView = () => {
    switch (state.currentView) {
      case 'dashboard': return <Dashboard />
      case 'offers': return <OffersView />
      case 'applications': return <ApplicationsView />
      case 'settings': return <SettingsView />
    }
  }

  const pendingApps = state.applications.filter(a => a.status === 'interview').length

  return (
    <div className="flex flex-col h-screen bg-dark-950 overflow-hidden">
      <TitleBar />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 flex-shrink-0 bg-dark-900 border-r border-dark-800 flex flex-col py-4">
          {/* Logo */}
          <div className="px-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-900/40">
                <span className="text-white font-bold text-base">A</span>
              </div>
              <div>
                <p className="text-sm font-bold text-dark-100">APPLY</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2 space-y-0.5">
            {NAV_ITEMS.map(item => {
              const isActive = state.currentView === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => actions.setView(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-primary-600/20 text-primary-300 border border-primary-500/20'
                      : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                    }
                  `}
                >
                  <span className={isActive ? 'text-primary-400' : ''}>{item.icon}</span>
                  <span>{item.label}</span>
                  {item.id === 'applications' && pendingApps > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full">
                      {pendingApps}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>

          {/* Bottom status */}
          <div className="px-3 mt-4">
            <div className="p-3 bg-dark-800 rounded-lg border border-dark-700">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-xs font-medium text-dark-300">Agent actif</span>
              </div>
              <div className="text-xs text-dark-500 space-y-0.5">
                <p>{state.offers.length} offres</p>
                <p>{state.applications.length} candidatures</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {renderView()}
        </main>
      </div>
    </div>
  )
}
