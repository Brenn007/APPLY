import React, { useEffect } from 'react'
import { useStore, actions } from '../store/applyStore'
import type { ApplicationStatus } from '../store/applyStore'
import { KanbanBoard } from '../components/KanbanBoard'

export const ApplicationsView: React.FC = () => {
  const [state] = useStore()

  useEffect(() => {
    actions.loadApplications()
  }, [])

  const totalOverdue = state.applications.filter(a => {
    if (a.status !== 'sent') return false
    const days = (Date.now() - new Date(a.applied_at).getTime()) / (1000 * 60 * 60 * 24)
    return days > 7
  }).length

  const stats = {
    total: state.applications.length,
    sent: state.applications.filter(a => a.status === 'sent').length,
    interview: state.applications.filter(a => a.status === 'interview').length,
    accepted: state.applications.filter(a => a.status === 'accepted').length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-dark-200">Suivi des candidatures</h2>
          <span className="text-xs text-dark-500">{stats.total} candidature{stats.total !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-dark-500">
          {totalOverdue > 0 && (
            <span className="flex items-center gap-1.5 text-orange-400 bg-orange-900/20 px-2 py-1 rounded-full border border-orange-700/30">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {totalOverdue} relance{totalOverdue > 1 ? 's' : ''} requise{totalOverdue > 1 ? 's' : ''}
            </span>
          )}
          <span>{stats.sent} envoyée{stats.sent !== 1 ? 's' : ''}</span>
          <span className="text-yellow-400">{stats.interview} entretien{stats.interview !== 1 ? 's' : ''}</span>
          <span className="text-green-400">{stats.accepted} acceptée{stats.accepted !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Kanban board */}
      <div className="flex-1 overflow-hidden p-4">
        {state.applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center">
              <svg className="w-10 h-10 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-dark-200">Aucune candidature</p>
              <p className="text-sm text-dark-500 mt-1">Sélectionnez une offre et cliquez sur "Créer une candidature"</p>
            </div>
            <button
              onClick={() => actions.setView('offers')}
              className="btn-primary"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Voir les offres
            </button>
          </div>
        ) : (
          <KanbanBoard
            applications={state.applications}
            onStatusChange={(id, status) => actions.updateApplicationStatus(id, status as ApplicationStatus)}
            onNotesUpdate={(id, notes) => actions.updateApplicationNotes(id, notes)}
            onDelete={(id) => actions.deleteApplication(id)}
          />
        )}
      </div>
    </div>
  )
}
