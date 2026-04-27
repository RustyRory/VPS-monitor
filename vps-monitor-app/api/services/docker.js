import Dockerode from 'dockerode';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

async function getContainer(name) {
  const containers = await docker.listContainers({ all: true });
  const found = containers.find((c) => c.Names.includes(`/${name}`));
  if (!found) throw new Error(`Container "${name}" introuvable`);
  return docker.getContainer(found.Id);
}

export async function restartContainer(name) {
  const container = await getContainer(name);
  await container.restart();
}

export async function stopContainer(name) {
  const container = await getContainer(name);
  await container.stop();
}

export async function startContainer(name) {
  const container = await getContainer(name);
  await container.start();
}

export async function getContainers() {
  const containers = await docker.listContainers({ all: true });

  return containers.map((c) => ({
    name: c.Names[0].replace(/^\//, ''),
    status: c.State,
    image: c.Image,
    ports: [...new Set(c.Ports.map((p) =>
      p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`
    ))],
    uptime: c.Status,
  }));
}
