# Changelog

## [0.2.0] — 2026-04-27

### Phase 2 — Monitoring HTTP des applications web

#### Added

- `api/services/http.js` : vérification HTTP des 5 applications web (TP Vue, SaintBarth Volley, Lucky7, College La Boussole, Cinemap)
- Checks effectués en parallèle avec `Promise.all` via `fetch` natif Node.js 20 avec timeout de 5 secondes (`AbortController`)
- `redirect: 'manual'` pour accepter les redirections (302) comme `OK` — nécessaire pour les apps avec page de login
- `globalStatus` prend désormais en compte l'état des sites web en plus des containers
- Section "Applications web" dans le dashboard avec indicateurs visuels vert/rouge
- Compteur OK/KO global affiché dans le header
- Variable d'environnement `BASE_URL` pour configurer l'URL de base des checks HTTP
- Fichier `.env` pour la configuration locale
- Migration de CommonJS (`require`) vers ES Modules (`import/export`) sur l'ensemble du projet
- Configuration Jest adaptée pour l'ESM (`--experimental-vm-modules`, `jest.unstable_mockModule`)
- Configuration ESLint mise à jour pour l'ESM (`sourceType: 'module'`)

#### Changed

- `GET /api/status` : le champ `websites` est maintenant rempli (vide en 0.1.0)
- `globalStatus` passe à `KO` si un site web est indisponible, pas uniquement les containers
- `server.js` : détection du module principal via `import.meta.url` au lieu de `require.main`

---

## [0.1.0] — 2026-04-27

### Phase 1 — MVP : API Docker + Frontend minimal

#### Added

- Backend Node.js + Express servant les fichiers statiques et l'API REST
- `GET /api/status` : liste tous les containers Docker avec nom, statut, image, ports et uptime
- Connexion au socket Docker via `dockerode` (`/var/run/docker.sock`)
- Calcul du `globalStatus` global (`OK` / `KO`) selon l'état des containers
- Frontend statique vanilla (HTML + CSS + JS) sans framework ni build
- Rafraîchissement automatique du dashboard toutes les 5 secondes
- Indicateurs visuels par statut : vert (running), rouge (exited), orange (restarting)
- `Dockerfile` basé sur `node:20-alpine`
- Intégration dans le `docker-compose.yml` du VPS avec montage du socket Docker
- Script `npm run dev` via `nodemon` pour le développement local
- Pipeline CI GitHub Actions (`ci.yml`) : lint ESLint + tests Jest sur toutes les branches et PRs
- Pipeline CD GitHub Actions (`staging.yml`) : déploiement automatique sur le VPS via SSH au push sur `staging`
- Tests unitaires avec `jest` + `supertest` (mock du socket Docker)
