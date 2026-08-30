<script lang="ts">
	import { currentPage } from '$lib/stores/navigation';
	import { DURATION_BASE } from '$lib/utils/motion';
	import { fly } from 'svelte/transition';
	import GeneralPage from '$lib/components/calculation/GeneralPage.svelte';
	import DetailPage from '$lib/components/calculation/DetailPage.svelte';
</script>

<div class="flex flex-col overflow-hidden">
	{#if $currentPage.detailId}
		{#key $currentPage.detailId}
			<div
				in:fly={{ x: 24, duration: DURATION_BASE }}
				out:fly={{ x: -24, duration: DURATION_BASE }}
			>
				<DetailPage employeeId={$currentPage.detailId} />
			</div>
		{/key}
	{:else}
		<div in:fly={{ x: -24, duration: DURATION_BASE }} out:fly={{ x: 24, duration: DURATION_BASE }}>
			<GeneralPage />
		</div>
	{/if}
</div>
