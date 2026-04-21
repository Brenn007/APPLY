import React, { useEffect, useState } from 'react'
import { useStore, actions } from '../store/applyStore'

interface JulesTask {
  id: number
  jules_task_id: string | null
  task_type: string
  payload: string
  status: string
  result: string | null
  error: string | null
  started_at: string
  completed_at: string | null
  duration_ms: number | null
}

const TASK_LABELS: Record<string, string> = {
  'scrape-job-offers': 'Scraping offres',
  'tailor-cv': 'Adaptation CV',
  'generate-cover-letter': 'Lettre de motivation'
}

const TASK_ICONS: Record<string, string> = {
  'scrape-job-offers': '🔍',
  'tailor-cv': '📄',
  'generate-cover-letter': '✉️'
}

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
  const [julesTasks, setJulesTasks] = useState<JulesTask[]>([])
  const [julesConnected, setJulesConnected] = useState<boolean | null>(null)

  useEffect(() => {
    actions.loadOffers()
    actions.loadApplications()
    actions.loadLogs()
    loadJulesData()
  }, [])

  const loadJulesData = async () => {
    const [tasks, connected] = await Promise.all([
      window.electronAPI.getJulesTasks(10),
      window.electronAPI.getJulesKeyStatus()
    ])
    setJulesTasks(tasks as JulesTask[])
    setJulesConnected(connected as boolean)
  }

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

  // Jules stats
  const tasksToday = julesTasks.filter(t => {
    const today = new Date().toDateString()
    return new Date(t.started_at).toDateString() === today
  }).length
  const DAILY_LIMIT = 15
  const tasksLeft = Math.max(0, DAILY_LIMIT - tasksToday)
  const currentTask = julesTasks.find(t => t.status === 'running')

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

      {/* ─── Jules Status Card ─── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {/* Google "G" logo approximation */}
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-dark-100">Statut de l'agent Jules</h3>
              <p className="text-xs text-dark-500">jules.google.com — Moteur d'exécution autonome</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            julesConnected === null
              ? 'bg-dark-700 text-dark-400 border-dark-600'
              : julesConnected
                ? 'bg-green-900/30 text-green-400 border-green-700/40'
                : 'bg-orange-900/30 text-orange-400 border-orange-700/40'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              julesConnected === null ? 'bg-dark-400' : julesConnected ? 'bg-green-400 animate-pulse' : 'bg-orange-400'
            }`}></div>
            {julesConnected === null ? 'Vérification...' : julesConnected ? 'Connecté' : 'Mode local'}
          </div>
        </div>

        {/* Current task */}
        {currentTask ? (
          <div className="flex items-center gap-3 p-3 bg-primary-900/20 border border-primary-700/30 rounded-lg">
            <div className="w-5 h-5 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin flex-shrink-0"></div>
            <div>
              <p className="text-xs font-medium text-primary-300">
                {TASK_ICONS[currentTask.task_type] ?? '⚙️'} {TASK_LABELS[currentTask.task_type] ?? currentTask.task_type} en cours...
              </p>
              <p className="text-xs text-dark-500 mt-0.5">
                Démarrée {new Date(currentTask.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-dark-900/50 border border-dark-700 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-dark-500 flex-shrink-0"></div>
            <p className="text-xs text-dark-500">Aucune tâche en cours — Jules est disponible</p>
          </div>
        )}

        {/* Daily quota */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-dark-400">Tâches aujourd'hui</span>
            <span className="text-xs font-mono text-dark-300">{tasksToday} / {DAILY_LIMIT}</span>
          </div>
          <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                tasksLeft <= 3 ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, (tasksToday / DAILY_LIMIT) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-dark-600 mt-1">
            {tasksLeft > 0 ? `${tasksLeft} tâche${tasksLeft > 1 ? 's' : ''} restante${tasksLeft > 1 ? 's' : ''} aujourd'hui` : 'Quota journalier atteint'}
          </p>
        </div>

        {/* Task history */}
        {julesTasks.length > 0 && (
          <div>
            <p className="text-xs font-medium text-dark-400 uppercase tracking-wide mb-2">Dernières tâches exécutées</p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {julesTasks.map(task => (
                <div key={task.id} className="flex items-center gap-2.5 p-2 bg-dark-900/50 rounded-lg">
                  <span className="text-sm flex-shrink-0">{TASK_ICONS[task.task_type] ?? '⚙️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-dark-200 truncate">
                      {TASK_LABELS[task.task_type] ?? task.task_type}
                    </p>
                    <p className="text-xs text-dark-600">
                      {new Date(task.started_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      {' · '}
                      {new Date(task.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      {task.duration_ms && ` · ${(task.duration_ms / 1000).toFixed(1)}s`}
                    </p>
                  </div>
                  <span className={`text-xs font-medium flex-shrink-0 ${
                    task.status === 'success' ? 'text-green-400' :
                    task.status === 'failed' ? 'text-red-400' :
                    task.status === 'running' ? 'text-primary-400' :
                    'text-dark-500'
                  }`}>
                    {task.status === 'success' ? '✓' : task.status === 'failed' ? '✗' : task.status === 'running' ? '↻' : '○'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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
