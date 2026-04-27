# Changelog

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
