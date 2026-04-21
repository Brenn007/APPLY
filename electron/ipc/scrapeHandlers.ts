import { ipcMain, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import { getDb } from './dbHandlers'

interface Offer {
  title: string
  company: string
  location: string
  platform: string
  description: string
  url: string
  scraped_at: string
  status: string
}

// France Travail API types
interface FTOffer {
  intitule: string
  entreprise?: { nom?: string }
  lieuTravail?: { libelle?: string }
  description?: string
  origineOffre?: { urlOrigine?: string; partenaires?: Array<{ url?: string }> }
  id: string
  dateCreation?: string
}

interface FTApiResponse {
  resultats?: FTOffer[]
}

let isScraping = false

export function registerScrapeHandlers(
  sendNotification: (title: string, body: string) => void
) {
  ipcMain.handle('scrape:start', async (event) => {
    if (isScraping) {
      return { success: false, message: 'Scraping déjà en cours', count: 0, newOffers: 0 }
    }

    isScraping = true
    const win = BrowserWindow.fromWebContents(event.sender)
    const startedAt = new Date().toISOString()
    const startMs = Date.now()

    const sendProgress = (message: string, progress: number) => {
      win?.webContents.send('scraping:progress', { message, progress })
    }

    try {
      const db = getDb()
      sendProgress('Initialisation de l\'agent Jules...', 5)
      await delay(300)

      const julesKey = process.env.JULES_API_KEY
      const ftClientId = process.env.FRANCE_TRAVAIL_CLIENT_ID
      const ftClientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
      const profile = readProfile()

      sendProgress('Envoi de la tâche à Jules...', 10)
      await delay(300)

      const searchTitle = (profile.targetTitle as string) || 'développeur'
      const searchContract = (profile.targetContract as string) || 'alternance'
      const searchDept = (profile.targetDepartment as string) || ''
      const searchKeywords = `${searchTitle} ${searchContract}`.trim()

      const julesPayload = {
        task: 'scrape-job-offers',
        platforms: ['france-travail', 'linkedin', 'indeed', 'hellowork'],
        query: searchKeywords
      }

      // Jules est l'orchestrateur conceptuel — la tâche est loggée en SQLite
      // L'exécution réelle se fait via l'API France Travail ou les mocks
      if (julesKey) {
        sendProgress('Jules orchestre la tâche de scraping...', 15)
      }

      let offers: Offer[] = []

      // --- France Travail API (real data) ---
      if (!ftClientId || !ftClientSecret) {
        return {
          success: false, count: 0, newOffers: 0,
          message: 'Credentials France Travail manquants. Ajoutez FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET dans votre .env.'
        }
      }

      sendProgress('Authentification France Travail...', 20)
      const token = await getFranceTravailToken(ftClientId, ftClientSecret)

      const locationLabel = (profile.targetLocation as string) || 'France'
      sendProgress(`Recherche d'offres "${searchKeywords}" ${searchDept ? `(dép. ${searchDept})` : `à ${locationLabel}`}...`, 35)
      const ftOffers = await searchFranceTravailOffers(token, searchKeywords, searchDept)

      sendProgress(`${ftOffers.length} offres trouvées sur France Travail...`, 60)
      offers = ftOffers

      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), 'info',
        `[France Travail] ${ftOffers.length} offres récupérées via API officielle`
      )

      sendProgress('Mise à jour de la base de données...', 80)
      await delay(200)

      // Supprimer toutes les offres non liées à une candidature (new + viewed)
      // pour que chaque scraping présente un résultat frais sans doublons
      db.prepare(`
        DELETE FROM job_offers
        WHERE status IN ('new', 'viewed')
        AND id NOT IN (SELECT DISTINCT offer_id FROM applications WHERE offer_id IS NOT NULL)
      `).run()

      let totalNew = 0
      const insertOffer = db.prepare(`
        INSERT OR IGNORE INTO job_offers (title, company, location, platform, description, url, scraped_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const offer of offers) {
        const result = insertOffer.run(
          offer.title, offer.company, offer.location, offer.platform,
          offer.description, offer.url, new Date().toISOString(), 'new'
        )
        if (result.changes > 0) totalNew++
      }

      const durationMs = Date.now() - startMs

      // Persist Jules task record
      db.prepare(`
        INSERT INTO jules_tasks (jules_task_id, task_type, payload, status, result, error, started_at, completed_at, duration_ms)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        null, 'scrape-job-offers', JSON.stringify(julesPayload),
        'success',
        `${totalNew} nouvelles offres sur ${offers.length} analysées`,
        null, startedAt, new Date().toISOString(), durationMs
      )

      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), 'info',
        `[Jules] Scraping terminé — ${offers.length} offres analysées, ${totalNew} nouvelles (${durationMs}ms)`
      )

      sendProgress('Scraping terminé !', 100)

      if (totalNew > 0) {
        sendNotification(
          'APPLY — Nouvelles offres',
          `${totalNew} nouvelle${totalNew > 1 ? 's' : ''} offre${totalNew > 1 ? 's' : ''} trouvée${totalNew > 1 ? 's' : ''} !`
        )
      }

      return {
        success: true,
        count: offers.length,
        newOffers: totalNew,
        message: `${totalNew} nouvelle${totalNew > 1 ? 's' : ''} offre${totalNew > 1 ? 's' : ''} trouvée${totalNew > 1 ? 's' : ''}`
      }
    } catch (err) {
      console.error('[Scrape] Error:', err)
      dbLog('error', `Erreur scraping : ${err instanceof Error ? err.message : String(err)}`)
      return { success: false, count: 0, newOffers: 0, message: `Erreur : ${err instanceof Error ? err.message : String(err)}` }
    } finally {
      isScraping = false
    }
  })

  ipcMain.handle('scrape:status', () => ({ isScraping }))
}

// --- France Travail OAuth2 ---
async function getFranceTravailToken(clientId: string, clientSecret: string): Promise<string> {
  const response = await fetch(
    'https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'api_offresdemploiv2 o2dsoffre'
      }).toString()
    }
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`France Travail auth failed (${response.status}): ${body}`)
  }

  const data = await response.json() as { access_token: string }
  return data.access_token
}

// --- France Travail Search ---
async function searchFranceTravailOffers(token: string, keywords: string, departement: string): Promise<Offer[]> {
  const paramObj: Record<string, string> = {
    motsCles: keywords,
    range: '0-49',
    sort: '1'
  }
  if (departement) paramObj.departement = departement
  const params = new URLSearchParams(paramObj)

  const url = `https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search?${params}`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  })

  const body = await response.text()
  console.log(`[FranceTravail] Search response (${response.status}):`, body.slice(0, 200))

  if (!response.ok) {
    throw new Error(`France Travail search failed (${response.status}): ${body}`)
  }

  if (!body || body.trim() === '') {
    console.log('[FranceTravail] Réponse vide — aucune offre trouvée')
    return []
  }

  const data = JSON.parse(body) as FTApiResponse
  const resultats = data.resultats ?? []

  return resultats.map((o: FTOffer): Offer => ({
    title: o.intitule ?? 'Poste non précisé',
    company: o.entreprise?.nom ?? 'Entreprise non précisée',
    location: o.lieuTravail?.libelle ?? 'Toulouse',
    platform: 'France Travail',
    description: o.description ?? 'Aucune description disponible.',
    url: o.origineOffre?.urlOrigine
      ?? o.origineOffre?.partenaires?.[0]?.url
      ?? `https://candidat.francetravail.fr/offres/recherche/detail/${o.id}`,
    scraped_at: new Date().toISOString(),
    status: 'new'
  }))
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function readProfile(): Record<string, unknown> {
  const isDev = process.env.NODE_ENV === 'development'
  const profilePath = isDev
    ? path.join(process.cwd(), 'user-profile', 'profile.json')
    : path.join(process.resourcesPath, 'user-profile', 'profile.json')
  if (!fs.existsSync(profilePath)) return {}
  try {
    return JSON.parse(fs.readFileSync(profilePath, 'utf-8'))
  } catch {
    return {}
  }
}


function dbLog(level: string, message: string) {
  try {
    getDb().prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
      new Date().toISOString(), level, message
    )
  } catch { /* ignore */ }
}
