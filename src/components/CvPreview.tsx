import React, { useState } from 'react'

interface CvPreviewProps {
  content: string
  isGenerating: boolean
  error: string
  onGenerate: () => void
  offerSelected: boolean
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-dark-200 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-dark-100 mt-5 mb-2 border-b border-dark-700 pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-primary-400 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-dark-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-dark-300">$1</em>')
    .replace(/`(.+?)`/g, '<code class="bg-dark-900 text-primary-300 px-1 rounded text-xs font-mono">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="text-dark-300 text-sm ml-4 list-disc">$1</li>')
    .replace(/^---$/gm, '<hr class="border-dark-700 my-3">')
    .replace(/\n\n/g, '</p><p class="text-dark-300 text-sm mb-2">')
    .replace(/^(?!<[hpli])(.+)$/gm, '<p class="text-dark-300 text-sm mb-1">$1</p>')
}

export const CvPreview: React.FC<CvPreviewProps> = ({
  content, isGenerating, error, onGenerate, offerSelected
}) => {
  const [copied, setCopied] = useState(false)
  const [exporting, setExporting] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleExportPdf = async () => {
    setExporting(true)
    const filename = `cv-${Date.now()}.pdf`
    const result = await window.electronAPI.exportPdf(content, filename)
    setExporting(false)
    if (result.success) {
      window.electronAPI.notify('CV exporté', `PDF enregistré avec succès`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-900/40 border border-primary-700/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dark-100">CV Adapté</h3>
            <p className="text-xs text-dark-500">Personnalisé par l'IA pour l'offre</p>
          </div>
        </div>
        {content && (
          <div className="flex gap-2">
            <button onClick={handleCopy} className="btn-ghost text-xs">
              {copied ? (
                <><svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copié</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg> Copier</>
              )}
            </button>
            <button onClick={handleExportPdf} disabled={exporting} className="btn-ghost text-xs">
              {exporting ? (
                <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg> Export...</>
              ) : (
                <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> Exporter PDF</>
              )}
            </button>
          </div>
        )}
      </div>

      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-primary-500/20 border-t-primary-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-200">Claude analyse l'offre...</p>
            <p className="text-xs text-dark-500 mt-1">Adaptation du CV en cours</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm text-red-400 font-medium">Erreur de génération</p>
            <p className="text-xs text-dark-500 mt-1 max-w-xs">{error}</p>
          </div>
          <button onClick={onGenerate} className="btn-secondary text-xs">
            Réessayer
          </button>
        </div>
      ) : content ? (
        <div
          className="flex-1 overflow-y-auto bg-dark-900/50 rounded-lg border border-dark-700 p-4 prose prose-invert prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-300">CV non généré</p>
            <p className="text-xs text-dark-500 mt-1">
              {offerSelected
                ? 'Cliquez sur "Adapter le CV" pour générer une version personnalisée'
                : 'Sélectionnez une offre pour adapter votre CV'}
            </p>
          </div>
          {offerSelected && (
            <button onClick={onGenerate} className="btn-primary">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Adapter le CV
            </button>
          )}
        </div>
      )}
    </div>
  )
}
