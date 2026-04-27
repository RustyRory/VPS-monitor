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

### Étape 6 — CI CD



---

## Phase 2 — Monitoring HTTP des applications web

### Étape 6 — Créer le service de vérification HTTP

- Créer `api/services/http.js` : liste des URLs à vérifier, fonction qui effectue un GET sur chacune avec timeout, retourne nom + URL + code HTTP + statut (OK / DOWN)

URLs à monitorer :

| Application | Chemin |
|---|---|
| TP Vue | `/B3dev-TP_VUE/` |
| SaintBarth Volley | `/saintbarthvolley/` |
| Lucky7 | `/lucky7/` |
| College La Boussole | `/collegelaboussole/` |
| Cinemap | `/cinemap/` |

### Étape 7 — Étendre l'endpoint `/api/status`

- Appeler `http.js` en parallèle avec `docker.js`
- Ajouter le champ `websites` dans la réponse JSON
- Calculer `globalStatus` : `"OK"` si tout est up, `"DEGRADED"` ou `"KO"` sinon

### Étape 8 — Mettre à jour le frontend

- Ajouter une section "Applications web" dans `index.html`
- Mettre à jour `app.js` pour afficher les statuts HTTP avec indicateurs visuels (vert/rouge)
- Afficher le nombre total de services OK / KO en en-tête

---

## Phase 3 — Actions sur les containers + Sécurité

### Étape 9 — Ajouter les actions Docker

- Ajouter `POST /api/container/restart` dans `server.js` : reçoit `{ "name": "container-name" }`, appelle dockerode pour redémarrer le container
- Ajouter (optionnel) `POST /api/container/stop` et `POST /api/container/start`
- Tester chaque action manuellement

### Étape 10 — Ajouter l'authentification

- Choisir une méthode simple : variable d'environnement pour login/password, middleware Express qui vérifie un header ou cookie de session
- Protéger toutes les routes `/api/*` et la page principale
- Stocker les credentials dans une variable d'environnement (ne pas hardcoder)
- Mettre à jour le `docker-compose.yml` pour passer les variables d'env

### Étape 11 — Mettre à jour le frontend pour les actions

- Ajouter un bouton "Restart" sur chaque carte container
- Envoyer le POST correspondant au clic, rafraîchir le statut après réponse
- Ajouter une page/formulaire de login si l'authentification est active

---

## Phase 4 — Intégration Nginx + Évolutions

### Étape 12 — Remplacer la homepage Nginx

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

### Étape 13 — Tests de non-régression

- Vérifier que toutes les applications existantes sont toujours accessibles via leurs routes (`/saintbarthvolley/`, etc.)
- Vérifier que la homepage affiche bien le dashboard
- Simuler un container arrêté et vérifier l'affichage (statut rouge)
- Simuler un service HTTP down et vérifier l'affichage

### Étape 14 — Évolutions futures (optionnel)

À planifier selon les besoins :

- Alertes Discord / email quand un service tombe
- Historique d'uptime (stockage en fichier ou SQLite)
- Graphiques CPU / RAM via `dockerode.stats`
- Logs en temps réel via WebSocket
- Support multi-serveurs

---

## Récapitulatif des livrables par phase

| Phase | Livrable |
|---|---|
| 1 | Backend Node.js + Frontend HTML + Dockerfile + intégration docker-compose |
| 2 | Service HTTP checks + endpoint `/api/status` complet + UI mise à jour |
| 3 | Actions restart/stop/start + authentification login/password |
| 4 | Config Nginx + tests + documentation finale |
