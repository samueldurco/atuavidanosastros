import { chromium } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(
	new URL('../static/brand/mvp/assets/revisao/bussola-gravada.webp', import.meta.url)
);
const output = fileURLToPath(
	new URL('../static/brand/mvp/assets/revisao/bussola-gravada-pdf.png', import.meta.url)
);
const manifest = JSON.parse(
	await readFile(
		fileURLToPath(new URL('../src/lib/data/mvp-product-design.json', import.meta.url)),
		'utf8'
	)
);
if (!manifest['career-compass']?.art.includes('/brand/mvp/assets/revisao/bussola-gravada.webp')) {
	throw new Error('A gravura aprovada da Bússola mudou no manifesto MVP.');
}

// pdf-lib accepts PNG, while the approved product engraving is distributed as WebP.
// Keep the WebP as source and regenerate this lossless derivative when it changes.
const browser = await chromium.launch();
try {
	const page = await browser.newPage();
	const webp = await readFile(source);
	const pngBase64 = await page.evaluate(
		async (url) => {
			const image = new Image();
			image.src = url;
			await image.decode();
			const canvas = document.createElement('canvas');
			canvas.width = image.naturalWidth;
			canvas.height = image.naturalHeight;
			const context = canvas.getContext('2d');
			if (!context) throw new Error('Canvas 2D indisponível.');
			context.drawImage(image, 0, 0);
			return canvas.toDataURL('image/png').split(',')[1];
		},
		`data:image/webp;base64,${webp.toString('base64')}`
	);
	await writeFile(output, Buffer.from(pngBase64, 'base64'));
	console.log(output);
} finally {
	await browser.close();
}
