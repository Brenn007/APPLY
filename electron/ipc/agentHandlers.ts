import { ipcMain, app, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { getDb } from './dbHandlers'

interface JobOffer {
  id: number
  title: string
  company: string
  location: string
  platform: string
  description: string
  url: string
  scraped_at: string
  status: string
}

// Persist Jules task record in SQLite (Jules = orchestrateur conceptuel dans le dashboard)
function saveJulesTask(
  taskType: string,
  payload: object,
  status: string,
  result: string | null,
  error: string | null,
  startedAt: string,
  durationMs: number
) {
  try {
    const db = getDb()
    db.prepare(`
      INSERT INTO jules_tasks (jules_task_id, task_type, payload, status, result, error, started_at, completed_at, duration_ms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      null,
      taskType,
      JSON.stringify(payload),
      status,
      result,
      error,
      startedAt,
      new Date().toISOString(),
      durationMs
    )
  } catch (err) {
    console.error('[Jules] Failed to persist task:', err)
  }
}

export function registerAgentHandlers(
  _sendNotification: (title: string, body: string) => void
) {
  // --- Generate tailored CV (Gemini, orchestrated by Jules conceptually) ---
  ipcMain.handle('agent:generate-cv', async (_event, offerId: number) => {
    const startedAt = new Date().toISOString()
    const startMs = Date.now()

    try {
      const db = getDb()
      const offer = db.prepare('SELECT * FROM job_offers WHERE id = ?').get(offerId) as JobOffer | undefined
      if (!offer) return { success: false, content: '', error: 'Offre introuvable' }

      const cvBase = readCvBase()
      const profile = readProfile()
      const geminiKey = getGeminiKey()

      if (!geminiKey) {
        return { success: false, content: '', error: 'Clé API Groq manquante. Ajoutez GROQ_API_KEY dans votre .env ou dans les Paramètres.' }
      }

      const contactInfo = buildContactInfo(profile)

      const content = await callGemini(
        geminiKey,
        `Tu es un expert RH chargé d'adapter un CV pour maximiser les chances d'être retenu.

Ta mission :
1. Réécris la section "À propos" / "Profil" en intégrant les mots-clés et besoins exacts de l'offre
2. Réorganise les compétences techniques (langages, frameworks, outils) en mettant EN PREMIER celles mentionnées dans l'offre — indique explicitement leur niveau/pertinence pour le poste
3. Mets en valeur les expériences et réalisations les plus pertinentes pour ce poste en reformulant leurs descriptions avec les termes de l'offre
4. Pour chaque projet ou expérience, ajoute une phrase courte expliquant en quoi il est pertinent pour ce poste précis
5. Adapte le titre du poste recherché pour correspondre exactement à l'intitulé de l'offre
6. Si le poste requiert des compétences linguistiques, mets en avant les langues maîtrisées

CONTRAINTES :
- Ne jamais inventer de compétence, expérience ou langage absent du CV original
- Remplace les coordonnées de contact (email, téléphone, GitHub, LinkedIn, ville) par celles des "Coordonnées actuelles". Supprime celles non fournies.
- Retourne UNIQUEMENT le CV final en markdown propre, sans commentaire, sans introduction, sans explication`,
        `## Coordonnées actuelles du candidat (à utiliser obligatoirement) :\n${contactInfo}\n\n## CV de base :\n\n${cvBase}\n\n## Offre :\n\n**Poste :** ${offer.title}\n**Entreprise :** ${offer.company}\n**Lieu :** ${offer.location}\n\n**Description :**\n${offer.description}`
      )

      const durationMs = Date.now() - startMs
      saveJulesTask('tailor-cv', { offerId, company: offer.company, position: offer.title }, 'success', content.slice(0, 500), null, startedAt, durationMs)

      const filename = `cv-${sanitize(offer.company)}-${formatDate()}.md`
      const filePath = await saveOutput(filename, content)

      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), 'info',
        `[Jules] CV généré pour ${offer.company} — ${offer.title} (${durationMs}ms)`
      )

      return { success: true, content, filePath }
    } catch (err) {
      const durationMs = Date.now() - startMs
      const errMsg = err instanceof Error ? err.message : String(err)
      saveJulesTask('tailor-cv', { offerId }, 'failed', null, errMsg, startedAt, durationMs)
      console.error('[Agent] generate-cv error:', err)
      return { success: false, content: '', error: errMsg }
    }
  })

  // --- Generate cover letter (Gemini, orchestrated by Jules conceptually) ---
  ipcMain.handle('agent:generate-cover-letter', async (_event, offerId: number) => {
    const startedAt = new Date().toISOString()
    const startMs = Date.now()

    try {
      const db = getDb()
      const offer = db.prepare('SELECT * FROM job_offers WHERE id = ?').get(offerId) as JobOffer | undefined
      if (!offer) return { success: false, content: '', error: 'Offre introuvable' }

      const profile = readProfile()
      const geminiKey = getGeminiKey()

      if (!geminiKey) {
        return { success: false, content: '', error: 'Clé API Groq manquante. Ajoutez GROQ_API_KEY dans votre .env ou dans les Paramètres.' }
      }

      const contactInfo = buildContactInfo(profile)

      const content = await callGemini(
        geminiKey,
        "Tu es un expert en recrutement et rédaction professionnelle. Génère une lettre de motivation professionnelle, personnalisée et convaincante pour cette offre. Intègre le nom de l'entreprise, le poste exact, et les valeurs détectées dans l'offre. Ton sobre et professionnel. Maximum 350 mots. Retourne uniquement la lettre, sans commentaire.",
        `## Profil du candidat :\n\nPrénom : ${profile.firstName ?? ''}\nNom : ${profile.lastName ?? ''}\nÉcole : ${profile.school ?? ''}\nNiveau : ${profile.level ?? ''}\nDisponibilité : ${profile.availability ?? ''}\n\n## Offre :\n\n**Poste :** ${offer.title}\n**Entreprise :** ${offer.company}\n**Lieu :** ${offer.location}\n\n**Description :**\n${offer.description}`
      )

      const durationMs = Date.now() - startMs
      saveJulesTask('generate-cover-letter', { offerId, company: offer.company, position: offer.title }, 'success', content.slice(0, 500), null, startedAt, durationMs)

      const filename = `lm-${sanitize(offer.company)}-${formatDate()}.md`
      const filePath = await saveOutput(filename, content)

      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), 'info',
        `[Jules] Lettre de motivation générée pour ${offer.company} — ${offer.title} (${durationMs}ms)`
      )

      return { success: true, content, filePath }
    } catch (err) {
      const durationMs = Date.now() - startMs
      const errMsg = err instanceof Error ? err.message : String(err)
      saveJulesTask('generate-cover-letter', { offerId }, 'failed', null, errMsg, startedAt, durationMs)
      console.error('[Agent] generate-cover-letter error:', err)
      return { success: false, content: '', error: errMsg }
    }
  })

  // --- Get CV base ---
  ipcMain.handle('settings:get-cv-base', () => {
    try {
      return { success: true, content: readCvBase() }
    } catch (err) {
      return { success: false, content: '', error: err instanceof Error ? err.message : String(err) }
    }
  })

  // --- Save CV base ---
  ipcMain.handle('settings:save-cv-base', (_event, content: string) => {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const cvPath = isDev
        ? path.join(process.cwd(), 'user-profile', 'cv-base.md')
        : path.join(process.resourcesPath, 'user-profile', 'cv-base.md')
      fs.writeFileSync(cvPath, content, 'utf-8')
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // --- Export markdown content as PDF ---
  ipcMain.handle('agent:export-pdf', async (_event, content: string, filename: string) => {
    try {
      const html = markdownToPdfHtml(content)
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: false, contextIsolation: true } })

      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

      const pdfBuffer = await win.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
      })
      win.destroy()

      const outputsDir = path.join(app.getPath('userData'), 'outputs')
      if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true })
      const filePath = path.join(outputsDir, filename)
      fs.writeFileSync(filePath, pdfBuffer)

      return { success: true, filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })


  // --- Save output file ---
  ipcMain.handle('agent:save-output', async (_event, filename: string, content: string) => {
    try {
      const filePath = await saveOutput(filename, content)
      return { success: true, filePath }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // --- Read file ---
  ipcMain.handle('agent:read-file', (_event, filePath: string) => {
    try {
      if (!fs.existsSync(filePath)) return { success: false, content: '', error: 'Fichier introuvable' }
      const content = fs.readFileSync(filePath, 'utf-8')
      return { success: true, content }
    } catch (err) {
      return { success: false, content: '', error: err instanceof Error ? err.message : String(err) }
    }
  })
}

// --- Groq API (Llama 3.3 — gratuit, 14 400 req/jour) ---
async function callGemini(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      max_tokens: 4096,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erreur API Groq (${response.status}): ${error}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('Réponse Groq vide ou invalide')
  return text
}

async function saveOutput(filename: string, content: string): Promise<string> {
  const outputsDir = path.join(app.getPath('userData'), 'outputs')
  if (!fs.existsSync(outputsDir)) fs.mkdirSync(outputsDir, { recursive: true })
  const filePath = path.join(outputsDir, filename)
  fs.writeFileSync(filePath, content, 'utf-8')
  return filePath
}

function readCvBase(): string {
  const isDev = process.env.NODE_ENV === 'development'
  const cvPath = isDev
    ? path.join(process.cwd(), 'user-profile', 'cv-base.md')
    : path.join(process.resourcesPath, 'user-profile', 'cv-base.md')
  if (!fs.existsSync(cvPath)) return '# CV non trouvé\n\nVeuillez placer votre CV dans user-profile/cv-base.md'
  return fs.readFileSync(cvPath, 'utf-8')
}

function readProfile(): Record<string, unknown> {
  const isDev = process.env.NODE_ENV === 'development'
  const profilePath = isDev
    ? path.join(process.cwd(), 'user-profile', 'profile.json')
    : path.join(process.resourcesPath, 'user-profile', 'profile.json')
  if (!fs.existsSync(profilePath)) return {}
  return JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
}

function getGeminiKey(): string {
  const envKey = process.env.GROQ_API_KEY || process.env.GOOGLE_AI_API_KEY
  if (envKey) return envKey
  try {
    const db = getDb()
    const row = db.prepare("SELECT value FROM settings WHERE key = 'api_key'").get() as { value: string } | undefined
    return row?.value || ''
  } catch {
    return ''
  }
}

function buildContactInfo(profile: Record<string, unknown>): string {
  const lines: string[] = []
  if (profile.email) lines.push(`Email : ${profile.email}`)
  if (profile.phone) lines.push(`Téléphone : ${profile.phone}`)
  if (profile.github) lines.push(`GitHub : ${profile.github}`)
  if (profile.linkedin) lines.push(`LinkedIn : ${profile.linkedin}`)
  if (profile.targetLocation) lines.push(`Ville : ${profile.targetLocation}`)
  return lines.length > 0 ? lines.join('\n') : ''
}

function sanitize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 30)
}

function formatDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function delay(_ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, _ms))
}

function markdownToPdfHtml(md: string): string {
  const body = md
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)(\n(?!<li>)|$)/g, '<ul>$1</ul>\n')
    .replace(/^---$/gm, '<hr>')
    .replace(/\n\n+/g, '</p><p>')
    .replace(/^(?!<[hpliurco])(.+)$/gm, '<p>$1</p>')

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.55; color: #1a1a1a; background: #fff; }
  h1 { font-size: 18pt; font-weight: 700; color: #111; margin-bottom: 4pt; }
  h2 { font-size: 12pt; font-weight: 700; color: #222; border-bottom: 1.5px solid #333; padding-bottom: 3pt; margin: 14pt 0 6pt; text-transform: uppercase; letter-spacing: 0.03em; }
  h3 { font-size: 10.5pt; font-weight: 700; color: #333; margin: 8pt 0 3pt; }
  p { margin-bottom: 5pt; }
  ul { padding-left: 16pt; margin-bottom: 5pt; }
  li { margin-bottom: 2pt; }
  hr { border: none; border-top: 1px solid #ccc; margin: 10pt 0; }
  strong { font-weight: 700; }
  em { font-style: italic; color: #444; }
  code { font-family: 'Courier New', monospace; font-size: 9pt; background: #f3f3f3; padding: 0 3pt; border-radius: 2pt; }
</style>
</head>
<body>${body}</body>
</html>`
}
