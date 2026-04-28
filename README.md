# VPS Monitor

Application web de monitoring pour VPS multi-applications. Supervise les containers Docker et la disponibilité des applications web via une interface légère sans framework.

## Fonctionnalités

- Dashboard temps réel des containers Docker (statut, image, ports, uptime)
- Monitoring HTTP des applications web exposées via Nginx
- Actions Docker : restart, stop, start d'un container
- Authentification par session (login/password, durée 8h)
- Page publique d'accueil avec liens vers les applications
- Rafraîchissement automatique toutes les 5 secondes
- Indicateurs visuels : vert (running/OK), rouge (exited/DOWN), orange (restarting)
- Statut global OK/KO affiché dans le header

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Backend | Node.js 20 + Express 5 |
| Docker | Dockerode (via socket) |
| Frontend | HTML + CSS + JS vanilla (sans build) |
| Auth | express-session |
| Tests | Jest + Supertest |
| Lint | ESLint |

## Structure du projet

```
vps-monitor-app/
├── api/
│   ├── server.js           # Serveur Express + routes
│   ├── server.test.js      # Tests Jest
│   └── services/
│       ├── docker.js       # Intégration Docker socket
│       └── http.js         # Checks HTTP des applications
├── public/
│   ├── home.html           # Page publique (non connecté)
│   ├── index.html          # Dashboard (connecté)
│   ├── login.html          # Formulaire de login
│   ├── app.js              # Logique frontend
│   └── style.css
├── Dockerfile
└── package.json
```

## API

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Home publique ou dashboard (selon session) |
| POST | `/auth/login` | Connexion |
| POST | `/auth/logout` | Déconnexion |

### Routes protégées (session requise)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/status` | Statut containers + sites web |
| POST | `/api/container/restart` | Redémarre un container |
| POST | `/api/container/stop` | Arrête un container |
| POST | `/api/container/start` | Démarre un container arrêté |

#### Exemple de réponse `GET /api/status`

```json
{
  "containers": [
    { "name": "sbv-api", "status": "running", "ports": ["3006:5000"], "image": "sbv-api:latest", "uptime": "2h" }
  ],
  "websites": [
    { "name": "SaintBarth Volley", "url": "/saintbarthvolley/", "status": "OK" }
  ],
  "globalStatus": "OK"
}
```

## Variables d'environnement

Créer un fichier `.env` à la racine de `vps-monitor-app/` :

```env
PORT=3000
BASE_URL=http://localhost:3000
AUTH_USER=admin
AUTH_PASS=your-password
SESSION_SECRET=your-secret
```

## Lancement

### Développement

```bash
cd vps-monitor-app
npm install
npm run dev
```

### Production (Docker)

```yaml
# docker-compose.yml
vps-monitor:
  build: ./vps-monitor-app
  container_name: vps-monitor
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ports:
    - "3020:3000"
  env_file: ./vps-monitor-app/.env
  restart: unless-stopped
```

```bash
docker compose up -d vps-monitor
```

## Intégration Nginx

Remplace la homepage statique en proxifiant `/` vers vps-monitor :

```nginx
location / {
    proxy_pass http://127.0.0.1:3020;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Tests et lint

```bash
npm run lint     # ESLint
npm test         # Jest + Supertest
```

## CI/CD

- **CI** : lint + tests sur toutes les branches et PRs (GitHub Actions)
- **CD** : déploiement automatique sur le VPS via SSH au push sur `staging`

## Applications monitorées

| Application | Route Nginx |
|-------------|-------------|
| TP Vue | `/B3dev-TP_VUE/` |
| SaintBarth Volley | `/saintbarthvolley/` |
| Lucky7 | `/lucky7/` |
| College La Boussole | `/collegelaboussole/` |
| Cinemap | `/cinemap/` |

## Sécurité

- Le socket Docker (`/var/run/docker.sock`) donne un accès total au serveur — déployer uniquement en environnement de confiance
- Toutes les routes `/api/*` et les actions containers sont protégées par la session
- Cookies `httpOnly`, session de 8h

## Évolutions prévues

- Alertes Discord / email
- Historique uptime
- Graphiques CPU / RAM
- Logs en temps réel
- Support multi-serveurs
