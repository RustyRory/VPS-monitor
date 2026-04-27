# Workflow — VPS Monitor

## Vue d'ensemble

Le projet est divisé en 4 phases. Chaque phase doit être complète et fonctionnelle avant de passer à la suivante.

---

## Phase 1 — MVP : API Docker + Frontend minimal

### Étape 1 — Initialiser la structure du projet

Créer l'arborescence suivante à la racine du repo :

```
vps-monitor-app/
├── api/
│   ├── server.js
│   └── services/
│       └── docker.js
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
├── Dockerfile
└── .dockerignore
```

### Étape 2 — Mettre en place le backend Node.js

- Initialiser le projet Node : `npm init -y`
- Installer les dépendances : `npm install express dockerode`
- Créer `api/services/docker.js` : connexion au socket Docker (`/var/run/docker.sock`) via `dockerode`, exposer une fonction qui liste tous les containers avec nom, statut, ports exposés, uptime et image
- Créer `api/server.js` : serveur Express qui :
  - Monte le dossier `public/` en statique
  - Expose `GET /api/status` retournant les données containers + statut global
- Tester localement : `node api/server.js`, vérifier `http://localhost:3000/api/status`

### Étape 3 — Créer le frontend statique

- `public/index.html` : structure HTML simple avec une section "Containers" et un indicateur de statut global
- `public/style.css` : styles minimalistes, couleurs vert/rouge/orange pour les statuts
- `public/app.js` : fetch sur `/api/status` toutes les 5 secondes, mise à jour du DOM sans rechargement

### Étape 4 — Dockeriser l'application

- Écrire le `Dockerfile` :
  - Image de base : `node:20-alpine`
  - Copier les sources, installer les dépendances, exposer le port 3000
  - CMD : `node api/server.js`
- Écrire `.dockerignore` : exclure `node_modules`, `.git`
- Tester le build : `docker build -t vps-monitor .`
- Tester le container : `docker run -p 3020:3000 -v /var/run/docker.sock:/var/run/docker.sock vps-monitor`
- Vérifier `http://localhost:3020`

### Étape 5 — Intégrer dans docker-compose

Ajouter le service dans le `docker-compose.yml` existant du VPS :

```yaml
vps-monitor:
  build: ./vps-monitor
  container_name: vps-monitor
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ports:
    - "3020:3000"
  restart: unless-stopped
```

Lancer : `docker-compose up -d vps-monitor`

### Étape 6 — CI/CD : lint, tests et déploiement automatique sur staging

#### Objectif

À chaque push sur la branche `staging`, GitHub Actions doit :
1. Vérifier la qualité du code (lint)
2. Lancer les tests
3. Déployer automatiquement sur le VPS via SSH

#### 6.1 — Mettre en place ESLint

Installer ESLint dans `vps-monitor-app/` :

```bash
npm install --save-dev eslint @eslint/js
```

Créer `vps-monitor-app/eslint.config.js` :

```js
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
];
```

Ajouter le script dans `package.json` :

```json
"lint": "eslint api/ public/"
```

#### 6.2 — Mettre en place les tests

Installer les dépendances de test :

```bash
npm install --save-dev jest supertest
```

Créer `vps-monitor-app/api/server.test.js` :

```js
const request = require('supertest');
const app = require('./server');

describe('GET /api/status', () => {
  it('répond 200 avec la structure attendue', async () => {
    const res = await request(app).get('/api/status');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('containers');
    expect(res.body).toHaveProperty('websites');
    expect(res.body).toHaveProperty('globalStatus');
  });
});
```

> Pour que `supertest` fonctionne, `server.js` doit exporter `app` sans appeler `listen` directement — séparer l'export de app et le démarrage du serveur.

Ajouter le script dans `package.json` :

```json
"test": "jest"
```

#### 6.3 — Créer le workflow GitHub Actions

Créer `.github/workflows/staging.yml` à la racine du repo :

```yaml
name: CI + Deploy staging

on:
  push:
    branches:
      - staging

jobs:
  ci:
    name: Lint & Test
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: vps-monitor-app/package-lock.json

      - name: Install dependencies
        run: npm ci
        working-directory: vps-monitor-app

      - name: Lint
        run: npm run lint
        working-directory: vps-monitor-app

      - name: Test
        run: npm test
        working-directory: vps-monitor-app

  deploy:
    name: Deploy to VPS
    runs-on: ubuntu-latest
    needs: ci

    steps:
      - name: SSH deploy
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/VPS-monitor
            git pull origin staging
            cd /var/www
            docker-compose build vps-monitor
            docker-compose up -d vps-monitor
```

#### 6.4 — Configurer les secrets GitHub

Dans le repo GitHub → Settings → Secrets and variables → Actions, ajouter :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP ou domaine du VPS |
| `VPS_USER` | `rusty` |
| `VPS_SSH_KEY` | Clé SSH privée (contenu de `~/.ssh/id_rsa`) |

#### 6.5 — Créer la branche staging

```bash
git checkout -b staging
git push origin staging
```

Tout push sur `staging` déclenchera le pipeline. La branche `main` reste la branche stable.

---

## Phase 2 — Monitoring HTTP des applications web

### Étape 7 — Créer le service de vérification HTTP

- Créer `api/services/http.js` : liste des URLs à vérifier, fonction qui effectue un GET sur chacune avec timeout, retourne nom + URL + code HTTP + statut (OK / DOWN)

URLs à monitorer :

| Application | Chemin |
|---|---|
| TP Vue | `/B3dev-TP_VUE/` |
| SaintBarth Volley | `/saintbarthvolley/` |
| Lucky7 | `/lucky7/` |
| College La Boussole | `/collegelaboussole/` |
| Cinemap | `/cinemap/` |

### Étape 8 — Étendre l'endpoint `/api/status`

- Appeler `http.js` en parallèle avec `docker.js`
- Ajouter le champ `websites` dans la réponse JSON
- Calculer `globalStatus` : `"OK"` si tout est up, `"DEGRADED"` ou `"KO"` sinon

### Étape 9 — Mettre à jour le frontend

- Ajouter une section "Applications web" dans `index.html`
- Mettre à jour `app.js` pour afficher les statuts HTTP avec indicateurs visuels (vert/rouge)
- Afficher le nombre total de services OK / KO en en-tête

---

## Phase 3 — Actions sur les containers + Sécurité

### Étape 10 — Ajouter les actions Docker

- Ajouter `POST /api/container/restart` dans `server.js` : reçoit `{ "name": "container-name" }`, appelle dockerode pour redémarrer le container
- Ajouter (optionnel) `POST /api/container/stop` et `POST /api/container/start`
- Tester chaque action manuellement

### Étape 11 — Ajouter l'authentification

- Choisir une méthode simple : variable d'environnement pour login/password, middleware Express qui vérifie un header ou cookie de session
- Protéger toutes les routes `/api/*` et la page principale
- Stocker les credentials dans une variable d'environnement (ne pas hardcoder)
- Mettre à jour le `docker-compose.yml` pour passer les variables d'env

### Étape 12 — Mettre à jour le frontend pour les actions

- Ajouter un bouton "Restart" sur chaque carte container
- Envoyer le POST correspondant au clic, rafraîchir le statut après réponse
- Ajouter une page/formulaire de login si l'authentification est active

---

## Phase 4 — Intégration Nginx + Évolutions

### Étape 13 — Remplacer la homepage Nginx

Modifier la configuration Nginx existante pour rediriger `/` vers le container :

```nginx
location / {
    proxy_pass http://127.0.0.1:3020;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

Recharger Nginx : `nginx -t && nginx -s reload`

### Étape 14 — Tests de non-régression

- Vérifier que toutes les applications existantes sont toujours accessibles via leurs routes (`/saintbarthvolley/`, etc.)
- Vérifier que la homepage affiche bien le dashboard
- Simuler un container arrêté et vérifier l'affichage (statut rouge)
- Simuler un service HTTP down et vérifier l'affichage

### Étape 15 — Évolutions futures (optionnel)

À planifier selon les besoins :

- Alertes email quand un service tombe
- Historique d'uptime (stockage en fichier ou SQLite)
- Graphiques CPU / RAM via `dockerode.stats`
- Logs en temps réel via WebSocket
- Support multi-serveurs

