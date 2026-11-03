<script lang="ts">
	import { signNames, type SignSlug } from '$lib/data/site';
	const reference: Record<SignSlug, [string, string]> = {
		aries: ['21 mar – 19 abr', 'Fogo'],
		touro: ['20 abr – 20 mai', 'Terra'],
		gemeos: ['21 mai – 20 jun', 'Ar'],
		cancer: ['21 jun – 22 jul', 'Água'],
		leao: ['23 jul – 22 ago', 'Fogo'],
		virgem: ['23 ago – 22 set', 'Terra'],
		libra: ['23 set – 22 out', 'Ar'],
		escorpiao: ['23 out – 21 nov', 'Água'],
		sagitario: ['22 nov – 21 dez', 'Fogo'],
		capricornio: ['22 dez – 19 jan', 'Terra'],
		aquario: ['20 jan – 18 fev', 'Ar'],
		peixes: ['19 fev – 20 mar', 'Água']
	};
	let { data } = $props();
</script>

<section class="section">
	<div class="reading">
		<nav aria-label="Caminho da página"><a href="/">Início</a> / Signos</nav>
		<h1 class="h1">Os 12 signos do zodíaco</h1>
		<p class="lead">
			Na astrologia tropical, o signo solar é o trecho do zodíaco onde o Sol estava quando você
			nasceu. Use a tabela para localizar o seu e abrir as leituras disponíveis.
		</p>
		<p>
			As datas são aproximadas. O Sol muda de signo em um horário diferente a cada ano. Se você
			nasceu perto da mudança, use a data, a hora e o local de nascimento para <a
				href="/ferramentas/mapa-astral"
				data-atv-event="tool_select"
				data-atv-tool="mapa-astral"
				data-atv-universe="meu-ceu"
				data-atv-context="universe">consultar o seu mapa astral</a
			>.
		</p>
		<table>
			<caption>Signos em ordem zodiacal, com datas aproximadas e elementos</caption>
			<thead
				><tr
					><th scope="col">Signo</th><th scope="col">Nascimento</th><th scope="col">Elemento</th><th
						scope="col">Leituras</th
					></tr
				></thead
			>
			<tbody>
				{#each data.entries as entry (entry.sign)}
					<tr>
						<th scope="row">{signNames[entry.sign]}</th>
						<td>{reference[entry.sign][0]}</td><td>{reference[entry.sign][1]}</td>
						<td>
							{#if entry.profile}<a href={entry.profile}>Perfil de {signNames[entry.sign]}</a>{/if}
							{#if entry.horoscope}<a href={entry.horoscope}>Horóscopo de {signNames[entry.sign]}</a
								>{/if}
							{#if !entry.profile && !entry.horoscope}Sem leitura publicada{/if}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
		<h2>Signo solar e ascendente são a mesma coisa?</h2>
		<p>
			O signo solar vem da posição do Sol. O ascendente é o signo que surgia no horizonte leste na
			hora e no lugar do nascimento. Para descobrir o seu, <a
				href="/ferramentas/ascendente"
				data-atv-event="tool_select"
				data-atv-tool="ascendente"
				data-atv-universe="meu-ceu"
				data-atv-context="universe">calcule o ascendente</a
			>. Para reunir essas posições em uma leitura,
			<a href="/temas/mapa-astral">explore o tema mapa astral</a>.
		</p>
	</div>
</section>

<style>
	table {
		width: 100%;
		margin: 2rem 0;
		border-collapse: collapse;
		font-size: clamp(0.82rem, 2.4vw, 1rem);
	}
	caption {
		text-align: left;
		font-weight: bold;
		margin-bottom: 0.7rem;
	}
	td,
	th {
		padding: 0.65rem 0.25rem;
		border-bottom: 1px solid currentColor;
		text-align: left;
	}
	td a {
		display: block;
	}
</style>
