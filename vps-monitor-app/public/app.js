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

function renderGlobalStatus(status) {
  const el = document.getElementById('global-status');
  el.textContent = status;
  el.className = `badge ${status.toLowerCase()}`;
}

async function refresh() {
  try {
    const data = await fetchStatus();
    renderGlobalStatus(data.globalStatus);
    renderContainers(data.containers);
  } catch {
    renderGlobalStatus('KO');
  }
}

refresh();
setInterval(refresh, REFRESH_INTERVAL);
