import { productDefinitionFor } from '@atv/domain';
import { visualExportPalette } from '../data/visual-v4-export';
import displayData from '../../../static/brand/fonts/bodoni-moda-variable.woff2?inline';
import bodyData from '../../../static/brand/fonts/newsreader-variable.woff2?inline';
import labelData from '../../../static/brand/fonts/onest-variable.woff2?inline';
import careerArt from '../../../static/brand/mvp/assets/revisao/bussola-gravada.webp?inline';
import careerDisplayData from '../../../static/brand/mvp/assets/newsreader-variable.woff2?inline';
import careerLabelData from '../../../static/brand/mvp/assets/onest-variable.woff2?inline';
import { mvpProductDesign } from '../data/mvp-visual';
import { parseProductRun, runLabels } from '../product-run';
import { productFactLabel } from '../product-fact-label';
import { careerCompassFactValue, careerCompassReaderLimits } from '../career-compass-fact-presentation';

export const WEB_EXPORT_VERSION = 'atv-web-export/1.4.0';
export const EXPORT_CSP =
	"default-src 'none'; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'";
const escape = (value: string) =>
	value.replace(
		/[&<>"']/g,
		(char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
	);

// Paper and ink from mvp-approved.css; the product-specific colors and composition
// come from the approved 27-product manifest shared with the web reader.
const careerPaper = { paper: '#f6efdf', light: '#fff8e9', ink: '#183746', rule: '#c7bfac' };

// Input must come from the owner RPC. Validation is not authentication or promotion.
export function renderProductWebExport(value: unknown) {
	const run = parseProductRun(value);
	const product = productDefinitionFor(run?.productId ?? '');
	if (!run?.released || !run.editorial || !run.calculation || !product?.delivery.includes('web'))
		return null;
	const { editorial, calculation } = run;
	const careerCompass = run.productId === 'career-compass';
	const careerDesign = mvpProductDesign('career-compass');
	const palette = careerCompass
		? { ink: careerDesign.ink, line: careerDesign.accent }
		: visualExportPalette(run.productId);
	const careerArtwork = careerDesign.art.replace(
		'/brand/mvp/assets/revisao/bussola-gravada.webp',
		careerArt
	);
	const readingHeading = careerCompass ? 'Sua Bússola de Carreira' : 'Sua leitura';
	const sourceHeading = careerCompass ? 'O que esta leitura considera' : 'Base e limites';
	const exportCsp = careerCompass ? `${EXPORT_CSP}; img-src data:` : EXPORT_CSP;
	// Standalone F09 presentation: no prototype data, scripts or external assets.
	const careerStyle = careerCompass
		? `
@font-face{font-family:CareerDisplay;src:url('${careerDisplayData}') format('woff2');font-weight:200 800}
@font-face{font-family:CareerLabel;src:url('${careerLabelData}') format('woff2');font-weight:100 900}
body.career-compass-export{background:${careerPaper.paper};color:${careerPaper.ink};font-family:CareerLabel,Arial,sans-serif;padding:0 24px 64px}
.career-compass-export main{max-width:1160px;display:grid;grid-template-columns:minmax(180px,220px) minmax(0,1fr);column-gap:clamp(32px,5vw,88px)}
.career-compass-export header{grid-column:1/-1;background:${careerPaper.light};border-top:6px solid ${careerDesign.ink};border-bottom:1px solid ${careerPaper.rule};margin:0 -24px;padding:52px 40px 44px;display:grid;grid-template-columns:minmax(0,1fr) 260px;gap:32px;align-items:center}
.career-compass-export header .career-cover{grid-column:1}
.career-compass-export header .career-art{grid-column:2;grid-row:1;width:260px}
.career-compass-export .product-art{position:relative;isolation:isolate;overflow:hidden;width:100%;aspect-ratio:600/440;background:${careerDesign.tint};color:${careerDesign.ink}}
.career-compass-export .pa-canvas{display:block;width:100%;height:100%;overflow:hidden}
.career-compass-export .pa-drawing{fill:none;stroke:${careerDesign.ink};stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round}
.career-compass-export .pa-paper{fill:#faf3e5;stroke:#b8a78d;stroke-width:.7;filter:drop-shadow(0 3px 2px #3a2b1d16)}
.career-compass-export .pa-engraving{pointer-events:none}
.career-compass-export .pa-drawing text{fill:${careerDesign.ink};stroke:none;text-anchor:middle;letter-spacing:2px;font-family:CareerDisplay,Georgia,serif;font-weight:500}
.career-compass-export .product-art-index{position:absolute;bottom:13px;right:17px;font:500 9px/1.5 CareerLabel,Arial,sans-serif;letter-spacing:.15em;opacity:.68}
.career-compass-export header h1,.career-compass-export h2,.career-compass-export h3{font-family:CareerDisplay,Georgia,serif;color:${careerPaper.ink}}
.career-compass-export header h1{font-size:clamp(42px,5vw,72px);line-height:1.05;max-width:18ch;margin:18px 0 24px}
.career-compass-export header .career-cover>p:nth-of-type(2){color:${careerDesign.ink};font:700 14px/1.5 CareerLabel,Arial,sans-serif;letter-spacing:.1em;text-transform:uppercase}
.career-compass-export .label,.career-compass-export small{font-family:CareerLabel,Arial,sans-serif;color:${careerDesign.ink};line-height:1.55}
.career-compass-export header .career-cover>p:last-child{max-width:68ch}
.career-compass-export nav{grid-column:1;grid-row:2/5;align-self:start;position:sticky;top:24px;margin-top:48px;border-top:4px solid ${careerDesign.ink};background:${careerDesign.tint};padding:24px 20px}
.career-compass-export nav ul{list-style:none;margin:0;padding:0}
.career-compass-export nav li+li{border-top:1px solid #C7BFAC}
.career-compass-export nav a{font:600 14px/1.4 CareerLabel,Arial,sans-serif;color:${careerPaper.ink};padding:14px 0}
.career-compass-export nav a:focus-visible{outline:3px solid #183746;outline-offset:4px}
.career-compass-export section,.career-compass-export footer{grid-column:2;max-width:68ch;width:100%}
.career-compass-export section{margin-top:48px}
.career-compass-export section h2{font-size:clamp(32px,3vw,43px);line-height:1.13;margin:0 0 28px}
.career-compass-export article{background:${careerPaper.light};border:1px solid ${careerPaper.rule};border-top:4px solid ${careerDesign.accent};margin:0 0 24px;padding:28px 32px}
.career-compass-export article .chapter-number{font:700 12px/1.5 CareerLabel,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${careerDesign.ink};margin:0 0 12px}
.career-compass-export article h3{font-size:clamp(28px,2.3vw,34px);line-height:1.16;margin:0 0 20px}
.career-compass-export article .text{font-family:CareerDisplay,Georgia,serif;font-size:20px;line-height:1.72;margin:0 0 20px}
.career-compass-export article .label{border-top:1px solid #C7BFAC;padding-top:14px;margin:0;font-size:13px}
.career-compass-export #origem,.career-compass-export #historico{border-top:1px solid #C7BFAC;padding-top:32px}
.career-compass-export #origem dl{background:#FFF8E9;border:1px solid #C7BFAC;padding:24px 32px;margin:0 0 24px}
.career-compass-export #origem dt{font-family:CareerLabel,Arial,sans-serif;color:${careerDesign.ink}}
.career-compass-export #origem dd{font-family:CareerDisplay,Georgia,serif;font-size:19px}
.career-compass-export #historico ol{padding-left:24px}
.career-compass-export footer{border-top:2px solid ${careerDesign.ink}}
@media(max-width:760px){.career-compass-export main{display:block}.career-compass-export header{padding:40px 24px;display:block}.career-compass-export header .career-art{width:min(100%,260px);margin:16px auto 0}.career-compass-export nav{position:static;margin-top:24px}.career-compass-export section{margin-top:40px}.career-compass-export article{padding:24px}}
@media print{body.career-compass-export{background:#fff;color:#183746;padding:0}.career-compass-export main{display:block;max-width:none}.career-compass-export header{margin:0;padding:0 0 18px;background:#fff;border-top:0}.career-compass-export nav{display:none}.career-compass-export section,.career-compass-export footer{max-width:68ch;margin-inline:auto}.career-compass-export section{margin-top:22px}.career-compass-export article{background:#fff;border:1px solid #C7BFAC;border-top:3px solid ${careerDesign.ink};padding:14px 18px;margin-bottom:14px}.career-compass-export article .text{font-size:12pt;line-height:1.45}.career-compass-export header h1{font-size:36pt}.career-compass-export section h2{font-size:23pt}.career-compass-export article h3{font-size:19pt}.career-compass-export #origem dl{background:#fff}}
`
		: '';
	const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${escape(exportCsp)}"><meta name="referrer" content="no-referrer"><meta name="robots" content="noindex,nofollow">
<meta name="generator" content="${WEB_EXPORT_VERSION}"><title>${escape(editorial.title)} — A Tua Vida nos Astros</title>
<style>
@font-face{font-family:ATVDisplay;src:url('${displayData}') format('woff2');font-weight:100 900}
@font-face{font-family:ATVBody;src:url('${bodyData}') format('woff2');font-weight:100 900}
@font-face{font-family:ATVLabel;src:url('${labelData}') format('woff2');font-weight:100 900}
:root{color-scheme:light;color:${palette.ink};background:#fcfbf8;font-family:ATVLabel,sans-serif}
*{box-sizing:border-box}body{margin:0;padding:48px 20px}main{max-width:720px;margin:auto;overflow-wrap:anywhere}
header{border-bottom:1px solid ${palette.line};padding-bottom:32px}h1,h2,h3{font-family:ATVDisplay,serif;font-weight:400;line-height:1.2}
h1{font-size:clamp(2.25rem,5vw,3.75rem);margin:24px 0}h2{font-size:2rem}h3{font-size:1.5rem}
p,li,dd{line-height:1.7}p.text,dd{white-space:pre-wrap}.text{font-family:ATVBody,serif;font-size:19px}
.label,small{color:${palette.ink};font-size:14px}section{margin-top:48px}article{margin:32px 0}dt{font-weight:600}dd{margin:8px 0 24px}small{display:block}
nav ul{padding-left:20px}a{color:inherit;text-underline-offset:4px;display:inline-block;padding:10px 0}a:focus-visible{outline:2px solid ${palette.ink};outline-offset:4px}
footer{border-top:1px solid ${palette.line};margin-top:48px;padding-top:24px}h2,h3,dt{break-after:avoid}p{orphans:3;widows:3}
@page{size:A4;margin:20mm}@media print{:root{background:white}body{padding:0}main{max-width:none}nav{display:none}a{color:inherit}section{margin-top:24px}}
${careerStyle}</style></head><body${careerCompass ? ' class="career-compass-export"' : ''}><main>
<header>${careerCompass ? '<div class="career-cover">' : ''}<p class="label">A Tua Vida nos Astros · Seu arquivo pessoal</p><p>${escape(product.name)}</p><h1>${escape(editorial.title)}</h1>
<p class="label">Cópia web da revisão ${run.revision}. Registro criado em ${escape(run.createdAt)}.</p>
<p>Arquivo pessoal para leitura offline. Proteja esta cópia: excluir ou revogar o registro na Biblioteca não apaga arquivos já baixados.</p>${careerCompass ? `</div><div class="career-art">${careerArtwork}</div>` : ''}</header>
<nav aria-label="Índice do relatório"><ul><li><a href="#leitura">${readingHeading}</a></li>${careerCompass ? editorial.sections.map((section, index) => `<li><a href="#capitulo-${index + 1}">${String(index + 1).padStart(2, '0')} · ${escape(section.title)}</a></li>`).join('') : ''}<li><a href="#origem">${sourceHeading}</a></li><li><a href="#historico">Histórico desta versão</a></li></ul></nav>
<section id="leitura" aria-labelledby="reading-title"><h2 id="reading-title">${readingHeading}</h2>${editorial.sections.map((section, index) => `<article${careerCompass ? ` id="capitulo-${index + 1}"` : ''}>${careerCompass ? `<p class="chapter-number">Capítulo ${String(index + 1).padStart(2, '0')}</p>` : ''}<h3>${escape(section.title)}</h3><p class="text">${escape(section.text)}</p><p class="label">${careerCompass ? 'Base desta parte' : 'Base'}: ${escape(section.evidence.map((id) => productFactLabel(run.productId, id)).join(' · '))}</p></article>`).join('')}</section>
<section id="origem" aria-labelledby="source-title"><h2 id="source-title">${sourceHeading}</h2>${careerCompass ? '<p>Esta leitura usa cálculos experimentais e propõe hipóteses para comparar com sua experiência. Confira os dados e os limites de precisão abaixo.</p>' : ''}<dl>${calculation.facts.map((fact) => `<dt>${escape(productFactLabel(run.productId, fact.id))}</dt><dd>${escape(careerCompass ? careerCompassFactValue(fact.id, fact.display) : fact.display)}${careerCompass ? '' : `<small>${escape(fact.source)}</small>`}</dd>`).join('')}</dl>
${careerCompass ? '<p>Os fatos calculados foram preservados no registro auditável desta versão. Os limites abaixo descrevem o alcance real do cálculo e da interpretação.</p>' : `<p>Método: ${escape(calculation.version)}. Edição: ${escape(editorial.version)}.</p>`}
${(careerCompass ? careerCompassReaderLimits(calculation.limits, editorial.limits) : [...calculation.limits, ...editorial.limits]).map((limit) => `<p class="text">${escape(limit)}</p>`).join('')}
</section>
<section id="historico" aria-labelledby="history-title"><h2 id="history-title">Histórico desta versão</h2><ol>${run.history.map((entry) => `<li>Revisão ${entry.revision} · ${escape(runLabels[entry.state])} · ${escape(entry.at)}</li>`).join('')}</ol></section>
<footer>${careerCompass ? `<p class="label">Bússola de Carreira · revisão ${run.revision}</p>` : `<p class="label">Registro: ${escape(run.id)}<br>Exportador: ${WEB_EXPORT_VERSION}<br>Revisão editorial: ${escape(editorial.reviewDigest)}</p>`}<p>Para recuperar o estado atual ou solicitar nova versão, entre na sua Biblioteca. Esta cópia não se atualiza automaticamente.</p></footer>
</main></body></html>`;
	return {
		html,
		filename: careerCompass
			? `atv-bussola-de-carreira-${run.createdAt.slice(0, 10)}-rev-${run.revision}.html`
			: `atv-${product.id}-${run.id}-r${run.revision}.html`
	};
}
