<script lang="ts">
	import { paymentMarks } from '$lib/data/commerce-trust';
	let { compact = false } = $props<{ compact?: boolean }>();
	const marks = $derived(
		compact
			? paymentMarks.filter((mark) => ['pix', 'visa', 'master', 'boleto'].includes(mark.id))
			: paymentMarks
	);
</script>

<ul class="payment-marks" aria-label="Meios de pagamento previstos">
	{#each marks as mark (mark.id)}
		<li>
			<img
				src={'/brand/commerce/' + mark.id + '.svg'}
				alt={mark.name}
				width="46"
				height="30"
				loading="lazy"
			/>
		</li>
	{/each}
</ul>

<style>
	.payment-marks {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 7px;
		padding: 0;
		margin: 0;
		list-style: none;
	}
	.payment-marks li {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 52px;
		height: 36px;
		border: 1px solid #c7bfac;
		border-radius: 4px;
		background: #fff;
	}
	.payment-marks img {
		display: block;
		object-fit: contain;
	}
</style>
