import React, { useState } from 'react'

interface CoverLetterPreviewProps {
  content: string
  isGenerating: boolean
  error: string
  onGenerate: () => void
  offerSelected: boolean
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 class="text-sm font-semibold text-dark-200 mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-base font-bold text-dark-100 mt-5 mb-2">$2</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-lg font-bold text-primary-400 mb-3">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong class="text-dark-100 font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="text-dark-300">$1</em>')
    .replace(/^---$/gm, '<hr class="border-dark-700 my-3">')
    .replace(/\n\n/g, '</p><p class="text-dark-300 text-sm mb-3 leading-relaxed">')
    .replace(/^(?!<[hpli])(.+)$/gm, '<p class="text-dark-300 text-sm mb-2 leading-relaxed">$1</p>')
}

export const CoverLetterPreview: React.FC<CoverLetterPreviewProps> = ({
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
    const filename = `lm-${Date.now()}.pdf`
    const result = await window.electronAPI.exportPdf(content, filename)
    setExporting(false)
    if (result.success) {
      window.electronAPI.notify('Lettre exportée', 'Lettre de motivation exportée en PDF avec succès')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-dark-100">Lettre de Motivation</h3>
            <p className="text-xs text-dark-500">Rédigée par l'IA pour l'offre</p>
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
            <div className="w-12 h-12 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-200">Claude rédige votre lettre...</p>
            <p className="text-xs text-dark-500 mt-1">Personnalisation en cours</p>
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
          <button onClick={onGenerate} className="btn-secondary text-xs">Réessayer</button>
        </div>
      ) : content ? (
        <div
          className="flex-1 overflow-y-auto bg-dark-900/50 rounded-lg border border-dark-700 p-4"
          dangerouslySetInnerHTML={{ __html: markdownToHtml(content) }}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 border border-dark-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-dark-300">Lettre non générée</p>
            <p className="text-xs text-dark-500 mt-1">
              {offerSelected
                ? 'Cliquez sur "Générer la lettre" pour créer une lettre personnalisée'
                : 'Sélectionnez une offre pour générer votre lettre'}
            </p>
          </div>
          {offerSelected && (
            <button onClick={onGenerate} className="btn-primary" style={{ background: 'linear-gradient(135deg, #7c3aed, #9333ea)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Générer la lettre
            </button>
          )}
        </div>
      )}
    </div>
  )
}
