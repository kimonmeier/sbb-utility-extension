<script lang="ts">
	import { sendWorkerMessage } from '$background/messages/messageSender';
	import { m } from '@/paraglide/messages.js';

	let isSuccess = $state(false);
	let errorMessage: string | null = $state(null);
	let isLoading = $state(false);

	async function syncApi() {
		isLoading = true;

		const result = await sendWorkerMessage('SYNC_API_WORKER');

		isLoading = false;
		isSuccess = result.success;
		errorMessage = result.error || null;
	}
</script>

<div class="rounded-xl bg-base-100 p-3 border border-base-300 shadow-sm">
	<div class="text font-bold text-3xl">
		{m.sync_title()}
	</div>
	<div class="text">
		{m.sync_description()}
	</div>
	{#if isLoading}
		<button class="btn btn-success loading" disabled>
			{m.sync_loading()}
		</button>
	{:else if isSuccess}
		<button class="btn btn-success" disabled>
			{m.sync_success()}
		</button>
	{:else}
		<button class="btn btn-success" onclick={syncApi}>
			{m.sync_start()}
		</button>
	{/if}
	{#if errorMessage}
		<div class="alert alert-error mt-3">
			{m.sync_error({ error: errorMessage })}
		</div>
	{/if}
</div>
