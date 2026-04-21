import React from 'react'
import type { JobOffer } from '../store/applyStore'
import { PlatformBadge, StatusBadge } from './StatusBadge'

interface OfferCardProps {
  offer: JobOffer
  isSelected: boolean
  onClick: () => void
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffMins < 60) return `il y a ${diffMins}min`
  if (diffHours < 24) return `il y a ${diffHours}h`
  if (diffDays === 1) return 'hier'
  if (diffDays < 7) return `il y a ${diffDays}j`
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export const OfferCard: React.FC<OfferCardProps> = ({ offer, isSelected, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`
        p-4 rounded-xl border cursor-pointer transition-all duration-150 animate-fade-in
        ${isSelected
          ? 'bg-primary-900/20 border-primary-500/60 shadow-lg shadow-primary-900/20'
          : 'bg-dark-800 border-dark-700 hover:border-dark-500 hover:bg-dark-750'
        }
      `}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-dark-100 truncate">{offer.title}</h3>
          <p className="text-xs text-dark-400 mt-0.5">{offer.company}</p>
        </div>
        <StatusBadge status={offer.status} size="sm" />
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-2">
        <PlatformBadge platform={offer.platform} />
        <span className="flex items-center gap-1 text-xs text-dark-400">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {offer.location}
        </span>
        <span className="ml-auto text-xs text-dark-500">{timeAgo(offer.scraped_at)}</span>
      </div>
    </div>
  )
}
