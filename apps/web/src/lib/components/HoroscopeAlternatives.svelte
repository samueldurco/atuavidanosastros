<script lang="ts">
	import { horoscopeRange, type HoroscopeEditionLink } from '$lib/public-horoscope';
	let {
		lastDaily,
		currentWeek
	}: { lastDaily: HoroscopeEditionLink | null; currentWeek: HoroscopeEditionLink | null } =
		$props();
</script>

{#if lastDaily}
	<p><a href={lastDaily.path}>Última edição diária disponível · {horoscopeRange(lastDaily)}</a></p>
{/if}
{#if currentWeek}
	<p><a href={currentWeek.path}>Ler o semanal vigente · {horoscopeRange(currentWeek)}</a></p>
{/if}
