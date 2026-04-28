# Changelog

## [0.4.1] — 2026-04-28

### Phase 4 — Navigation vers les applications depuis le dashboard

#### Added

- Bouton "Ouvrir →" sur chaque card application web du dashboard (connecté) — ouvre l'application dans un nouvel onglet via `target="_blank"`
- Nouveau style `.card-link` : bouton discret monospace cohérent avec le design du dashboard, avec transition hover

#### Changed

- `home.html` : remplacement de la card CineMap — TP Laravel en première position par QW APP (`/qw-app/`) — CineMap déplacée après Lucky7
- `home.html` : footer mis à jour — ajout d'un lien Portfolio (`damien-paszkiewicz.vercel.app`) aux côtés du lien GitHub, suppression du label "B3 Dev"

---

## [0.4.0] — 2026-04-27

### Phase 4 — Intégration Nginx + Tests de non-régression

#### Changed

- Configuration Nginx : suppression de `root /var/www/home` — `location /` proxifie désormais vers `http://127.0.0.1:3020` (vps-monitor)
- La homepage statique (`/var/www/home/index.html`) est remplacée par l'application dynamique
- Toutes les routes existantes (`/saintbarthvolley/`, `/lucky7/`, `/cinemap/`, etc.) conservées et non impactées

#### Tests de non-régression validés

- Toutes les applications accessibles via leurs routes Nginx
- Homepage publique servie par vps-monitor sur `/`
- Dashboard accessible après login admin
- Containers `exited` affichés en rouge, containers `running` en vert
- `globalStatus: OK` après nettoyage des containers anonymes (`docker container prune`)

---

## [0.3.0] — 2026-04-27

### Phase 3 — Actions Docker + Authentification

#### Added

- `POST /api/container/restart` : redémarre un container par nom
- `POST /api/container/stop` : arrête un container par nom
- `POST /api/container/start` : démarre un container arrêté par nom
- Authentification par session (`express-session`) — login/password via variables d'environnement (`AUTH_USER`, `AUTH_PASS`, `SESSION_SECRET`)
- `POST /auth/login` : création de session, durée 8h
- `POST /auth/logout` : destruction de session
- Middleware `requireAuth` protégeant toutes les routes `/api/*`
- Page de login (`login.html`) avec formulaire et gestion d'erreur
- Page publique `home.html` : liste des 5 applications avec liens directs, lien "Monitoring" discret en footer
- Routing conditionnel sur `GET /` : affiche `home.html` si non connecté, le dashboard si connecté
- Boutons `Restart` / `Stop` sur les cards containers running, `Start` sur les cards exited
- Désactivation des boutons pendant l'action en cours
- Redirection automatique vers `/login.html` si la session expire (réponse 401)
- Bouton "Déconnexion" dans le header

#### Changed

- `app.js` : gestion du 401 sur `fetchStatus` avec redirection vers la page de login
- `server.js` : `requireAuth` appliqué uniquement sur les routes `/api/*`, `GET /` sert la page publique ou le dashboard selon la session
- Tests : variables d'environnement d'auth isolées via `process.env` avant import pour éviter la pollution par le `.env` local

---

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
