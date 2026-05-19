import { readFile, writeFile } from 'fs/promises';
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

