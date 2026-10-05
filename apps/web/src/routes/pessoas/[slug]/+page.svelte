<script lang="ts">
	let { data } = $props();
</script>

<section class="section">
	<div class="reading">
		<p class="eyebrow">Autoria</p>
		<h1 class="h1">{data.author.name}</h1>
		<p class="lead">{data.author.bio}</p>
		<h2>Publicações</h2>
		<ul>
			{#each data.documents as document (document.id)}<li>
					<a href={document.path}>{document.title}</a>
				</li>{/each}
		</ul>
	</div>
</section>
