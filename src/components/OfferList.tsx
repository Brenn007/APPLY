import React, { useState, useEffect } from 'react'
import type { JobOffer } from '../store/applyStore'
import { OfferCard } from './OfferCard'

interface OfferListProps {
  offers: JobOffer[]
  selectedOffer: JobOffer | null
  onSelect: (offer: JobOffer) => void
  isLoading: boolean
}

const STATUSES = ['all', 'new', 'viewed', 'applied']

export const OfferList: React.FC<OfferListProps> = ({ offers, selectedOffer, onSelect, isLoading }) => {
  const [search, setSearch] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const platforms = ['all', ...Array.from(new Set(offers.map(o => o.platform))).sort()]

  const filtered = offers.filter(offer => {
    const matchSearch = !search ||
      offer.title.toLowerCase().includes(search.toLowerCase()) ||
      offer.company.toLowerCase().includes(search.toLowerCase()) ||
      offer.location.toLowerCase().includes(search.toLowerCase())

    const matchPlatform = platformFilter === 'all' ||
      offer.platform.toLowerCase() === platformFilter.toLowerCase()

    const matchStatus = statusFilter === 'all' || offer.status === statusFilter

    return matchSearch && matchPlatform && matchStatus
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-xl border border-dark-700 bg-dark-800 animate-pulse">
            <div className="h-4 bg-dark-700 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-dark-700 rounded w-1/2 mb-3"></div>
            <div className="flex gap-2">
              <div className="h-5 bg-dark-700 rounded-full w-16"></div>
              <div className="h-5 bg-dark-700 rounded-full w-20"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="space-y-2 mb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rechercher une offre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={platformFilter}
            onChange={e => setPlatformFilter(e.target.value)}
            className="input flex-1 text-xs"
          >
            {platforms.map(p => (
              <option key={p} value={p}>{p === 'all' ? 'Toutes les plateformes' : p}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input flex-1 text-xs"
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'Tous les statuts' : s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-dark-500">
          {filtered.length} offre{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== offers.length && ` (sur ${offers.length})`}
        </span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm text-dark-400">Aucune offre trouvée</p>
            <p className="text-xs text-dark-600 mt-1">Lancez le scraping pour découvrir des offres</p>
          </div>
        ) : (
          filtered.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isSelected={selectedOffer?.id === offer.id}
              onClick={() => onSelect(offer)}
            />
          ))
        )}
      </div>
    </div>
  )
}
