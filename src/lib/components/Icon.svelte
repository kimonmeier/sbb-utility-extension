<script lang="ts">
	/* eslint-disable @typescript-eslint/no-explicit-any */
	import type { Component } from 'svelte';

	interface Props {
		icon: Component<any>;
		size?: number | string;
		strokeWidth?: number;
		class?: string;
	}

	let { icon, size = 24, strokeWidth = 2, class: className = '', ...rest }: Props = $props();
</script>

<!-- svelte-ignore svelte_component_deprecated -->
<svelte:component this={icon} {size} {strokeWidth} class={className} {...rest} />
