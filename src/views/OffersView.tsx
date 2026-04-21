import React, { useEffect, useState } from 'react'
import { useStore, actions } from '../store/applyStore'
import { OfferList } from '../components/OfferList'
import { CvPreview } from '../components/CvPreview'
import { CoverLetterPreview } from '../components/CoverLetterPreview'
import { PlatformBadge, StatusBadge } from '../components/StatusBadge'

type ActivePanel = 'cv' | 'letter'

export const OffersView: React.FC = () => {
  const [state] = useStore()
  const [activePanel, setActivePanel] = useState<ActivePanel>('cv')
  const [isLoading, setIsLoading] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<string>('')

  useEffect(() => {
    actions.loadOffers()
  }, [])

  const handleScrape = async () => {
    setScrapeResult('')
    const result = await actions.startScraping()
    if (result) {
      setScrapeResult(result.message)
    }
  }

  const handleSelectOffer = async (offer: typeof state.offers[0]) => {
    actions.selectOffer(offer)
    // Mark as viewed
    if (offer.status === 'new') {
      await window.electronAPI.updateOfferStatus(offer.id, 'viewed')
      await actions.loadOffers()
    }
  }

  const handleCreateApplication = async () => {
    if (!state.selectedOffer) return
    await actions.createApplication(
      state.selectedOffer.id,
      state.selectedOffer.company,
      state.selectedOffer.title,
      state.selectedOffer.platform
    )
    actions.setView('applications')
  }

  const { selectedOffer, scraping, isGeneratingCV, isGeneratingLetter, generatedCV, generatedLetter, generationError } = state

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-dark-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold text-dark-200">Offres d'emploi</h2>
          <span className="text-xs text-dark-500">{state.offers.length} offre{state.offers.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {scrapeResult && !scraping.isRunning && (
            <span className="text-xs text-green-400 animate-fade-in">{scrapeResult}</span>
          )}
          <button
            onClick={handleScrape}
            disabled={scraping.isRunning}
            className="btn-primary"
          >
            {scraping.isRunning ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Scraping...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Lancer le scraping
              </>
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {scraping.isRunning && (
        <div className="px-4 py-2 bg-dark-900/80 border-b border-dark-800 flex-shrink-0 animate-fade-in">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-dark-400">{scraping.message}</span>
            <span className="text-xs text-dark-500 font-mono">{scraping.progress}%</span>
          </div>
          <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-300"
              style={{ width: `${scraping.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: offer list */}
        <div className="w-72 flex-shrink-0 border-r border-dark-800 p-4 overflow-hidden flex flex-col">
          <OfferList
            offers={state.offers}
            selectedOffer={state.selectedOffer}
            onSelect={handleSelectOffer}
            isLoading={isLoading}
          />
        </div>

        {/* Center: offer detail */}
        <div className="w-80 flex-shrink-0 border-r border-dark-800 p-4 overflow-y-auto">
          {selectedOffer ? (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold text-dark-100 mb-1">{selectedOffer.title}</h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-primary-400">{selectedOffer.company}</span>
                  <StatusBadge status={selectedOffer.status} />
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <PlatformBadge platform={selectedOffer.platform} />
                <span className="flex items-center gap-1 text-xs text-dark-400">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {selectedOffer.location}
                </span>
              </div>

              <div className="divider" />

              <div>
                <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide mb-2">Description du poste</h3>
                <div className="text-sm text-dark-300 leading-relaxed whitespace-pre-line bg-dark-900/50 rounded-lg p-3 border border-dark-700">
                  {selectedOffer.description}
                </div>
              </div>

              <div>
                <a
                  href={selectedOffer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-ghost text-xs w-full justify-center"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Voir l'offre originale
                </a>
              </div>

              <div className="divider" />

              {/* Actions */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wide">Actions IA</h3>
                <button
                  onClick={() => { setActivePanel('cv'); actions.generateCV(selectedOffer.id) }}
                  disabled={isGeneratingCV}
                  className="btn-primary w-full justify-center"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Adapter le CV
                </button>
                <button
                  onClick={() => { setActivePanel('letter'); actions.generateCoverLetter(selectedOffer.id) }}
                  disabled={isGeneratingLetter}
                  className="btn-secondary w-full justify-center"
                  style={isGeneratingLetter ? {} : { borderColor: '#7c3aed40', color: '#a78bfa' }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Générer la lettre
                </button>
                <button
                  onClick={handleCreateApplication}
                  className="btn-ghost text-xs w-full justify-center border border-dark-700"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Créer une candidature
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-dark-300">Aucune offre sélectionnée</p>
                <p className="text-xs text-dark-500 mt-1">Cliquez sur une offre pour voir les détails</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: AI panels */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          {/* Panel tabs */}
          <div className="flex gap-1 mb-4 p-1 bg-dark-900 rounded-lg border border-dark-700 w-fit">
            <button
              onClick={() => setActivePanel('cv')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activePanel === 'cv' ? 'bg-primary-600 text-white shadow' : 'text-dark-400 hover:text-dark-200'}`}
            >
              CV Adapté
            </button>
            <button
              onClick={() => setActivePanel('letter')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activePanel === 'letter' ? 'bg-purple-600 text-white shadow' : 'text-dark-400 hover:text-dark-200'}`}
            >
              Lettre de motivation
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {activePanel === 'cv' ? (
              <CvPreview
                content={generatedCV}
                isGenerating={isGeneratingCV}
                error={generationError}
                onGenerate={() => selectedOffer && actions.generateCV(selectedOffer.id)}
                offerSelected={!!selectedOffer}
              />
            ) : (
              <CoverLetterPreview
                content={generatedLetter}
                isGenerating={isGeneratingLetter}
                error={generationError}
                onGenerate={() => selectedOffer && actions.generateCoverLetter(selectedOffer.id)}
                offerSelected={!!selectedOffer}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
