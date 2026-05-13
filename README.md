# APPLY — Automated Placement & Letter/cv Yielding agent

Application desktop Electron + React + TypeScript qui assiste les étudiants dans leur recherche d'alternance en récupérant des offres réelles, en adaptant le CV et en générant des lettres de motivation personnalisées via l'IA.

---

## Présentation

APPLY est un assistant de candidature intelligent qui :
1. **Récupère** les offres d'alternance réelles depuis l'API officielle France Travail (Pôle Emploi)
2. **Adapte** votre CV à chaque offre sélectionnée via l'IA (Groq — Llama 3.3 70B)
3. **Génère** une lettre de motivation personnalisée pour chaque offre
4. **Suit** vos candidatures dans un tableau Kanban interactif
5. **Orchestre** les tâches via Jules (Google) comme moteur d'exécution autonome

> APPLY n'est **pas** un bot qui postule à votre place (`autoApply: false`). Il vous fournit les documents personnalisés pour que vous postuliez vous-même, avec le meilleur dossier possible.

---

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Desktop | Electron 28, IPC, contextBridge, System Tray |
| Frontend | React 18, TypeScript strict, Tailwind CSS, Vite |
| Persistance | SQLite (better-sqlite3) |
| IA | Groq API — `llama-3.3-70b-versatile` (gratuit) |
| Scraping | API France Travail v2 (OAuth2, officielle) |
| Orchestration | Jules (Google) — agent IA autonome |
| Architecture | MVC — séparation UI / Logique / Données |

---

## Installation

### Prérequis
- Node.js 20+
- npm 10+
- Clé API Groq gratuite — [console.groq.com](https://console.groq.com)
- Credentials France Travail — [francetravail.io/data/api](https://francetravail.io/data/api)
- Clé Jules (optionnel) — [jules.google.com](https://jules.google.com)

### Étapes

```bash
# 1. Cloner le dépôt
git clone https://github.com/Brenn007/APPLY.git
cd APPLY

# 2. Installer les dépendances
npm install

# 3. Recompiler better-sqlite3 pour Electron
npx electron-rebuild -f -w better-sqlite3

# 4. Configurer les variables d'environnement
cp .env.example .env
# Renseigner les clés dans .env (voir section Configuration)

# 5. Lancer en mode développement
npm start

# 6. Builder l'application
npm run build
```

---

## Architecture MVC

```
APPLY/
├── electron/                     # MAIN PROCESS (Node.js)
│   ├── main.ts                   # Point d'entrée — fenêtre, tray, dotenv, lifecycle
│   ├── preload.ts                # Bridge sécurisé — expose electronAPI via contextBridge
│   └── ipc/
│       ├── dbHandlers.ts         # Modèle — SQLite CRUD (offres, candidatures, logs, jules_tasks)
│       ├── scrapeHandlers.ts     # Contrôleur — Scraping via API France Travail
│       └── agentHandlers.ts      # Contrôleur — Génération IA via Groq
│
├── src/                          # RENDERER PROCESS (React)
│   ├── App.tsx                   # Vue racine — navigation, layout, titlebar
│   ├── views/
│   │   ├── Dashboard.tsx         # Statistiques, statut Jules, journal d'activité
│   │   ├── OffersView.tsx        # Liste des offres + génération CV/lettre
│   │   ├── ApplicationsView.tsx  # Tableau Kanban des candidatures
│   │   └── SettingsView.tsx      # Configuration clés API, profil étudiant
│   ├── components/
│   │   ├── OfferCard.tsx         # Carte d'offre d'emploi
│   │   ├── OfferList.tsx         # Liste filtrée d'offres
│   │   ├── CvPreview.tsx         # Prévisualisation du CV généré
│   │   ├── CoverLetterPreview.tsx # Prévisualisation de la lettre
│   │   ├── StatusBadge.tsx       # Badges de statut et plateforme
│   │   └── KanbanBoard.tsx       # Kanban avec drag & drop natif
│   ├── store/
│   │   └── applyStore.ts         # Store global (module-level state + hooks React)
│   └── types/
│       └── electron.d.ts         # Types TypeScript pour window.electronAPI
│
├── agents-config/
│   └── apply.json                # Configuration de l'agent
├── user-profile/
│   ├── cv-base.md                # CV de base en markdown
│   └── profile.json              # Profil étudiant (email, téléphone, compétences...)
└── mocks/
    └── job-offers.json           # 15 offres de fallback (si France Travail indisponible)
```

### Règles d'architecture

- **Le renderer ne touche jamais à Node.js** — toute communication passe par `window.electronAPI` (contextBridge)
- **Zéro UI freeze** — scraping, appels IA et SQLite s'exécutent dans le main process via IPC
- **TypeScript strict** — aucun `any`, tous les composants et handlers sont typés
- **Séparation des responsabilités** — chaque IPC handler a une responsabilité unique
- **Fallback automatique** — si France Travail est indisponible, les mocks prennent le relais sans planter

---

## Fonctionnalités

### Récupération des offres (France Travail)
- Appels à l'API officielle France Travail v2 (OAuth2 client credentials)
- Recherche d'offres d'alternance développeur dans le département 31 (Toulouse)
- Déduplication automatique par URL en SQLite
- Fallback sur les 15 offres mockées si les credentials sont absents
- Barre de progression temps réel via IPC events
- Filtres dans l'interface : plateforme, statut

### Adaptation de CV
- Lecture de `user-profile/cv-base.md` + `user-profile/profile.json`
- Les coordonnées à jour (email, téléphone) sont injectées dans le prompt
- Génération via Groq (Llama 3.3 70B) avec prompt RH optimisé
- Prévisualisation Markdown dans l'interface
- Boutons Copier et Sauvegarder (`outputs/cv-[company]-[date].md`)

### Génération de lettre de motivation
- Personnalisation : prénom/nom, entreprise, poste exact, valeurs détectées
- Email et téléphone du profil utilisés automatiquement
- Ton sobre et professionnel, 350 mots maximum
- Sauvegarde dans `outputs/lm-[company]-[date].md`

### Suivi Kanban
- 6 colonnes : Brouillon → Envoyée → Vue → Entretien → Refusée → Acceptée
- Drag & drop natif entre colonnes (sans dépendance externe)
- Alerte visuelle orange après +7 jours sans réponse sur une candidature envoyée
- Notes libres éditables sur chaque candidature

### Dashboard Jules
- Statut de connexion Jules (connecté / non configuré)
- Tâche en cours avec loader animé
- Quota journalier (15 tâches/jour sur le plan gratuit)
- Historique des dernières tâches exécutées (type, statut, durée)

### System Tray
- Icône APPLY dans la zone de notification Windows
- Menu contextuel : Ouvrir | Lancer le scraping | Quitter
- Notifications natives (nouvelles offres trouvées, candidatures en attente)

---

## Base de données SQLite

Stockée dans `%APPDATA%/apply/apply.db` (Windows).

```sql
job_offers    -- Offres récupérées via France Travail, avec statut et métadonnées
applications  -- Candidatures liées aux offres (Kanban)
jules_tasks   -- Historique des tâches orchestrées (scraping, CV, lettre)
logs          -- Journal d'activité de l'agent
settings      -- Clé API et configuration locale
```

---

## Configuration

Créez un fichier `.env` à la racine (copié depuis `.env.example`) :

```env
# Jules (Google) — Orchestrateur de tâches autonome
JULES_API_KEY=AQ.xxx...

# Groq — Génération IA gratuite (Llama 3.3 70B)
# Inscription : https://console.groq.com → "Create API Key"
GROQ_API_KEY=gsk_...

# France Travail — Scraping d'offres réelles
# Inscription : https://francetravail.io/data/api → créer une application
# → ajouter l'API "Offres d'emploi v2"
FRANCE_TRAVAIL_CLIENT_ID=
FRANCE_TRAVAIL_CLIENT_SECRET=
```

La clé Groq peut aussi être saisie directement dans **Paramètres → Clé API Groq** de l'application (stockée en SQLite, jamais exposée au renderer).

### Profil étudiant
Éditable dans **Paramètres → Profil étudiant** ou directement dans `user-profile/profile.json`.
Inclut : prénom, nom, email, téléphone, école, niveau, poste recherché, disponibilité.

---

## Workflow recommandé

1. **Lancer le scraping** → les offres France Travail s'affichent dans l'onglet Offres
2. **Sélectionner une offre** → lire la description
3. **Adapter le CV** → l'IA génère une version ciblée → Copier/Sauvegarder
4. **Générer la lettre** → lettre personnalisée avec tes coordonnées → Copier/Sauvegarder
5. **Postuler manuellement** sur le site de l'entreprise avec tes documents
6. **Créer une candidature** → elle apparaît dans le Kanban en "Brouillon"
7. **Déplacer vers "Envoyée"** une fois la candidature envoyée
8. **Suivre l'évolution** → déplacer au fil des retours (Vue, Entretien, etc.)
9. **Alertes automatiques** → si pas de réponse après 7 jours

---

## Auteur

**Brenn MAKOUYA** — Bachelor 3 Informatique, Ynov Campus Toulouse
GitHub : [github.com/Brenn007](https://github.com/Brenn007)

---

*Projet réalisé dans le cadre de la recherche d'alternance pour le Mastère 1 — 2026*
