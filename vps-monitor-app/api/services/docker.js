import Dockerode from 'dockerode';

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

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
