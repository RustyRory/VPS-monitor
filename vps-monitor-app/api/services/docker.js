const Dockerode = require('dockerode');

const docker = new Dockerode({ socketPath: '/var/run/docker.sock' });

async function getContainers() {
  const containers = await docker.listContainers({ all: true });

  return containers.map((c) => {
    const uptimeSeconds = c.Status.match(/Up (\d+)/)?.[1] ?? null;

    return {
      name: c.Names[0].replace(/^\//, ''),
      status: c.State,
      image: c.Image,
      ports: [...new Set(c.Ports.map((p) =>
        p.PublicPort ? `${p.PublicPort}:${p.PrivatePort}` : `${p.PrivatePort}`
      ))],
      uptime: c.Status,
    };
  });
}

module.exports = { getContainers };
