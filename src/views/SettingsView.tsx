import React, { useEffect, useState } from 'react'
import { useStore, actions } from '../store/applyStore'

export const SettingsView: React.FC = () => {
  const [state] = useStore()
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [savedKey, setSavedKey] = useState(false)
  const [savedProfile, setSavedProfile] = useState(false)
  const [cvContent, setCvContent] = useState('')
  const [savedCv, setSavedCv] = useState(false)
  const [profile, setProfile] = useState<Record<string, string>>({
    firstName: '',
    lastName: '',
    school: '',
    level: '',
    targetContract: 'alternance',
    targetTitle: '',
    targetLocation: '',
    targetDepartment: '',
    availability: ''
  })

  useEffect(() => {
    actions.loadApiKey().then(() => {
      setApiKeyInput(state.apiKey || '')
    })
    actions.loadProfile().then(() => {
      if (state.profile) {
        setProfile(prev => ({
          ...prev,
          ...(state.profile as Record<string, string>)
        }))
      }
    })
    window.electronAPI.getCvBase().then(res => {
      if (res.success) setCvContent(res.content)
    })
  }, [])

  useEffect(() => {
    setApiKeyInput(state.apiKey || '')
  }, [state.apiKey])

  useEffect(() => {
    if (state.profile) {
      setProfile(prev => ({
        ...prev,
        ...(state.profile as Record<string, string>)
      }))
    }
  }, [state.profile])

  const handleSaveApiKey = async () => {
    await actions.saveApiKey(apiKeyInput)
    setSavedKey(true)
    setTimeout(() => setSavedKey(false), 2000)
  }

  const handleSaveCv = async () => {
    const res = await window.electronAPI.saveCvBase(cvContent)
    if (res.success) {
      setSavedCv(true)
      setTimeout(() => setSavedCv(false), 2000)
    }
  }

  const handleSaveProfile = async () => {
    await actions.saveProfile(profile as Record<string, unknown>)
    setSavedProfile(true)
    setTimeout(() => setSavedProfile(false), 2000)
  }

  const maskKey = (key: string): string => {
    if (!key) return ''
    return key.slice(0, 7) + '•'.repeat(Math.max(0, key.length - 11)) + key.slice(-4)
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-dark-100">Paramètres</h1>
          <p className="text-sm text-dark-500 mt-0.5">Configurez votre profil et l'API Groq</p>
        </div>

        {/* API Key */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-900/40 border border-primary-700/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-dark-100">Clé API Groq</h2>
              <p className="text-xs text-dark-500">Gratuite — console.groq.com — Requise pour la génération de CV et lettres</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="label">GROQ_API_KEY</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  className="input pr-10"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
                >
                  {showKey ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput}
                className="btn-primary flex-shrink-0"
              >
                {savedKey ? (
                  <><svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Sauvegardé</>
                ) : 'Sauvegarder'}
              </button>
            </div>
            <p className="text-xs text-dark-600">
              La clé est stockée localement dans la base SQLite. Vous pouvez aussi utiliser la variable d'environnement <code className="text-primary-400 font-mono">GROQ_API_KEY</code>.
            </p>
          </div>
        </div>

        {/* Profile */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-700/40 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-dark-100">Profil étudiant</h2>
              <p className="text-xs text-dark-500">Informations utilisées pour personnaliser les lettres de motivation</p>
            </div>
          </div>

          {/* Type de contrat */}
          <div>
            <label className="label mb-2 block">Type de contrat recherché</label>
            <div className="flex gap-3">
              {[
                { value: 'alternance', label: 'Alternance', desc: 'Contrat d\'apprentissage ou pro' },
                { value: 'stage', label: 'Stage', desc: 'Convention de stage' }
              ].map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProfile(prev => ({ ...prev, targetContract: option.value }))}
                  className={`flex-1 flex flex-col items-start gap-0.5 p-3 rounded-lg border transition-all text-left ${
                    profile.targetContract === option.value
                      ? 'bg-primary-900/40 border-primary-500/60 text-primary-300'
                      : 'bg-dark-900/50 border-dark-700 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      profile.targetContract === option.value ? 'border-primary-400' : 'border-dark-500'
                    }`}>
                      {profile.targetContract === option.value && (
                        <div className="w-1.5 h-1.5 rounded-full bg-primary-400" />
                      )}
                    </div>
                    <span className="text-sm font-semibold">{option.label}</span>
                  </div>
                  <span className="text-xs pl-[22px] text-dark-500">{option.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'firstName', label: 'Prénom', type: 'text' },
              { key: 'lastName', label: 'Nom', type: 'text' },
              { key: 'email', label: 'Email', type: 'email' },
              { key: 'phone', label: 'Téléphone', type: 'tel' },
              { key: 'school', label: 'École', type: 'text' },
              { key: 'level', label: 'Niveau', type: 'text' },
              { key: 'github', label: 'GitHub', type: 'text' },
              { key: 'linkedin', label: 'LinkedIn', type: 'text' },
              { key: 'targetTitle', label: 'Poste recherché', type: 'text' },
              { key: 'targetLocation', label: 'Ville cible', type: 'text' },
              { key: 'targetDepartment', label: 'N° département', type: 'text' },
              { key: 'availability', label: 'Disponibilité', type: 'text' }
            ].map(field => (
              <div key={field.key}>
                <label className="label">{field.label}</label>
                <input
                  type={field.type}
                  value={profile[field.key] || ''}
                  onChange={e => setProfile(prev => ({ ...prev, [field.key]: e.target.value }))}
                  className="input"
                  placeholder={
                    field.key === 'email' ? 'prenom.nom@email.com' :
                    field.key === 'phone' ? '+33 6 XX XX XX XX' :
                    field.key === 'github' ? 'github.com/votre-profil' :
                    field.key === 'linkedin' ? 'linkedin.com/in/votre-profil' :
                    field.key === 'targetDepartment' ? 'ex: 31, 75, 69...' : ''
                  }
                />
              </div>
            ))}
          </div>

          <button onClick={handleSaveProfile} className="btn-primary">
            {savedProfile ? (
              <><svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Profil sauvegardé</>
            ) : (
              <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Sauvegarder le profil</>
            )}
          </button>
        </div>

        {/* CV de base */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-900/40 border border-purple-700/40 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-sm font-semibold text-dark-100">CV de base</h2>
                <p className="text-xs text-dark-500">Collez votre CV ici — l'IA l'adaptera pour chaque offre</p>
              </div>
            </div>
            <button
              onClick={handleSaveCv}
              disabled={!cvContent.trim()}
              className="btn-primary flex-shrink-0"
            >
              {savedCv ? (
                <><svg className="w-4 h-4 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Sauvegardé</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Sauvegarder</>
              )}
            </button>
          </div>

          <textarea
            value={cvContent}
            onChange={e => setCvContent(e.target.value)}
            className="w-full h-72 bg-dark-900/50 border border-dark-700 rounded-lg p-3 text-sm text-dark-200 font-mono resize-y focus:outline-none focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/30 placeholder-dark-600"
            placeholder={`# Prénom NOM\nDéveloppeur Web — Recherche alternance\n\n## Formation\n**Bachelor Informatique** — Mon École (2023–2026)\n\n## Compétences\nReact, TypeScript, Node.js...\n\n## Expériences\n...\n\nCollez ici votre CV complet. L'IA s'en servira comme base pour l'adapter à chaque offre.`}
            spellCheck={false}
          />

          <p className="text-xs text-dark-600">
            Copiez votre CV depuis Word, Notion ou tout autre outil et collez-le ici en texte brut. Plus votre CV est détaillé, meilleure sera l'adaptation.
          </p>
        </div>

        {/* About */}
        <div className="card">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-dark-100">APPLY v1.0.0</h2>
              <p className="text-xs text-dark-400 mt-0.5">Automated Placement & Letter/cv Yielding agent</p>
              <div className="flex gap-2 mt-3">
                <span className="badge bg-dark-700 text-dark-400">Electron 28</span>
                <span className="badge bg-dark-700 text-dark-400">React 18</span>
                <span className="badge bg-dark-700 text-dark-400">TypeScript</span>
                <span className="badge bg-dark-700 text-dark-400">SQLite</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
