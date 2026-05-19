import { readFile, writeFile } from 'fs/promises';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCb);

const NGINX_CONFIG = process.env.NGINX_CONFIG || '/etc/nginx/sites-enabled/vps';

export async function testConfig() {
  try {
    const { stdout, stderr } = await execFile('/usr/sbin/nginx', ['-t']);
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    return { ok: false, output: (err.stdout ?? '') + (err.stderr ?? '') };
  }
}

export async function reload() {
  await execFile('/usr/sbin/nginx', ['-s', 'reload']);
}

export async function readConfig() {
  return readFile(NGINX_CONFIG, 'utf8');
}

export async function writeConfig(content) {
  await writeFile(NGINX_CONFIG, content, 'utf8');
}

export function parseApps(content) {
  const apps = [];
  const blockRegex = /location\s+(\/[^\s{]+)\s*\{([^}]+)\}/g;
  for (const match of content.matchAll(blockRegex)) {
    const path = match[1].trim();
    if (path === '/') continue;
    const portMatch = match[2].match(/proxy_pass\s+http:\/\/127\.0\.0\.1:(\d+)/);
    if (portMatch) apps.push({ path, port: parseInt(portMatch[1], 10) });
  }
  return apps;
}

export function parseConfigMeta(content) {
  const serverName = content.match(/server_name\s+([^;]+);/)?.[1].trim() ?? '127.0.0.1';
  const rootBlock = content.match(/location\s+\/\s*\{([^}]+)\}/)?.[1] ?? '';
  const rootPort = parseInt(
    rootBlock.match(/proxy_pass\s+http:\/\/127\.0\.0\.1:(\d+)/)?.[1] ?? '3020',
    10,
  );
  return { serverName, rootPort };
}

export async function addApp(path, port) {
  const content = await readConfig();
  const block = `
    location ${path} {
        proxy_pass http://127.0.0.1:${port}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }`;
  await writeConfig(content.trimEnd().replace(/\n\}$/, `\n${block}\n}`) + '\n');
}

export async function removeApp(path) {
  const content = await readConfig();
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const blockRegex = new RegExp(`\\n[ \\t]*location\\s+${escaped}\\s*\\{[\\s\\S]*?\\}`, 'g');
  await writeConfig(content.replace(blockRegex, ''));
}
