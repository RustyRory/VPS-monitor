const TIMEOUT_MS = 5000;

const WEBSITES = [
  { name: 'TP Vue',             path: '/B3dev-TP_VUE/' },
  { name: 'SaintBarth Volley',  path: '/saintbarthvolley/' },
  { name: 'Lucky7',             path: '/lucky7/' },
  { name: 'College La Boussole', path: '/collegelaboussole/' },
  { name: 'Cinemap',            path: '/cinemap/' },
];

async function checkWebsite(baseUrl, site) {
  const url = `${baseUrl}${site.path}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    return {
      name: site.name,
      url: site.path,
      httpCode: res.status,
      status: res.status === 200 ? 'OK' : 'DOWN',
    };
  } catch {
    return {
      name: site.name,
      url: site.path,
      httpCode: null,
      status: 'DOWN',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function checkWebsites(baseUrl) {
  return Promise.all(WEBSITES.map((site) => checkWebsite(baseUrl, site)));
}

module.exports = { checkWebsites };
