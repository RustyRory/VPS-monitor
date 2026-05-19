const REFRESH_INTERVAL = 5000;

async function fetchStatus() {
  const res = await fetch('/api/status');
  if (res.status === 401) {
    window.location.href = '/login.html';
    return null;
  }
  return res.json();
}

async function containerAction(action, name) {
  const btn = document.querySelector(`[data-name="${name}"][data-action="${action}"]`);
  if (btn) {
    btn.disabled = true;
    btn.textContent = '...';
  }

  await fetch(`/api/container/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  await refresh();
}

let activeLogSocket = null;

async function showLogs(name) {
  if (activeLogSocket) {
    activeLogSocket.close();
    activeLogSocket = null;
  }

  const modal = document.getElementById('logs-modal');
  const title = document.getElementById('logs-title');
  const content = document.getElementById('logs-content');
  title.textContent = `Logs — ${name}`;
  content.textContent = 'Connexion…';
  modal.classList.remove('hidden');

  const tokenRes = await fetch('/api/ws-token');
  if (!tokenRes.ok) {
    content.textContent = 'Erreur: impossible d\'obtenir un token';
    return;
  }
  const { token } = await tokenRes.json();

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws/logs?name=${encodeURIComponent(name)}&tail=200&token=${token}`);
  activeLogSocket = ws;
  content.textContent = '';

  ws.onmessage = (e) => {
    content.textContent += e.data;
    content.scrollTop = content.scrollHeight;
  };

  ws.onerror = () => {
    content.textContent += '\n[Erreur WebSocket]';
  };

  ws.onclose = () => {
    content.textContent += '\n[Flux terminé]';
  };
}

function closeLogs() {
  if (activeLogSocket) {
    activeLogSocket.close();
    activeLogSocket = null;
  }
  document.getElementById('logs-modal').classList.add('hidden');
}

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
}

// --- Tabs ---

function showTab(id) {
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById(`tab-${id}`).classList.remove('hidden');
  document.querySelector(`.tab-btn[onclick="showTab('${id}')"]`).classList.add('active');
  if (id === 'configs') loadConfigs();
  if (id === 'deploy') loadDeploy();
}

// --- Configs ---

let currentConfigPath = null;

async function loadConfigs() {
  const res = await fetch('/api/config/files');
  if (res.status === 401) { window.location.href = '/login.html'; return; }
  const files = await res.json();
  const el = document.getElementById('config-files');
  if (!files.length) {
    el.innerHTML = '<li class="file-empty">Aucun fichier trouvé (dossiers nginx/ et apps/ absents)</li>';
    return;
  }
  el.innerHTML = files.map((f) => `<li class="file-item" onclick="openConfig('${f}')">${f}</li>`).join('');
}

async function openConfig(path) {
  currentConfigPath = path;
  document.getElementById('config-title').textContent = path;
  document.getElementById('config-save-status').textContent = '';
  const isNginx = path.startsWith('nginx/');
  document.getElementById('nginx-reload-btn').classList.toggle('hidden', !isNginx);

  const modal = document.getElementById('config-modal');
  const textarea = document.getElementById('config-content');
  textarea.value = 'Chargement…';
  modal.classList.remove('hidden');

  const res = await fetch(`/api/config/file?path=${encodeURIComponent(path)}`);
  if (!res.ok) { textarea.value = `Erreur: ${(await res.json()).error}`; return; }
  textarea.value = (await res.json()).content;
}

function closeConfig() {
  document.getElementById('config-modal').classList.add('hidden');
  currentConfigPath = null;
}

async function saveConfig() {
  if (!currentConfigPath) return;
  const content = document.getElementById('config-content').value;
  const statusEl = document.getElementById('config-save-status');
  statusEl.textContent = 'Sauvegarde…';

  const res = await fetch('/api/config/file', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentConfigPath, content }),
  });
  const data = await res.json();
  statusEl.textContent = res.ok ? '✅ Sauvegardé' : `❌ ${data.error}`;
}

async function nginxReload() {
  const statusEl = document.getElementById('config-save-status');
  statusEl.textContent = 'Test + rechargement…';
  const res = await fetch('/api/config/nginx/reload', { method: 'POST' });
  const data = await res.json();
  statusEl.textContent = res.ok ? '✅ Nginx rechargé' : `❌ Config invalide:\n${data.output}`;
}

// --- Deploy ---

async function loadDeploy() {
  const res = await fetch('/api/deploy/apps');
  if (res.status === 401) { window.location.href = '/login.html'; return; }
  renderDeployApps(await res.json());
}

function renderDeployApps(apps) {
  const el = document.getElementById('deploy-apps');
  if (!apps.length) {
    el.innerHTML = '<div class="file-empty">Aucune app définie dans apps/</div>';
    return;
  }
  el.innerHTML = apps.map((a) => `
    <div class="card">
      <div class="card-header">
        <span class="card-name">${a.name}</span>
        <span class="deploy-badge ${a.deployed ? (a.running ? 'running' : 'stopped') : 'absent'}">
          ${a.deployed ? (a.running ? 'running' : 'stopped') : 'absent'}
        </span>
      </div>
      <div class="card-actions">
        ${a.deployed
          ? `<button onclick="updateDeployApp('${a.name}', this)">Mettre à jour</button>`
          : `<button onclick="promptClone('${a.name}')">Déployer</button>`
        }
      </div>
    </div>
  `).join('');
}

async function updateDeployApp(name, btn) {
  btn.disabled = true;
  btn.textContent = '…';
  const res = await fetch('/api/deploy/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  btn.textContent = res.ok ? '✅' : '❌';
  setTimeout(() => loadDeploy(), 1500);
}

function promptClone(name) {
  document.getElementById('clone-name').value = name;
  document.getElementById('clone-url').focus();
  document.getElementById('clone-url').scrollIntoView({ behavior: 'smooth' });
}

async function cloneNewApp() {
  const name = document.getElementById('clone-name').value.trim();
  const url = document.getElementById('clone-url').value.trim();
  const statusEl = document.getElementById('clone-status');
  if (!name || !url) { statusEl.textContent = '❌ Nom et URL requis'; return; }

  statusEl.textContent = `Déploiement de ${name}…`;
  const res = await fetch('/api/deploy/clone', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, url }),
  });
  const data = await res.json();
  statusEl.textContent = res.ok ? `✅ ${name} déployé` : `❌ ${data.error}`;
  if (res.ok) {
    document.getElementById('clone-name').value = '';
    document.getElementById('clone-url').value = '';
    loadDeploy();
  }
}

function renderContainers(containers) {
  const el = document.getElementById('containers');
  el.innerHTML = containers.map((c) => {
    const isRunning = c.status === 'running';
    return `
      <div class="card">
        <div class="card-header">
          <span class="card-name">${c.name}</span>
          <span class="dot ${c.status}" title="${c.status}"></span>
        </div>
        <div class="card-meta">
          <div>${c.image}</div>
          <div>${c.uptime}</div>
          <div>${c.ports.join(', ') || '—'}</div>
        </div>
        <div class="card-actions">
          ${isRunning ? `
            <button data-name="${c.name}" data-action="restart" onclick="containerAction('restart', '${c.name}')">Restart</button>
            <button data-name="${c.name}" data-action="stop" onclick="containerAction('stop', '${c.name}')">Stop</button>
          ` : `
            <button data-name="${c.name}" data-action="start" onclick="containerAction('start', '${c.name}')">Start</button>
          `}
          <button onclick="showLogs('${c.name}')">Logs</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderWebsites(websites) {
  const el = document.getElementById('websites');
  el.innerHTML = websites.map((w) => `
    <div class="card">
      <div class="card-header">
        <span class="card-name">${w.name}</span>
        <span class="dot ${w.status === 'OK' ? 'running' : 'exited'}" title="${w.status}"></span>
      </div>
      <div class="card-meta">
        <div>${w.url}</div>
        <div>HTTP ${w.httpCode ?? 'timeout'}</div>
      </div>
      <div class="card-actions">
        <a class="card-link" href="${w.url}" target="_blank" rel="noopener">Ouvrir →</a>
      </div>
    </div>
  `).join('');
}

function renderGlobalStatus(status) {
  const el = document.getElementById('global-status');
  el.textContent = status;
  el.className = `badge ${status.toLowerCase()}`;
}

function renderSummary(containers, websites) {
  const all = [
    ...containers.map((c) => c.status === 'running'),
    ...websites.map((w) => w.status === 'OK'),
  ];
  const ok = all.filter(Boolean).length;
  const ko = all.length - ok;
  const el = document.getElementById('summary');
  el.innerHTML = `<span class="ok-count">${ok} OK</span> / <span class="ko-count">${ko} KO</span>`;
}

async function refresh() {
  try {
    const data = await fetchStatus();
    if (!data) return;
    renderGlobalStatus(data.globalStatus);
    renderSummary(data.containers, data.websites);
    renderContainers(data.containers);
    renderWebsites(data.websites);
  } catch {
    renderGlobalStatus('KO');
  }
}

refresh();
setInterval(refresh, REFRESH_INTERVAL);
