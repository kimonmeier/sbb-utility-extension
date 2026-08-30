<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { fade } from 'svelte/transition';
	import { theme, initializeTheme } from './lib/stores/theme';
	import { locale } from './lib/stores/locale';
	import { currentPage } from './lib/stores/navigation';
	import { initDatabaseAndMigrate } from './background/db/db';
	import { alertQueue, currentAlert } from './lib/stores/alert';
	import type { Unsubscriber } from 'svelte/store';
	import AlertManager from './lib/components/AlertManager.svelte';
	import { DURATION_BASE, DURATION_FAST } from './lib/utils/motion';

	import Nav from '$lib/components/Nav.svelte';

	// Pages
	import HomePage from '$lib/pages/HomePage.svelte';
	import EmployeePage from '$lib/pages/EmployeePage.svelte';
	import SettingsPage from '$lib/pages/SettingsPage.svelte';
	import CaluclationPage from '$lib/pages/CaluclationPage.svelte';

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

<div class="bg-base-300 h-screen" data-theme={$theme}>
	{#key $locale}
		<div class="flex h-full flex-col">
			<main class="p-4 pb-20 flex-1 overflow-y-auto">
				<!-- Page Content -->
				<div class="max-w-4xl mx-auto">
					{#key $currentPage.currentPage}
						<div
							in:fade={{ duration: DURATION_BASE, delay: DURATION_FAST }}
							out:fade={{ duration: DURATION_FAST }}
						>
							{#if $currentPage.currentPage === 'home'}
								<HomePage />
							{:else if $currentPage.currentPage === 'employees'}
								<EmployeePage />
							{:else if $currentPage.currentPage === 'caluclations'}
								<CaluclationPage />
							{:else if $currentPage.currentPage === 'settings'}
								<SettingsPage />
							{/if}
						</div>
					{/key}
				</div>
			</main>

			<!-- Navigation -->
			<Nav />
			<AlertManager />
		</div>
	{/key}
</div>
