import { SIGNS } from "./lib/public-horoscope-corpus.mjs";

const origin = "https://atuavidanosastros.com.br";
const today = new Date().toISOString().slice(0, 10);
const periods = ["daily", "weekly", "monthly"];
const requests = SIGNS.flatMap(([sign]) => periods.map((period) => ({ sign, period })));

async function read(path) {
  const response = await fetch(`${origin}${path}`, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Error(`${path} returned HTTP ${response.status}`);
  return response;
}

const sitemap = await (await read("/sitemap-editorial.xml")).text();
const listed = new Set(Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), ([, loc]) => loc));
const results = await Promise.allSettled(requests.map(async ({ sign, period }) => {
  const api = await read(`/api/free-tools/horoscopo?sign=${sign}&period=${period}`);
  const { current } = await api.json();
  if (current?.sign !== sign || current.period !== period ||
      !(current.startDate <= today && today < current.endDateExclusive) ||
      !current.sections?.length) {
    throw Error(`${sign}/${period}: missing current edition on ${today} UTC`);
  }
  const article = `${origin}/horoscopo/${sign}/${period}/${current.startDate}`;
  if (article !== `${origin}${current.path}` || !listed.has(article)) {
    throw Error(`${sign}/${period}: current edition is absent from the editorial sitemap`);
  }
}));

const failed = results.filter((result) => result.status === "rejected");
for (const result of failed) console.error(result.reason.message);
console.log(`${requests.length - failed.length}/${requests.length} current editions in the public API and sitemap on ${today} UTC`);
if (failed.length) process.exitCode = 1;
