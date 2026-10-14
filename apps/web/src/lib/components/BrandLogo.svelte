<script lang="ts">
	let { compact = false, onDark = true }: { compact?: boolean; onDark?: boolean } = $props();
</script>

<span
	class="mvp-brand"
	class:compact
	class:on-dark={onDark}
	role="img"
	aria-label="A Tua Vida nos Astros"
>
	<img
		src={onDark ? '/brand/mvp/assets/marca-escura.svg' : '/brand/mvp/assets/marca-clara.svg'}
		alt=""
		width="52"
		height="52"
	/>
	<span class="mvp-wordmark" aria-hidden="true"
		><small>A TUA VIDA</small><span>nos astros</span></span
	>
</span>

<style>
	.mvp-brand {
		display: flex;
		align-items: center;
		gap: 14px;
		color: #183746;
	}
	.mvp-brand.on-dark {
		color: #fff8e9;
	}
	img {
		width: 52px;
		height: 52px;
		flex: 0 0 52px;
	}
	.mvp-wordmark {
		display: flex;
		flex-direction: column;
		line-height: 1;
		white-space: nowrap;
	}
	small {
		font:
			500 10px/1.5 'Onest',
			sans-serif;
		letter-spacing: 0.2em;
	}
	.mvp-wordmark > span {
		font:
			400 34px/1.05 'Newsreader',
			Georgia,
			serif;
		letter-spacing: -0.03em;
	}
	.compact img {
		width: 44px;
		height: 44px;
		flex-basis: 44px;
	}
	@media (max-width: 480px) {
		img {
			width: 42px;
			height: 42px;
			flex-basis: 42px;
		}
		.mvp-brand {
			gap: 10px;
		}
		.mvp-wordmark > span {
			font-size: 29px;
		}
	}
</style>
