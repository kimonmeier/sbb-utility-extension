<script lang="ts">
	import type { Snippet } from 'svelte';
	import { Info, AlertCircle, Check, XCircle } from '$lib/icons';
	import Icon from '$lib/components/Icon.svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		variant?: 'info' | 'success' | 'warning' | 'error';
		class?: string;
		showIcon?: boolean;
		children?: Snippet;
	}

	let {
		variant = 'info',
		class: className = '',
		showIcon = true,
		children,
		...rest
	}: Props = $props();

	const classes = $derived(
		['flex', 'flex-row', 'alert', `alert-${variant}`, className].filter(Boolean).join(' ')
	);

	const iconMap = {
		info: Info,
		success: Check,
		warning: AlertCircle,
		error: XCircle
	};
</script>

<div transition:fade class={classes} role="alert" {...rest}>
	{#if showIcon}
		<Icon icon={iconMap[variant]} size={20} />
	{/if}
	{#if children}
		<span>{@render children()}</span>
	{/if}
</div>
