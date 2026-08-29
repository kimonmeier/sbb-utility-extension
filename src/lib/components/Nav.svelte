<script lang="ts">
	import { MENU_ITEMS } from '$lib/constants/menu';
	import { currentPage } from '$lib/stores/navigation';
	import Icon from './Icon.svelte';
</script>

<aside class="h-16 bg-base-200 p-2 bottom-0 border-base-300 fixed w-full border-t">
	<nav class="gap-4 flex flex-row justify-center">
		{#each MENU_ITEMS as item (item.page)}
			{@const isActive = item.page === $currentPage.currentPage}
			<button
				class="btn btn-ghost btn-square {isActive ? 'btn-active' : ''}"
				onclick={item.action}
				aria-label={item.label()}
				aria-current={isActive ? 'page' : undefined}
			>
				<Icon icon={item.icon} size={24} class="text-current" />
				<span class="sr-only">{item.label()}</span>
			</button>
		{/each}
	</nav>
</aside>
