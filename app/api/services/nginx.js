import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';

const execFile = promisify(execFileCb);

export async function testConfig() {
  try {
    const { stdout, stderr } = await execFile('sudo', ['/usr/sbin/nginx', '-t']);
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    return { ok: false, output: err.stdout + err.stderr };
  }
}

export async function reload() {
  await execFile('sudo', ['/bin/systemctl', 'reload', 'nginx']);
}
