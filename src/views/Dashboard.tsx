import React, { useEffect } from 'react'
import { useStore, actions } from '../store/applyStore'

const StatCard: React.FC<{ label: string; value: number | string; icon: React.ReactNode; color: string; sub?: string }> = ({
  label, value, icon, color, sub
}) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-dark-100 font-mono">{value}</p>
      <p className="text-xs text-dark-400 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-dark-600 mt-0.5">{sub}</p>}
    </div>
  </div>
)

export const Dashboard: React.FC = () => {
  const [state] = useStore()

  useEffect(() => {
    actions.loadOffers()
    actions.loadApplications()
    actions.loadLogs()
  }, [])

  const totalOffers = state.offers.length
  const newOffers = state.offers.filter(o => o.status === 'new').length
  const totalApps = state.applications.length
  const sentApps = state.applications.filter(a => a.status === 'sent').length
  const interviews = state.applications.filter(a => a.status === 'interview').length
  const accepted = state.applications.filter(a => a.status === 'accepted').length

  const overdueApps = state.applications.filter(a => {
    if (a.status !== 'sent') return false
    const daysSince = (Date.now() - new Date(a.applied_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 7
  })

  const platforms = [...new Set(state.offers.map(o => o.platform))]

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-dark-100">Tableau de bord</h1>
          <p className="text-sm text-dark-500 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-900/20 border border-green-700/30 rounded-full">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-xs text-green-400 font-medium">APPLY actif</span>
        </div>
      </div>

      {/* Overdue alert */}
      {overdueApps.length > 0 && (
        <div className="flex items-start gap-3 p-4 bg-orange-900/20 border border-orange-700/40 rounded-xl animate-fade-in">
          <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-orange-300">
              {overdueApps.length} candidature{overdueApps.length > 1 ? 's' : ''} sans réponse depuis +7 jours
            </p>
            <p className="text-xs text-orange-400/70 mt-0.5">{overdueApps.map(a => a.company).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Offres scrapées" value={totalOffers} sub={`${newOffers} nouvelles`}
          color="bg-primary-900/30 border border-primary-700/30"
          icon={<svg className="w-6 h-6 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
        <StatCard
          label="Candidatures" value={totalApps} sub={`${sentApps} envoyées`}
          color="bg-blue-900/30 border border-blue-700/30"
          icon={<svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard
          label="Entretiens" value={interviews}
          color="bg-yellow-900/30 border border-yellow-700/30"
          icon={<svg className="w-6 h-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
        <StatCard
          label="Offres acceptées" value={accepted}
          color="bg-green-900/30 border border-green-700/30"
          icon={<svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
      </div>

      {/* Platforms */}
      {platforms.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-200 mb-3">Plateformes scrapées</h3>
          <div className="space-y-2">
            {platforms.map(platform => {
              const count = state.offers.filter(o => o.platform === platform).length
              const pct = totalOffers > 0 ? Math.round((count / totalOffers) * 100) : 0
              return (
                <div key={platform} className="flex items-center gap-3">
                  <span className="text-xs text-dark-300 w-20 truncate">{platform}</span>
                  <div className="flex-1 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className="h-full bg-primary-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-dark-500 w-8 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-200 mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => actions.setView('offers')}
            className="flex items-center gap-2 p-3 bg-dark-900/50 hover:bg-dark-700 border border-dark-700 hover:border-dark-500 rounded-lg transition-all text-left"
          >
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="text-xs font-medium text-dark-200">Voir les offres</span>
          </button>
          <button
            onClick={() => actions.setView('applications')}
            className="flex items-center gap-2 p-3 bg-dark-900/50 hover:bg-dark-700 border border-dark-700 hover:border-dark-500 rounded-lg transition-all text-left"
          >
            <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-xs font-medium text-dark-200">Suivi Kanban</span>
          </button>
        </div>
      </div>

      {/* Recent logs */}
      {state.logs.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-200 mb-3">Journal d'activité</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {state.logs.slice(0, 10).map(log => (
              <div key={log.id} className="flex items-start gap-2 text-xs">
                <span className={`flex-shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full ${log.level === 'error' ? 'bg-red-400' : log.level === 'warn' ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
                <span className="text-dark-500 flex-shrink-0 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
                <span className="text-dark-300">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
