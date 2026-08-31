<script lang="ts">
	import { m } from '@/paraglide/messages.js';
	import { Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { CalendarDays, Upload } from '$lib/icons';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';

	let busy = $state(false);
	let fileInput: HTMLInputElement | undefined = $state();

	async function handleFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		busy = true;
		try {
			const result = await sendWorkerDataMessage('INSERT_DB', 'IMPORT_JAHRESTOURENPLAN', {
				json: await file.text()
			});

			if (result.success) {
				alertQueue.queue({
					type: 'success',
					message: m.settings_jahrestourenplan_imported({ gruppen: result.gruppen ?? 0 })
				});
			} else {
				alertQueue.queue({
					type: 'error',
					message: m.settings_jahrestourenplan_error({ error: result.error ?? '' })
				});
			}
		} finally {
			busy = false;
		}
	}
</script>

<div
	class="card bg-base-200 border-base-300 duration-sbb ease-sbb hover:shadow-sbb-1 shadow-sm border transition-shadow"
>
	<div class="card-body">
		<h2 class="card-title">
			<Icon icon={CalendarDays} size={24} />
			{m.settings_jahrestourenplan_title()}
		</h2>

		<p class="text-sm opacity-70">{m.settings_jahrestourenplan_description()}</p>

		<div class="gap-3 flex items-center justify-between">
			<span>{m.settings_jahrestourenplan_import()}</span>
			<Button variant="secondary" size="sm" onclick={() => fileInput?.click()} disabled={busy}>
				<Icon icon={Upload} size={16} />
			</Button>
		</div>
	</div>
</div>

<input
	bind:this={fileInput}
	type="file"
	accept="application/json,.json"
	class="hidden"
	onchange={handleFileSelected}
/>
