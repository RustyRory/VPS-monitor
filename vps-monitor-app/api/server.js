import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getContainers, restartContainer, stopContainer, startContainer } from './services/docker.js';
import { checkWebsites } from './services/http.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PORT       = process.env.PORT        || 3000;
const BASE_URL   = process.env.BASE_URL    || `http://localhost:${PORT}`;
const AUTH_USER  = process.env.AUTH_USER   || 'admin';
const AUTH_PASS  = process.env.AUTH_PASS   || 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'change-me';

const app = express();

app.use(express.json());
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
}));

// --- Auth routes (publiques) ---

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

// --- Middleware auth ---

function requireAuth(req, res, next) {
  if (req.session.authenticated) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Non authentifié' });
  res.redirect('/login.html');
}

// Fichiers statiques publics (login.html, style.css)
app.use(express.static(join(__dirname, '../public')));

// Toutes les routes suivantes sont protégées
app.use(requireAuth);

// Redirige / vers index.html (déjà servi en statique, mais protégé via middleware)
app.get('/', (_req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});

// --- API ---

app.get('/api/status', async (_req, res) => {
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

app.post('/api/container/restart', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await restartContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/container/stop', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await stopContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/container/start', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name requis' });
  try {
    await startContainer(name);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  app.listen(PORT, () => {
    console.log(`vps-monitor listening on ${BASE_URL}`);
  });
}
