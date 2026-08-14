<script lang="ts">
	import { onMount } from "svelte";
	import { theme, initializeTheme } from "./lib/stores/theme";
	import { currentPage } from "./lib/stores/navigation";

	import Nav from "./lib/components/Nav.svelte";

	// Pages
	import HomePage from "./lib/pages/HomePage.svelte";
	import SettingsPage from "./lib/pages/SettingsPage.svelte";

	onMount(() => {
		initializeTheme();
	});
</script>

<div class="h-screen bg-base-300" data-theme={$theme}>
	<div class="flex flex-col h-full">
		<main class="flex-1 p-4 pb-20 overflow-y-auto">
			<!-- Page Content -->
			<div class="max-w-4xl mx-auto">
				{#if $currentPage === "home"}
					<HomePage />
				{:else if $currentPage === "settings"}
					<SettingsPage />
				{/if}
			</div>
		</main>

		<!-- Navigation -->
		<Nav />
	</div>
</div>
