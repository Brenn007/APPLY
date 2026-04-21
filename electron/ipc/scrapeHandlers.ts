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

// La Bonne Alternance API types
interface LBAJob {
  intitule?: string
  entreprise?: { nom?: string }
  lieuTravail?: { libelle?: string }
  description?: string
  origineOffre?: { urlOrigine?: string }
  id?: string
  jobs?: Array<{ romeLabel?: string }>
  company?: { name?: string }
  place?: { city?: string }
  _id?: string
}

interface LBAResponse {
  jobs?: {
    peJobs?: { results?: LBAJob[] }
    matchas?: { results?: LBAJob[] }
  }
}

// Adzuna API types
interface AdzunaJob {
  title?: string
  company?: { display_name?: string }
  location?: { display_name?: string }
  description?: string
  redirect_url?: string
}

interface AdzunaResponse {
  results?: AdzunaJob[]
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
      sendProgress('Initialisation du scraping...', 5)
      await delay(300)

      const ftClientId = process.env.FRANCE_TRAVAIL_CLIENT_ID
      const ftClientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET
      const profile = readProfile()

      await delay(300)

      const searchTitle = (profile.targetTitle as string) || 'développeur'
      const searchContract = (profile.targetContract as string) || 'alternance'
      const searchDept = (profile.targetDepartment as string) || ''
      const searchKeywords = `${searchTitle} ${searchContract}`.trim()

      const isAlternanceMode = searchContract === 'alternance' || !searchContract

      let offers: Offer[] = []

      // Bloquer si alternance et credentials France Travail manquants
      if (isAlternanceMode && (!ftClientId || !ftClientSecret)) {
        return {
          success: false, count: 0, newOffers: 0,
          message: 'Credentials France Travail manquants. Ajoutez FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET dans votre .env.'
        }
      }

      const locationLabel = (profile.targetLocation as string) || 'France'
      const isAlternance = isAlternanceMode
      const isStage = searchContract === 'stage'
      const allSources: string[] = []

      // --- France Travail (alternance uniquement) ---
      if (isAlternance) {
        sendProgress('Authentification France Travail...', 15)
        const token = await getFranceTravailToken(ftClientId, ftClientSecret)

        sendProgress(`France Travail — recherche "${searchKeywords}" ${searchDept ? `(dép. ${searchDept})` : `à ${locationLabel}`}...`, 25)
        const ftOffers = await searchFranceTravailOffers(token, searchKeywords, searchDept)
        offers.push(...ftOffers)
        allSources.push(`France Travail: ${ftOffers.length}`)
        db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
          new Date().toISOString(), 'info',
          `[France Travail] ${ftOffers.length} offres récupérées`
        )
      }

      // --- La Bonne Alternance (alternance uniquement, sans clé API) ---
      if (isAlternance) {
        sendProgress('La Bonne Alternance — recherche en cours...', 40)
        const lbaOffers = await getLaBonneAlternanceOffers(searchTitle, searchDept)
        offers.push(...lbaOffers)
        allSources.push(`La Bonne Alternance: ${lbaOffers.length}`)
        db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
          new Date().toISOString(), 'info',
          `[La Bonne Alternance] ${lbaOffers.length} offres récupérées`
        )
      }

      // --- Adzuna (alternance + stage) ---
      const adzunaAppId = process.env.ADZUNA_APP_ID
      const adzunaAppKey = process.env.ADZUNA_APP_KEY
      if (adzunaAppId && adzunaAppKey) {
        sendProgress(`Adzuna — recherche ${isStage ? 'stages' : 'offres'}...`, 60)
        const adzunaOffers = await getAdzunaOffers(adzunaAppId, adzunaAppKey, searchTitle, searchContract, locationLabel)
        offers.push(...adzunaOffers)
        allSources.push(`Adzuna: ${adzunaOffers.length}`)
        db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
          new Date().toISOString(), 'info',
          `[Adzuna] ${adzunaOffers.length} offres récupérées`
        )
      } else {
        db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
          new Date().toISOString(), 'warn',
          '[Adzuna] Clés manquantes (ADZUNA_APP_ID / ADZUNA_APP_KEY) — source ignorée'
        )
      }

      // Déduplication par URL avant insertion
      const seenUrls = new Set<string>()
      offers = offers.filter(o => {
        if (!o.url || seenUrls.has(o.url)) return false
        seenUrls.add(o.url)
        return true
      })

      sendProgress(`${offers.length} offres uniques trouvées (${allSources.join(', ')})...`, 75)

      sendProgress('Mise à jour de la base de données...', 80)
      await delay(200)

      // Supprimer les offres de plateformes dépréciées non liées à une candidature
      const DEPRECATED_PLATFORMS = ['LinkedIn', 'Indeed', 'HelloWork', 'Météojob', 'Meteojob']
      const placeholders = DEPRECATED_PLATFORMS.map(() => '?').join(', ')
      db.prepare(`
        DELETE FROM job_offers
        WHERE platform IN (${placeholders})
        AND id NOT IN (SELECT DISTINCT offer_id FROM applications WHERE offer_id IS NOT NULL)
      `).run(...DEPRECATED_PLATFORMS)

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

      db.prepare('INSERT INTO logs (timestamp, level, message) VALUES (?, ?, ?)').run(
        new Date().toISOString(), 'info',
        `[Agent] Scraping terminé — ${offers.length} offres analysées, ${totalNew} nouvelles (${durationMs}ms)`
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

// --- La Bonne Alternance (pas de clé API requise) ---
async function getLaBonneAlternanceOffers(jobTitle: string, dept: string): Promise<Offer[]> {
  const rome = getRomeCode(jobTitle)
  const coords = getDeptCoordinates(dept)
  if (!coords) {
    console.log('[LBA] Département non reconnu:', dept)
    return []
  }

  const params = new URLSearchParams({
    romes: rome,
    latitude: coords.lat.toString(),
    longitude: coords.lon.toString(),
    radius: '30',
    caller: 'apply-app'
  })

  const response = await fetch(
    `https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/jobs/jobs?${params}`,
    { headers: { 'Accept': 'application/json' } }
  )

  const body = await response.text()
  console.log(`[LBA] Response (${response.status}):`, body.slice(0, 200))
  if (!response.ok || !body.trim()) return []

  const data = JSON.parse(body) as LBAResponse
  const results: Offer[] = []

  for (const job of data?.jobs?.peJobs?.results ?? []) {
    results.push({
      title: job.intitule ?? 'Poste non précisé',
      company: job.entreprise?.nom ?? 'Entreprise non précisée',
      location: job.lieuTravail?.libelle ?? dept,
      platform: 'La Bonne Alternance',
      description: job.description ?? 'Aucune description disponible.',
      url: job.origineOffre?.urlOrigine
        ?? `https://labonnealternance.apprentissage.beta.gouv.fr/recherche-emploi?type=peJob&itemId=${job.id}`,
      scraped_at: new Date().toISOString(),
      status: 'new'
    })
  }

  for (const job of data?.jobs?.matchas?.results ?? []) {
    const jobTitle = job.jobs?.[0]?.romeLabel ?? 'Alternance'
    results.push({
      title: jobTitle,
      company: job.company?.name ?? 'Entreprise non précisée',
      location: job.place?.city ?? dept,
      platform: 'La Bonne Alternance',
      description: `${jobTitle} — ${job.company?.name ?? ''}`.trim(),
      url: `https://labonnealternance.apprentissage.beta.gouv.fr/recherche-emploi?type=matcha&itemId=${job._id}`,
      scraped_at: new Date().toISOString(),
      status: 'new'
    })
  }

  return results
}

// --- Adzuna (alternance + stage) ---
async function getAdzunaOffers(
  appId: string,
  appKey: string,
  jobTitle: string,
  contractType: string,
  location: string
): Promise<Offer[]> {
  const contractKeywords =
    contractType === 'stage' ? ['stage'] :
    contractType === 'alternance' ? ['alternance', 'apprentissage'] :
    ['alternance', 'stage']

  const results: Offer[] = []

  for (const contract of contractKeywords) {
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      what: `${jobTitle} ${contract}`,
      where: location,
      results_per_page: '20',
      'content-type': 'application/json'
    })

    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/fr/search/1?${params}`,
      { headers: { 'Accept': 'application/json' } }
    )

    const body = await response.text()
    console.log(`[Adzuna/${contract}] Response (${response.status}):`, body.slice(0, 200))
    if (!response.ok || !body.trim()) continue

    const data = JSON.parse(body) as AdzunaResponse
    for (const job of data?.results ?? []) {
      if (!job.redirect_url) continue
      results.push({
        title: job.title ?? 'Poste non précisé',
        company: job.company?.display_name ?? 'Entreprise non précisée',
        location: job.location?.display_name ?? location,
        platform: 'Adzuna',
        description: job.description ?? 'Aucune description disponible.',
        url: job.redirect_url,
        scraped_at: new Date().toISOString(),
        status: 'new'
      })
    }
  }

  return results
}

// ROME code par titre de poste
function getRomeCode(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('devops') || t.includes('cloud') || t.includes('infra')) return 'M1802'
  if (t.includes('data') || t.includes('ia') || t.includes('machine learning')) return 'M1805,M1806'
  if (t.includes('mobile') || t.includes('android') || t.includes('ios')) return 'M1805'
  return 'M1805' // développement web/logiciel par défaut
}

// Coordonnées GPS par numéro de département
function getDeptCoordinates(dept: string): { lat: number; lon: number } | null {
  const map: Record<string, { lat: number; lon: number }> = {
    '31': { lat: 43.6047, lon: 1.4442 },  // Toulouse
    '75': { lat: 48.8566, lon: 2.3522 },  // Paris
    '69': { lat: 45.7640, lon: 4.8357 },  // Lyon
    '13': { lat: 43.2965, lon: 5.3698 },  // Marseille
    '33': { lat: 44.8378, lon: -0.5792 }, // Bordeaux
    '06': { lat: 43.7102, lon: 7.2620 },  // Nice
    '34': { lat: 43.6119, lon: 3.8772 },  // Montpellier
    '67': { lat: 48.5734, lon: 7.7521 },  // Strasbourg
    '59': { lat: 50.6292, lon: 3.0573 },  // Lille
    '44': { lat: 47.2184, lon: -1.5536 }, // Nantes
    '35': { lat: 48.1173, lon: -1.6778 }, // Rennes
    '38': { lat: 45.1885, lon: 5.7245 },  // Grenoble
    '76': { lat: 49.4432, lon: 1.0993 },  // Rouen
    '57': { lat: 49.1193, lon: 6.1757 },  // Metz
    '54': { lat: 48.6921, lon: 6.1844 },  // Nancy
    '74': { lat: 45.8992, lon: 6.1294 },  // Annecy
    '01': { lat: 46.2044, lon: 5.2265 },  // Bourg-en-Bresse
  }
  return map[dept] ?? null
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
