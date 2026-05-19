import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getContainers, restartContainer, stopContainer, startContainer, streamContainerLogs } from './services/docker.js';
import { checkWebsites } from './services/http.js';
import { listEditableFiles, getFileContent, writeAndCommit } from './services/git.js';
import { testConfig, reload as reloadNginx } from './services/nginx.js';
import { listApps, cloneApp, updateApp, getAppStatus } from './services/deploy.js';

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

// --- API Config (protégée) ---

app.get('/api/config/files', requireAuth, async (_req, res) => {
  try {
    res.json(await listEditableFiles());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/config/file', requireAuth, async (req, res) => {
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: 'path requis' });
  try {
    res.json({ content: await getFileContent(path) });
  } catch (err) {
    res.status(err.message === 'Chemin non autorisé' ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/config/file', requireAuth, async (req, res) => {
  const { path, content } = req.body;
  if (!path || content === undefined) return res.status(400).json({ error: 'path et content requis' });
  try {
    await writeAndCommit(path, content);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.message === 'Chemin non autorisé' ? 403 : 500).json({ error: err.message });
  }
});

app.post('/api/config/nginx/reload', requireAuth, async (_req, res) => {
  try {
    const test = await testConfig();
    if (!test.ok) return res.status(422).json({ ok: false, output: test.output });
    await reloadNginx();
    res.json({ ok: true, output: test.output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- API Deploy (protégée) ---

app.get('/api/deploy/apps', requireAuth, async (_req, res) => {
  try {
    res.json(await listApps());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/deploy/status/:app', requireAuth, async (req, res) => {
  try {
    res.json(await getAppStatus(req.params.app));
  } catch (err) {
    res.status(err.message === 'Nom d\'app invalide' ? 400 : 500).json({ error: err.message });
  }
});

app.post('/api/deploy/clone', requireAuth, async (req, res) => {
  const { name, url } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name et url requis' });
  try {
    await cloneApp(name, url);
    res.json({ ok: true });
  } catch (err) {
    const status = ['Nom d\'app invalide', 'URL invalide'].includes(err.message) ? 400 : 500;
    res.status(status).json({ error: err.message });
  }
});

app.post('/api/deploy/update', requireAuth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await updateApp(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(err.message === 'Nom d\'app invalide' ? 400 : 500).json({ error: err.message });
  }
});

// --- WebSocket : logs en temps réel ---

const wsTokens = new Map();

app.get('/api/ws-token', requireAuth, (_req, res) => {
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  wsTokens.set(token, Date.now() + 30_000);
  res.json({ token });
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://localhost');
  const token = url.searchParams.get('token');
  const expiry = token && wsTokens.get(token);

  if (!expiry || Date.now() > expiry) {
    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    socket.destroy();
    return;
  }
  wsTokens.delete(token);

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
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
