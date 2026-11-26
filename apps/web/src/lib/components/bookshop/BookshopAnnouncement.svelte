<script lang="ts">
	import BookSeal from './BookSeal.svelte';
</script>

<aside class="bookshop-announcement" aria-label="Livraria ATVNA em preparação">
	<div class="announcement-seal"><BookSeal /></div>
	<div>
		<p>Livraria ATVNA · Em preparação</p>
		<h3>Uma nova estante.<br /><em>Um céu de leituras.</em></h3>
		<span>Conheça a proposta dos nossos livros e do clube Céu de Papel.</span>
	</div>
	<a href="/loja/livraria">Conhecer a Livraria <span aria-hidden="true">↗</span></a>
</aside>

<style>
	.bookshop-announcement {
		display: flex;
		align-items: center;
		gap: 25px 32px;
		background: #3c1020;
		color: #fff8ed;
		padding: 30px 36px;
		margin-top: 36px;
		border: 1px solid #b78d5270;
	}
	.announcement-seal {
		width: 90px;
		flex: 0 0 90px;
		color: #dfc08b;
	}
	.announcement-seal :global(svg) {
		width: 100%;
		height: auto;
		display: block;
	}
	p {
		font: 500 9px/1.6 var(--atv-font-body);
		text-transform: uppercase;
		letter-spacing: 0.13em;
		margin: 0 0 8px;
	}
	h3 {
		font: 400 32px/1.05 var(--atv-font-display);
		margin: 0 0 12px;
	}
	h3 em {
		color: #edbdad;
	}
	.bookshop-announcement > div > span {
		font-size: 11px;
		line-height: 1.7;
		display: block;
	}
	a {
		display: inline-flex;
		align-items: center;
		justify-content: space-between;
		gap: 22px;
		min-height: 46px;
		border: 1px solid #e3c6a2;
		padding: 10px 17px;
		margin-left: auto;
		flex-shrink: 0;
		color: inherit;
		font-size: 11px;
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
		text-underline-offset: 4px;
	}
	a:focus-visible {
		outline: 3px solid #edbdad;
		outline-offset: 4px;
	}
	@media (max-width: 700px) {
		.bookshop-announcement {
			flex-wrap: wrap;
			padding: 26px 22px;
			gap: 22px;
		}
		.announcement-seal {
			width: 67px;
			flex-basis: 67px;
		}
		.bookshop-announcement > div:nth-child(2) {
			flex: 1;
			min-width: 160px;
		}
		h3 {
			font-size: 29px;
		}
		a {
			margin-left: 0;
			width: 100%;
		}
	}
</style>
