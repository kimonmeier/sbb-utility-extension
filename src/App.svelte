<script lang="ts">
	import { onDestroy, onMount } from "svelte";
	import { theme, initializeTheme } from "./lib/stores/theme";
	import { currentPage } from "./lib/stores/navigation";

	import Nav from "./lib/components/Nav.svelte";

	// Pages
	import HomePage from "./lib/pages/HomePage.svelte";
	import EmployeePage from "./lib/pages/EmployeePage.svelte";
	import SettingsPage from "./lib/pages/SettingsPage.svelte";
	import { initDatabaseAndMigrate } from "./background/db/db";
	import { alertQueue, currentAlert } from "./lib/stores/alert";
	import type { Unsubscriber } from "svelte/store";
	import AlertManager from "./lib/components/AlertManager.svelte";

	let alertQueueUnsubscribe: Unsubscriber | null = null;

	onMount(async () => {
		alertQueueUnsubscribe = alertQueue.subscribe((alerts) => {
			if (alerts.length > 0) {
				currentAlert.set(alerts[0]);
			} else {
				currentAlert.set(null);
			}
		});


		initializeTheme();

		await initDatabaseAndMigrate();
	});

	onDestroy(() => {
		if (alertQueueUnsubscribe) {
			alertQueueUnsubscribe();
		}
	});
</script>

<div class="h-screen bg-base-300" data-theme={$theme}>
	<div class="flex flex-col h-full">
		<main class="flex-1 p-4 pb-20 overflow-y-auto">
			<!-- Page Content -->
			<div class="max-w-4xl mx-auto">
				{#if $currentPage === "home"}
					<HomePage />
				{:else if $currentPage === "employees"}
					<EmployeePage />
				{:else if $currentPage === "settings"}
					<SettingsPage />
				{/if}
			</div>
		</main>

		<!-- Navigation -->
		<Nav />
		<AlertManager />
	</div>
</div>
