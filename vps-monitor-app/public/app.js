const REFRESH_INTERVAL = 5000;

async function fetchStatus() {
  const res = await fetch('/api/status');
  return res.json();
}

function renderContainers(containers) {
  const el = document.getElementById('containers');
  el.innerHTML = containers.map((c) => `
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
    </div>
  `).join('');
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
