<script lang="ts">
	import { currentAlert } from '$lib/stores/alert';
	import { Alert } from './ui';
</script>

<div class="bottom-4 fixed left-1/2 z-50 -translate-x-1/2 transform">
	{#if $currentAlert}
		{#key $currentAlert.id}
			<Alert variant={$currentAlert.type} showIcon={true}>
				{$currentAlert.message}
			</Alert>
		{/key}
	{/if}
</div>
