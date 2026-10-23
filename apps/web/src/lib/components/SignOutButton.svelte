<form method="POST" action="/sair" class="sign-out">
	<button type="submit" aria-label="Sair da conta">Sair</button>
</form>

<style>
	.sign-out {
		margin: 0;
		flex-shrink: 0;
	}
	button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border: 1px solid currentColor;
		border-radius: var(--atv-radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}
	button:hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}
	button:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 4px;
	}
</style>
