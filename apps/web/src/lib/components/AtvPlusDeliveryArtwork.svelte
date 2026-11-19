<script lang="ts">
	import { mvpArt } from '$lib/data/mvp-visual';
	let {
		planId = 'essencial',
		mode = 'bundle'
	}: { planId?: string; mode?: 'bundle' | 'solar' | 'inside' | 'plan' } = $props();
	const editions: Record<string, { title: string; art: string; cadence: string }> = {
		essencial: {
			title: 'Seu horóscopo pessoal',
			art: 'lua-gravada',
			cadence: 'A cada quinze dias'
		},
		ampliado: { title: 'Trânsitos & Tarot', art: 'fases-lunares', cadence: 'Semanal + mensal' },
		premium: {
			title: 'Seu período, em profundidade',
			art: 'saturno-gravado',
			cadence: 'Toda semana'
		}
	};
	const edition = $derived(editions[planId] ?? editions.essencial);
</script>

<div class={`delivery-art art-${mode}`} aria-hidden="true" data-atv-plus-art={mode}>
	<span class="orbit orbit-one"></span><span class="orbit orbit-two"></span>
	{#if mode === 'inside'}
		<div class="inside-spread">
			<div class="spread-page spread-illustration">
				<span class="imprint">ATV+ · LEITURA DO PERÍODO</span>
				<img src={mvpArt(edition.art)} alt="" width="240" height="240" loading="lazy" />
				<span class="spread-heading">{edition.title}</span>
				<span class="page-foot">A Tua Vida nos Astros · 01</span>
			</div>
			<div class="spread-page spread-content">
				<span class="imprint">POR DENTRO DA LEITURA</span>
				<span class="chapter-number">01 / O período</span>
				<span class="spread-heading">Um tempo<br />para observar.</span>
				<p>Uma leitura pessoal, organizada por período, com temas e datas para acompanhar.</p>
				<div class="date-mark"><span>SEU CALENDÁRIO</span><strong>{edition.cadence}</strong></div>
				<div class="reading-lines"><i></i><i></i><i></i><i></i></div>
				<span class="page-foot">Apresentação ilustrativa · 02</span>
			</div>
		</div>
	{:else}
		{#if mode === 'bundle'}
			<div class="folio rear-folio">
				<span class="imprint">ATVNA · SUA PRIMEIRA ENTREGA</span>
				<img
					src="/brand/mvp/assets/product-final/sol-gravado-v1.webp"
					alt=""
					width="240"
					height="240"
				/>
				<span class="folio-title">Sua próxima<br />Revolução Solar</span>
				<span class="page-foot">O ano de um aniversário ao outro</span>
			</div>
		{/if}
		<div class="folio main-folio">
			<span class="imprint">A TUA VIDA NOS ASTROS <span>ATV+</span></span>
			<img
				src={mode === 'solar'
					? '/brand/mvp/assets/product-final/sol-gravado-v1.webp'
					: mvpArt(edition.art)}
				alt=""
				width="240"
				height="240"
				loading={mode === 'bundle' ? 'eager' : 'lazy'}
			/>
			<span class="folio-title"
				>{mode === 'solar' ? 'Sua próxima Revolução Solar' : edition.title}</span
			>
			<span class="folio-subtitle">{mode === 'solar' ? 'O seu ano à frente' : edition.cadence}</span
			>
			<span class="page-foot">LEITURA PESSOAL EM PDF <span>✦</span></span>
		</div>
	{/if}
	{#if mode === 'bundle' || mode === 'inside'}
		<div class="phone">
			<span class="phone-camera"></span>
			<div class="phone-heading">ATV+<span>Leituras pessoais</span></div>
			<div class="phone-preview">
				<span class="imprint">SUA LEITURA</span>
				<img src={mvpArt(edition.art)} alt="" width="120" height="120" loading="lazy" />
				<strong>{edition.title}</strong>
			</div>
			<div class="pdf-file">
				<span>PDF</span><span>Leitura do período<small>Recebida pelo WhatsApp</small></span>
			</div>
			<span class="phone-home"></span>
		</div>
	{/if}
	{#if mode === 'plan' && planId !== 'essencial'}
		<img
			class="tarot-detail"
			src="/brand/mvp/assets/product-final/tarot-triplico-gravado-v1.webp"
			alt=""
			width="200"
			height="200"
			loading="lazy"
		/>
	{/if}
</div>

<style>
	.delivery-art {
		position: relative;
		isolation: isolate;
		min-width: 0;
		width: 100%;
		height: 460px;
		overflow: hidden;
		color: #183746;
	}
	.orbit {
		position: absolute;
		width: 96%;
		aspect-ratio: 1;
		border: 1px solid #e7c78b35;
		border-radius: 50%;
		z-index: -1;
		top: 8%;
		left: 3%;
	}
	.orbit-two {
		width: 82%;
		top: 16%;
		left: 10%;
	}
	.folio {
		position: absolute;
		width: 55%;
		height: 348px;
		display: flex;
		flex-direction: column;
		padding: 19px 23px 15px;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp') center/cover;
		border: 1px solid #a4a194;
		box-shadow:
			4px 4px 0 #e9e2d5,
			5px 5px 0 #968e78,
			16px 24px 30px #071d2850;
	}
	.main-folio {
		left: 27%;
		top: 42px;
		transform: rotate(6deg);
	}
	.rear-folio {
		left: 4%;
		top: 18px;
		transform: rotate(-11deg);
	}
	.imprint,
	.page-foot {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		font: 500 7px/1.5 var(--font-body, Onest, Arial, sans-serif);
		letter-spacing: 0.1em;
	}
	.imprint {
		border-bottom: 1px solid #18374635;
		padding-bottom: 9px;
	}
	.folio img {
		min-height: 0;
		width: 100%;
		height: 177px;
		object-fit: contain;
		margin: 8px auto;
	}
	.folio-title {
		font: 400 clamp(22px, 2.5vw, 32px)/1.05 var(--font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.02em;
	}
	.folio-subtitle {
		margin-top: 8px;
		font-size: 9px;
	}
	.page-foot {
		margin-top: auto;
		padding-top: 10px;
		border-top: 1px solid #18374635;
		font-size: 6px;
	}
	.phone {
		position: absolute;
		width: 140px;
		height: 273px;
		right: 2%;
		bottom: 10px;
		padding: 22px 8px 13px;
		border: 4px solid #0a2633;
		border-radius: 19px;
		background: #e6e9de url('/brand/mvp/assets/papel-fino.webp') center/cover;
		box-shadow: 10px 12px 22px #071d2850;
		transform: rotate(3deg);
	}
	.phone-camera {
		position: absolute;
		top: 8px;
		left: 40%;
		width: 20%;
		height: 3px;
		background: #183746;
		border-radius: 3px;
	}
	.phone-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-bottom: 8px;
		font: 500 18px/1 var(--font-display, Newsreader, Georgia, serif);
	}
	.phone-heading > span {
		font: 500 6px var(--font-body, Onest, Arial, sans-serif);
	}
	.phone-preview {
		display: flex;
		flex-direction: column;
		padding: 10px;
		background: #fff8e9;
		border: 1px solid #18374625;
	}
	.phone-preview .imprint {
		font-size: 5px;
		padding-bottom: 5px;
	}
	.phone-preview img {
		width: 100%;
		height: 80px;
		object-fit: contain;
		margin: 5px 0;
	}
	.phone-preview strong {
		font: 400 15px/1 var(--font-display, Newsreader, Georgia, serif);
	}
	.pdf-file {
		display: flex;
		gap: 6px;
		align-items: center;
		padding: 9px 2px;
		font-size: 6px;
	}
	.pdf-file > span:first-child {
		padding: 5px 3px;
		border: 1px solid #9e814b;
		font-size: 6px;
		color: #795d2c;
	}
	.pdf-file small {
		display: block;
		margin-top: 3px;
		font-size: 5px;
	}
	.phone-home {
		position: absolute;
		bottom: 6px;
		left: 32%;
		width: 36%;
		height: 3px;
		border-radius: 3px;
		background: #183746;
	}
	.art-solar {
		height: 400px;
	}
	.art-solar .main-folio {
		left: 18%;
		top: 20px;
		width: 65%;
		height: 350px;
		transform: rotate(-5deg);
	}
	.art-plan {
		height: 235px;
	}
	.art-plan .orbit {
		width: 88%;
		top: -5%;
	}
	.art-plan .main-folio {
		top: 8px;
		left: 23%;
		width: 54%;
		max-width: 170px;
		height: 210px;
		padding: 10px 12px;
		transform: rotate(-6deg);
	}
	.art-plan .imprint {
		font-size: 4px;
		padding-bottom: 5px;
	}
	.art-plan .folio img {
		height: 95px;
		margin: 7px 0;
	}
	.art-plan .folio-title {
		font-size: 18px;
	}
	.art-plan .folio-subtitle {
		font-size: 6px;
		margin-top: 4px;
	}
	.art-plan .page-foot {
		padding-top: 6px;
		font-size: 4px;
	}
	.tarot-detail {
		position: absolute;
		width: 44%;
		height: 170px;
		object-fit: contain;
		bottom: 4px;
		right: 0;
		transform: rotate(9deg);
		filter: drop-shadow(4px 7px 5px #071d2830);
	}
	.inside-spread {
		position: absolute;
		display: grid;
		grid-template-columns: 1fr 1fr;
		width: 85%;
		left: 1%;
		top: 35px;
		height: 320px;
		transform: rotate(-5deg);
		box-shadow:
			4px 5px 0 #ddd6c4,
			5px 6px 0 #9e997d,
			15px 20px 26px #071d2850;
	}
	.spread-page {
		display: flex;
		flex-direction: column;
		min-width: 0;
		padding: 16px;
		background: #fff8e9 url('/brand/mvp/assets/papel-fino.webp') center/cover;
		border: 1px solid #b5b19d;
	}
	.spread-illustration {
		background-color: #f5eddc;
	}
	.spread-illustration img {
		width: 100%;
		min-height: 0;
		flex: 1;
		height: 170px;
		object-fit: contain;
		margin: 8px 0;
	}
	.spread-heading {
		font: 400 24px/1.05 var(--font-display, Newsreader, Georgia, serif);
		letter-spacing: -0.02em;
	}
	.chapter-number {
		font-size: 7px;
		margin: 15px 0 10px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #806035;
	}
	.spread-content p {
		font-size: 8px;
		line-height: 1.6;
		margin: 11px 0;
	}
	.date-mark {
		display: grid;
		gap: 5px;
		border-block: 1px solid #a5a793;
		padding: 9px 0;
		margin-bottom: 10px;
	}
	.date-mark span {
		font-size: 5px;
		letter-spacing: 0.1em;
	}
	.date-mark strong {
		font: 400 16px/1 var(--font-display, Newsreader, Georgia, serif);
	}
	.reading-lines {
		display: grid;
		gap: 5px;
	}
	.reading-lines i {
		height: 1px;
		background: #18374625;
	}
	.reading-lines i:last-child {
		width: 62%;
	}
	.art-inside .phone {
		right: 0;
	}
	@media (max-width: 1000px) and (min-width: 761px) {
		.folio {
			width: 64%;
			padding: 15px;
		}
		.main-folio {
			left: 19%;
		}
		.phone {
			width: 122px;
			height: 258px;
			right: 0;
		}
	}
	@media (max-width: 600px) {
		.delivery-art {
			height: 390px;
			max-width: 440px;
			margin-inline: auto;
		}
		.folio {
			height: 300px;
			padding: 15px;
		}
		.folio img {
			height: 145px;
		}
		.folio-title {
			font-size: 26px;
		}
		.main-folio {
			left: 25%;
			top: 30px;
		}
		.rear-folio {
			top: 20px;
		}
		.phone {
			width: 120px;
			height: 248px;
			right: 0;
			bottom: 0;
		}
		.phone-preview img {
			height: 65px;
		}
		.phone-preview strong {
			font-size: 14px;
		}
		.phone-heading {
			font-size: 16px;
		}
		.art-plan {
			height: 230px;
			max-width: 320px;
		}
		.art-plan .main-folio {
			height: 210px;
		}
		.art-solar {
			height: 360px;
		}
		.art-solar .main-folio {
			height: 320px;
		}
		.inside-spread {
			top: 25px;
			height: 300px;
			width: 90%;
			left: 0;
		}
		.spread-page {
			padding: 12px;
		}
		.spread-heading {
			font-size: 22px;
		}
		.spread-illustration img {
			height: 140px;
		}
		.art-inside {
			height: 420px;
		}
		.art-inside .phone {
			bottom: 0;
			right: 0;
		}
	}
</style>
