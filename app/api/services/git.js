import { readFile, writeFile, readdir } from 'fs/promises';
import { join, normalize } from 'path';
import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCb);

const REPO_ROOT = process.env.VPSCONFIG_PATH || '/var/www/vps-monitor';

function safePath(relativePath) {
  const abs = normalize(join(REPO_ROOT, relativePath));
  if (!abs.startsWith(REPO_ROOT + '/')) {
    throw new Error('Chemin non autorisé');
  }
  return abs;
}

function git(...args) {
  return execFile('git', ['-C', REPO_ROOT, ...args]);
}

export async function getFileContent(relativePath) {
  return readFile(safePath(relativePath), 'utf8');
}

export async function writeAndCommit(relativePath, content) {
  await writeFile(safePath(relativePath), content, 'utf8');
  await git('add', relativePath);
  await git('commit', '-m', `chore(config): update ${relativePath}`);
  await git('push');
}

export async function listEditableFiles() {
  const files = [];

  try {
    const entries = await readdir(join(REPO_ROOT, 'nginx', 'sites-enabled'));
    for (const entry of entries) {
      files.push(`nginx/sites-enabled/${entry}`);
    }
  } catch {
    // dossier absent
  }

  try {
    const apps = await readdir(join(REPO_ROOT, 'apps'));
    for (const app of apps) {
      const rel = `apps/${app}/docker-compose.yml`;
      try {
        await readFile(join(REPO_ROOT, rel));
        files.push(rel);
      } catch {
        // pas de compose pour cette app
      }
    }
  } catch {
    // dossier absent
  }

  return files;
}
