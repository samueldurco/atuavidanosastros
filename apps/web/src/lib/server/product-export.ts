import { productCatalog } from '@atv/domain';
import { parseProductRun, runLabels } from '../product-run';

export const WEB_EXPORT_VERSION = 'atv-web-export/1.0.0';
export const EXPORT_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'";
const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
	);

// Input must come from the owner RPC. Validation is not authentication or promotion.
export function renderProductWebExport(value: unknown) {
	const run = parseProductRun(value);
	const product = productCatalog.find((entry) => entry.id === run?.productId);
	if (!run?.released || !run.editorial || !run.calculation || !product?.delivery.includes('web'))
		return null;
	const { editorial, calculation } = run;
	const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${escape(EXPORT_CSP)}"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow">
<meta name="generator" content="${WEB_EXPORT_VERSION}"><title>${escape(editorial.title)} — A Tua Vida nos Astros</title>
<style>
:root{color-scheme:light;color:#0b1635;background:#fcfbf8;font-family:"Segoe UI",sans-serif}
*{box-sizing:border-box}body{margin:0;padding:48px 20px}main{max-width:720px;margin:auto;overflow-wrap:anywhere}
header{border-bottom:1px solid #e4e8ef;padding-bottom:32px}h1,h2,h3{font-family:Georgia,serif;font-weight:400;line-height:1.2}
h1{font-size:clamp(2.25rem,5vw,3.75rem);margin:24px 0}h2{font-size:2rem}h3{font-size:1.5rem}
p,li,dd{line-height:1.7}p.text,dd{white-space:pre-wrap}.text{font-family:Georgia,serif;font-size:19px}
.label,small{color:#526079;font-size:14px}section{margin-top:48px}article{margin:32px 0}dt{font-weight:600}dd{margin:8px 0 24px}small{display:block}
nav ul{padding-left:20px}a{color:#073f87;text-underline-offset:4px;display:inline-block;padding:10px 0}a:focus-visible{outline:2px solid #3176c2;outline-offset:4px}
footer{border-top:1px solid #e4e8ef;margin-top:48px;padding-top:24px}h2,h3,dt{break-after:avoid}p{orphans:3;widows:3}
@page{size:A4;margin:20mm}@media print{:root{background:white}body{padding:0}main{max-width:none}nav{display:none}a{color:inherit}section{margin-top:24px}}
</style></head><body><main>
<header><p class="label">A Tua Vida nos Astros · Seu arquivo pessoal</p><p>${escape(product.name)}</p><h1>${escape(editorial.title)}</h1>
<p class="label">Cópia web da revisão ${run.revision}. Registro criado em ${escape(run.createdAt)}.</p>
<p>Arquivo pessoal para leitura offline. Proteja esta cópia: excluir ou revogar o registro na Biblioteca não apaga arquivos já baixados.</p></header>
<nav aria-label="Índice do relatório"><ul><li><a href="#leitura">Sua leitura</a></li><li><a href="#origem">Base e limites</a></li><li><a href="#historico">Histórico desta versão</a></li></ul></nav>
<section id="leitura" aria-labelledby="reading-title"><h2 id="reading-title">Sua leitura</h2>${editorial.sections.map((section) => `<article><h3>${escape(section.title)}</h3><p class="text">${escape(section.text)}</p><p class="label">Base: ${escape(section.evidence.join(' · '))}</p></article>`).join('')}</section>
<section id="origem" aria-labelledby="source-title"><h2 id="source-title">Base e limites</h2><dl>${calculation.facts.map((fact) => `<dt>${escape(fact.id)}</dt><dd>${escape(fact.display)}<small>${escape(fact.source)}</small></dd>`).join('')}</dl>
<p>Método: ${escape(calculation.version)}. Edição: ${escape(editorial.version)}.</p>
${[...calculation.limits, ...editorial.limits].map((limit) => `<p class="text">${escape(limit)}</p>`).join('')}
<p>Esta leitura é simbólica e não determina suas escolhas. Não substitui orientação profissional.</p></section>
<section id="historico" aria-labelledby="history-title"><h2 id="history-title">Histórico desta versão</h2><ol>${run.history.map((entry) => `<li>Revisão ${entry.revision} · ${escape(runLabels[entry.state])} · ${escape(entry.at)}</li>`).join('')}</ol></section>
<footer><p class="label">Registro: ${escape(run.id)}<br>Exportador: ${WEB_EXPORT_VERSION}<br>Revisão editorial: ${escape(editorial.reviewDigest)}</p><p>Para recuperar o estado atual ou solicitar nova versão, entre na sua Biblioteca. Esta cópia não se atualiza automaticamente.</p></footer>
</main></body></html>`;
	return { html, filename: `atv-${product.id}-${run.id}-r${run.revision}.html` };
}
