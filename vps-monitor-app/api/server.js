import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getContainers, restartContainer, stopContainer, startContainer, streamContainerLogs } from './services/docker.js';
import { checkWebsites } from './services/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT           = process.env.PORT           || 3000;
const BASE_URL       = process.env.BASE_URL       || `http://localhost:${PORT}`;
const AUTH_USER      = process.env.AUTH_USER      || 'admin';
const AUTH_PASS      = process.env.AUTH_PASS      || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';

const app = express();

const sessionMiddleware = session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
});

app.use(express.json());
app.use(sessionMiddleware);

// --- Routes publiques ---

app.get('/', (req, res) => {
  if (req.session.authenticated) {
    return res.sendFile(join(__dirname, '../public/index.html'));
  }
  res.sendFile(join(__dirname, '../public/home.html'));
});

app.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === AUTH_USER && password === AUTH_PASS) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Identifiants incorrects' });
});

app.post('/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

// Fichiers statiques (style.css, app.js, login.html, home.html…)
// index.html n'est pas accessible directement — servi uniquement via GET /
app.use(express.static(join(__dirname, '../public')));

// --- Middleware auth pour l'API ---

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  res.status(401).json({ error: 'Non authentifié' });
}

// --- API (protégée) ---

app.get('/api/status', requireAuth, async (_req, res) => {
  try {
    const [containers, websites] = await Promise.all([
      getContainers(),
      checkWebsites(BASE_URL),
    ]);

    const allRunning = containers.every((c) => c.status === 'running');
    const allUp = websites.every((w) => w.status === 'OK');

    res.json({
      containers,
      websites,
      globalStatus: allRunning && allUp ? 'OK' : 'KO',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/container/restart', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await restartContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/container/stop', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await stopContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/container/start', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await startContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WebSocket : logs en temps réel ---

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  sessionMiddleware(req, {}, () => {
    if (!req.session.authenticated) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
});

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const name = url.searchParams.get('name');
  const tail = parseInt(url.searchParams.get('tail') || '200', 10);

  if (!name) {
    ws.close(1008, 'name requis');
    return;
  }

  let logStream = null;

  streamContainerLogs(name, tail,
    (data) => { if (ws.readyState === ws.OPEN) ws.send(data); },
    () => { if (ws.readyState === ws.OPEN) ws.close(); },
  ).then((stream) => {
    logStream = stream;
  }).catch((err) => {
    if (ws.readyState === ws.OPEN) ws.send(`Erreur: ${err.message}`);
    ws.close();
  });

  ws.on('close', () => {
    if (logStream) logStream.destroy();
  });
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(PORT, () => {
    console.log(`vps-monitor listening on ${BASE_URL}`);
  });
}
