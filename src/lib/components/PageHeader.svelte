<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import type { Component } from 'svelte';
	import { fly } from 'svelte/transition';
	import Icon from './Icon.svelte';
	import { DURATION_BASE } from '$lib/utils/motion';

	interface Props {
		icon: Component<any>;
		title: string;
		subtitle?: string;
		onIconClick?: () => void;
	}

	let { icon, title, subtitle, onIconClick }: Props = $props();
</script>

<div
	class="gap-3 border-primary/20 flex items-center border-b-2 pb-4"
	in:fly={{ y: -8, duration: DURATION_BASE }}
>
	<span
		class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
		onclick={onIconClick}
		role="presentation"
	>
		<Icon {icon} size={26} />
	</span>
	<div>
		<h1 class="text-2xl font-bold">{title}</h1>
		{#if subtitle}
			<p class="text-sm opacity-70">{subtitle}</p>
		{/if}
	</div>
</div>
