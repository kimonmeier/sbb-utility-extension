<script lang="ts">
	import { fly } from 'svelte/transition';
	import { currentPage } from '$lib/stores/navigation';
	import GeneralPage from '$lib/components/employees/GeneralPage.svelte';
	import DetailEmployee from '$lib/components/employees/DetailEmployee.svelte';
	import { DURATION_BASE } from '$lib/utils/motion';
</script>

<div class="flex flex-col overflow-hidden">
	{#if $currentPage.detailId}
		{#key $currentPage.detailId}
			<div in:fly={{ x: 24, duration: DURATION_BASE }} out:fly={{ x: -24, duration: DURATION_BASE }}>
				<DetailEmployee employeeId={$currentPage.detailId} />
			</div>
		{/key}
	{:else}
		<div in:fly={{ x: -24, duration: DURATION_BASE }} out:fly={{ x: 24, duration: DURATION_BASE }}>
			<GeneralPage />
		</div>
	{/if}
</div>
