<script lang="ts">
	import { currentPage } from '$lib/stores/navigation';
	import GeneralPage from '$lib/components/employees/GeneralPage.svelte';
	import DetailEmployee from '$lib/components/employees/DetailEmployee.svelte';
</script>

<div class="flex flex-col">
	{#if $currentPage.detailId}
		<DetailEmployee employeeId={$currentPage.detailId} />
	{:else}
		<GeneralPage />
	{/if}
</div>
