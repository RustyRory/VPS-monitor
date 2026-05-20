import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import { addInclude, getFirstServiceName, composeUp, composeRebuild, composeIsRunning } from './compose.js';

const execFile = promisify(execFileCb);

const REPO_ROOT = process.env.VPSCONFIG_PATH || '/var/www/vps-monitor';
const APPS_ROOT = process.env.APPS_ROOT || '/var/www';

async function readRegistry() {
  const raw = await readFile(join(REPO_ROOT, 'apps.json'), 'utf8');
  return JSON.parse(raw);
}

async function writeRegistry(apps) {
  await writeFile(join(REPO_ROOT, 'apps.json'), JSON.stringify(apps, null, 2) + '\n', 'utf8');
}

function safeName(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Nom d\'app invalide');
  return name;
}

export async function getAppStatus(name) {
  safeName(name);
  const appPath = join(APPS_ROOT, name);

  try {
    await access(appPath);
  } catch {
    return { name, deployed: false, running: false };
  }

  try {
    const service = await getFirstServiceName(name);
    const running = await composeIsRunning(service);
    return { name, deployed: true, running };
  } catch {
    return { name, deployed: true, running: false };
  }
}

export async function listApps() {
  try {
    const registry = await readRegistry();
    return Promise.all(registry.map(({ name }) => getAppStatus(name)));
  } catch {
    return [];
  }
}

export async function cloneApp(name, url, nginxPath, nginxPort) {
  safeName(name);
  if (!/^https?:\/\//.test(url)) throw new Error('URL invalide');

  const appPath = join(APPS_ROOT, name);
  await execFile('git', ['clone', url, appPath]);

  const service = await getFirstServiceName(name);

  const registry = await readRegistry().catch(() => []);
  const entry = { name, url, service };
  if (nginxPath && nginxPort) { entry.nginxPath = nginxPath; entry.port = nginxPort; }
  registry.push(entry);
  await writeRegistry(registry);

  await addInclude(name);
  await composeUp(service);
}

export async function updateApp(name) {
  safeName(name);
  const appPath = join(APPS_ROOT, name);
  await execFile('git', ['-C', appPath, 'pull']);
  const service = await getFirstServiceName(name);
  await composeRebuild(service);
}
