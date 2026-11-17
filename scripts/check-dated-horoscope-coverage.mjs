import { SIGNS } from "./lib/public-horoscope-corpus.mjs";

const origin = "https://atuavidanosastros.com.br";
const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
const periods = ["daily", "weekly", "monthly"];
const requests = SIGNS.flatMap(([sign]) => periods.map((period) => ({ sign, period })));

async function read(path) {
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw Error(path + " returned HTTP " + response.status);
  return response;
}

function htmlText(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

const sitemap = await (await read("/sitemap-pages.xml")).text();
const listed = new Set(Array.from(sitemap.matchAll(/<loc>([^<]+)<\/loc>/g), ([, loc]) => loc));
const results = await Promise.allSettled(requests.map(async ({ sign, period }) => {
  const canonical = "/horoscopo/" + sign;
  const page = period === "daily" ? canonical : canonical + "?period=" + period;
  const api = await read("/api/free-tools/horoscopo?sign=" + sign + "&period=" + period);
  const { current } = await api.json();
  if (current?.sign !== sign || current.period !== period ||
      !(current.startDate <= today && today < current.endDateExclusive) ||
      current.readingPath !== page || !current.sections?.length) {
    throw Error(sign + "/" + period + ": missing current edition on " + today + " in São Paulo");
  }
  if (!listed.has(origin + canonical)) throw Error(canonical + " is absent from the pages sitemap");
  const html = await (await read(page)).text();
  const rendered = html.match(/<article class="current[^"]*"[^>]*>([\s\S]*?)<\/article>/)?.[1] ?? "";
  const paragraphs = current.sections.flatMap(({ paragraphs }) => paragraphs);
  if (!html.includes('rel="canonical" href="' + origin + canonical + '"') ||
      !paragraphs.length || !paragraphs.every((paragraph) => rendered.includes(htmlText(paragraph)))) {
    throw Error(sign + "/" + period + ": canonical or full reading missing from server-rendered HTML");
  }
}));

const failed = results.filter((result) => result.status === "rejected");
for (const result of failed) console.error(result.reason.message);
console.log(requests.length - failed.length + "/" + requests.length + " current editions verified on " + today + " in São Paulo");
if (failed.length) process.exitCode = 1;
