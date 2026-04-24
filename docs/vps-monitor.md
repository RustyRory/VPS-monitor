# Cahier des charges — Web App de Monitoring VPS (version optimisée)

## Contexte

Le projet consiste à développer une application web de monitoring pour un VPS multi-applications basé sur :

- Docker (`docker-compose`)
- Reverse proxy Nginx
- Plusieurs applications (Node.js, Next.js, PHP, MongoDB)

Actuellement, une page statique (`/var/www/home/index.html`) sert de homepage.

Elle doit être remplacée par une application dynamique de supervision.

## Objectifs

### Objectif principal

Mettre en place une interface web permettant de :

- Superviser l’état des containers Docker
- Vérifier la disponibilité des applications web
- Centraliser les informations techniques

### Objectifs secondaires

- Remplacer la homepage actuelle
- Minimiser la consommation de ressources
- Simplifier la maintenance

## Utilisateurs

### Utilisateur cible

- Administrateur du VPS

### Contraintes UX

- Interface rapide à lire
- Pas besoin d’UX complexe ou grand public

## Périmètre fonctionnel

### Monitoring Docker

L’application doit :

- Lister tous les containers Docker
- Afficher pour chacun :
    - Nom
    - Statut (`running`, `exited`, `restarting`)
    - Ports exposés
    - Uptime
    - Image Docker

États visuels

- 🟢 Running
- 🔴 Stopped / Exited
- 🟡 Restarting

### Monitoring HTTP (via Nginx)

L’application doit vérifier la disponibilité des routes exposées :

| Application | URL |
| --- | --- |
| TP Vue | `/B3dev-TP_VUE/` |
| SaintBarth Volley | `/saintbarthvolley/` |
| Lucky7 | `/lucky7/` |
| College La Boussole | `/collegelaboussole/` |
| Cinemap | `/cinemap/` |

Vérifications

- Code HTTP (200 attendu)
- Timeout / erreur

États visuels

- 🟢 OK
- 🔴 DOWN

### Dashboard global

L’interface doit afficher :

- Statut global du VPS
- Nombre de services OK / KO
- Vue synthétique + détaillée

Rafraîchissement automatique

- Fréquence : toutes les 5 à 10 secondes
- Mise à jour sans rechargement de page

### Actions (optionnel mais recommandé)

- Restart un container
- Stop / Start un container

## Architecture technique

### Vue globale simplifiée

```
Frontend statique (HTML + JS)
        ↓
Backend API (Node.js)
        ↓
Docker socket + HTTP checks
```

### Backend

Technologie

- Node.js + Express

Responsabilités

- Interroger Docker via socket
- Vérifier les endpoints HTTP
- Fournir une API REST
- Servir les fichiers frontend statiques

Accès Docker

Montage obligatoire :

```
/var/run/docker.sock
```

### Frontend (choix optimisé)

Le frontend doit être :

- Sans framework (pas React / Vue)
- Ultra léger
- Sans build

Stack

- HTML
- CSS
- JavaScript vanilla

### Structure projet

```
vps-monitor/
├── api/
│   ├── server.js
│   └── services/
├── public/
│   ├── index.html
│   ├── app.js
│   └── style.css
```

### Déploiement Docker

Un seul service suffit :

```
vps-monitor:
  build: ./vps-monitor
  container_name: vps-monitor
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  ports:
    -"3020:3000"
  restart: unless-stopped
```

### API (spécifications)

#### GET `/api/status`

Retour :

```
{
  "containers": [
    {
      "name":"sbv-api",
      "status":"running",
      "ports": ["3006:5000"]
    }
  ],
  "websites": [
    {
      "name":"saintbarth",
      "url":"/saintbarthvolley/",
      "status":200
    }
  ],
  "globalStatus":"OK"
}
```

#### POST `/api/container/restart`

```
{
  "name":"sbv-api"
}
```

## Intégration Nginx

### Objectif

Remplacer la homepage actuelle.

### Nouvelle configuration

```
location / {
    proxy_pass http://127.0.0.1:3020;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Sécurité

### Obligatoire

- Authentification simple (login / password)

### Risques

- Accès au socket Docker = contrôle total du serveur

## UX / UI

### Contraintes

- Interface simple
- Lecture rapide
- Aucune complexité inutile

### Éléments

- Cartes par service
- Couleurs (vert / rouge / orange)
- Mise à jour automatique
- Indicateur global

## Performance

### Objectifs

- Interface instantanée
- Très faible consommation RAM/CPU
- Aucun build frontend

## Évolutions futures

- Alertes (Discord / email)
- Historique uptime
- Graphiques CPU / RAM
- Logs en temps réel
- Multi-serveurs

## Tests

- Container arrêté
- Service HTTP indisponible
- Restart container
- Vérification Nginx

## Livrables

- Backend Node.js
- Frontend statique
- Configuration Docker
- Configuration Nginx
- Documentation

## Roadmap

### Phase 1 (MVP)

- API Docker
- Endpoint `/status`
- Front simple HTML

### Phase 2

- Monitoring HTTP
- UI améliorée

### Phase 3

- Actions (restart)
- Sécurité

### Phase 4

- Alertes / métriques