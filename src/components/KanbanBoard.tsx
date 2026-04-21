import React, { useState, useRef } from 'react'
import type { Application, ApplicationStatus } from '../store/applyStore'
import { StatusBadge, PlatformBadge } from './StatusBadge'

interface KanbanBoardProps {
  applications: Application[]
  onStatusChange: (id: number, status: ApplicationStatus) => void
  onNotesUpdate: (id: number, notes: string) => void
  onDelete: (id: number) => void
}

const COLUMNS: { id: ApplicationStatus; label: string; color: string; icon: string }[] = [
  { id: 'draft', label: 'Brouillon', color: 'border-dark-600', icon: '📝' },
  { id: 'sent', label: 'Envoyée', color: 'border-blue-500/50', icon: '📤' },
  { id: 'seen', label: 'Vue', color: 'border-purple-500/50', icon: '👁️' },
  { id: 'interview', label: 'Entretien', color: 'border-yellow-500/50', icon: '🎯' },
  { id: 'rejected', label: 'Refusée', color: 'border-red-500/50', icon: '❌' },
  { id: 'accepted', label: 'Acceptée', color: 'border-green-500/50', icon: '✅' }
]

function isOverdue(app: Application): boolean {
  if (app.status !== 'sent') return false
  const daysSince = (Date.now() - new Date(app.applied_at).getTime()) / (1000 * 60 * 60 * 24)
  return daysSince > 7
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

interface KanbanCardProps {
  app: Application
  onStatusChange: (status: ApplicationStatus) => void
  onNotesUpdate: (notes: string) => void
  onDelete: () => void
  onDragStart: (e: React.DragEvent) => void
}

const KanbanCard: React.FC<KanbanCardProps> = ({ app, onStatusChange, onNotesUpdate, onDelete, onDragStart }) => {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(app.notes || '')
  const [showMenu, setShowMenu] = useState(false)
  const overdue = isOverdue(app)

  const handleNotesBlur = () => {
    setEditing(false)
    if (notes !== app.notes) {
      onNotesUpdate(notes)
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        bg-dark-800 border rounded-lg p-3 cursor-grab active:cursor-grabbing
        hover:border-dark-500 transition-all duration-150 select-none
        ${overdue ? 'border-orange-500/50 shadow-lg shadow-orange-900/20' : 'border-dark-700'}
      `}
    >
      {overdue && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-orange-900/30 border border-orange-700/40 rounded-md">
          <svg className="w-3 h-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs text-orange-400 font-medium">+7j sans réponse</span>
        </div>
      )}

      <div className="flex items-start justify-between gap-1 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-dark-100 truncate">{app.company}</p>
          <p className="text-xs text-dark-400 truncate mt-0.5">{app.position}</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-dark-700 text-dark-500 hover:text-dark-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5c-.83 0-1.5-.67-1.5-1.5S11.17 2 12 2s1.5.67 1.5 1.5S12.83 5 12 5zm0 7c-.83 0-1.5-.67-1.5-1.5S11.17 9 12 9s1.5.67 1.5 1.5S12.83 12 12 12zm0 7c-.83 0-1.5-.67-1.5-1.5S11.17 16 12 16s1.5.67 1.5 1.5S12.83 19 12 19z" />
            </svg>
          </button>
          {showMenu && (
            <div className="absolute right-0 top-6 bg-dark-800 border border-dark-600 rounded-lg shadow-xl z-10 py-1 min-w-32">
              {COLUMNS.filter(c => c.id !== app.status).map(col => (
                <button
                  key={col.id}
                  onClick={() => { onStatusChange(col.id); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-dark-300 hover:bg-dark-700 hover:text-dark-100 transition-colors"
                >
                  {col.icon} {col.label}
                </button>
              ))}
              <div className="border-t border-dark-700 mt-1 pt-1">
                <button
                  onClick={() => { onDelete(); setShowMenu(false) }}
                  className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 mb-2">
        <PlatformBadge platform={app.platform} />
      </div>

      <div className="text-xs text-dark-500 mb-2">
        Postulé le {formatDate(app.applied_at)}
      </div>

      {editing ? (
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={handleNotesBlur}
          autoFocus
          placeholder="Notes..."
          className="w-full bg-dark-900 border border-primary-500/50 rounded px-2 py-1.5 text-xs text-dark-200 resize-none focus:outline-none"
          rows={3}
        />
      ) : (
        <div
          onClick={() => setEditing(true)}
          className="text-xs text-dark-500 hover:text-dark-300 cursor-text min-h-[20px] italic transition-colors"
        >
          {notes || 'Ajouter une note...'}
        </div>
      )}
    </div>
  )
}

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  applications, onStatusChange, onNotesUpdate, onDelete
}) => {
  const [draggedId, setDraggedId] = useState<number | null>(null)
  const dragOverColumn = useRef<ApplicationStatus | null>(null)

  const handleDragStart = (e: React.DragEvent, id: number) => {
    setDraggedId(id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, columnId: ApplicationStatus) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverColumn.current = columnId
  }

  const handleDrop = (e: React.DragEvent, columnId: ApplicationStatus) => {
    e.preventDefault()
    if (draggedId !== null) {
      const app = applications.find(a => a.id === draggedId)
      if (app && app.status !== columnId) {
        onStatusChange(draggedId, columnId)
      }
    }
    setDraggedId(null)
    dragOverColumn.current = null
  }

  const getColumnApps = (status: ApplicationStatus) =>
    applications.filter(a => a.status === status)

  return (
    <div className="flex gap-3 h-full overflow-x-auto pb-2">
      {COLUMNS.map(column => {
        const colApps = getColumnApps(column.id)
        return (
          <div
            key={column.id}
            onDragOver={e => handleDragOver(e, column.id)}
            onDrop={e => handleDrop(e, column.id)}
            className={`
              flex flex-col flex-shrink-0 w-56 rounded-xl border bg-dark-900/50
              transition-all duration-150
              ${column.color}
            `}
          >
            {/* Column header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-dark-700/50">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{column.icon}</span>
                <span className="text-xs font-semibold text-dark-200">{column.label}</span>
              </div>
              <span className="px-1.5 py-0.5 bg-dark-700 rounded-full text-xs text-dark-400 font-mono">
                {colApps.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-16">
              {colApps.map(app => (
                <KanbanCard
                  key={app.id}
                  app={app}
                  onStatusChange={status => onStatusChange(app.id, status)}
                  onNotesUpdate={notes => onNotesUpdate(app.id, notes)}
                  onDelete={() => onDelete(app.id)}
                  onDragStart={e => handleDragStart(e, app.id)}
                />
              ))}
              {colApps.length === 0 && (
                <div className="flex items-center justify-center h-20 text-dark-600 text-xs">
                  Déposez ici
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
