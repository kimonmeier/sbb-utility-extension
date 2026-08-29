<script lang="ts">
	import { MENU_ITEMS } from '$lib/constants/menu';
	import { currentPage } from '$lib/stores/navigation';
	import Icon from './Icon.svelte';
</script>

<aside class="bg-base-100 border-base-300 fixed bottom-0 w-full border-t py-2">
	<nav class="gap-2 flex flex-row items-center justify-center">
		{#each MENU_ITEMS as item (item.page)}
			{@const isActive = item.page === $currentPage.currentPage}
			<button
				class="gap-0.5 duration-sbb ease-sbb flex w-20 flex-col items-center rounded-2xl py-1.5 transition-all active:scale-90 {isActive
					? 'bg-primary/10 text-primary'
					: 'text-neutral hover:bg-base-200'}"
				onclick={item.action}
				aria-label={item.label()}
				aria-current={isActive ? 'page' : undefined}
			>
				<Icon
					icon={item.icon}
					size={22}
					class="duration-sbb ease-sbb transition-transform {isActive ? 'scale-110' : ''}"
				/>
				<span class="text-xs font-medium">{item.label()}</span>
			</button>
		{/each}
	</nav>
</aside>
