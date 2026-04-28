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

async function logout() {
  await fetch('/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
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
