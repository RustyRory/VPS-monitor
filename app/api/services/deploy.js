import { readFile, access } from 'fs/promises';
import { join } from 'path';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCb);

const REPO_ROOT = process.env.VPSCONFIG_PATH || '/var/www/vps-monitor';
const APPS_ROOT = '/var/www';

async function readRegistry() {
  const raw = await readFile(join(REPO_ROOT, 'apps.json'), 'utf8');
  return JSON.parse(raw);
}

function safeName(name) {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) throw new Error('Nom d\'app invalide');
  return name;
}

async function getComposeCwd(appPath) {
  const deploymentPath = join(appPath, 'deployment');
  try {
    await access(join(deploymentPath, 'docker-compose.yml'));
    return deploymentPath;
  } catch {
    return appPath;
  }
}

async function compose(appPath, ...args) {
  const cwd = await getComposeCwd(appPath);
  return execFile('docker', ['compose', ...args], { cwd });
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
    const { stdout } = await compose(appPath, 'ps', '--quiet');
    return { name, deployed: true, running: stdout.trim().length > 0 };
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

export async function cloneApp(name, url) {
  safeName(name);
  if (!/^https?:\/\//.test(url)) throw new Error('URL invalide');
  const appPath = join(APPS_ROOT, name);
  await execFile('git', ['clone', url, appPath]);
  await compose(appPath, 'up', '-d');
}

export async function updateApp(name) {
  safeName(name);
  const appPath = join(APPS_ROOT, name);
  await execFile('git', ['-C', appPath, 'pull']);
  await compose(appPath, 'up', '-d', '--build');
}
