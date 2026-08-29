<script lang="ts">
	import { m } from '@/paraglide/messages.js';
	import { Modal, Button } from '$lib/components/ui';
	import Icon from '$lib/components/Icon.svelte';
	import { TriangleAlert, Download, Upload, Trash } from '$lib/icons';
	import { sendWorkerMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { arrayBufferToBase64, base64ToArrayBuffer } from '$lib/utils/base64';

	let busy = $state(false);
	let confirmOpen = $state(false);
	let confirmTitle = $state('');
	let confirmMessage = $state('');
	let pendingAction: (() => Promise<void>) | null = null;

	let sqliteFileInput: HTMLInputElement | undefined = $state();
	let jsonFileInput: HTMLInputElement | undefined = $state();

	function downloadBlob(blob: Blob, filename: string) {
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = filename;
		link.click();
		URL.revokeObjectURL(url);
	}

	function askConfirmation(title: string, message: string, action: () => Promise<void>) {
		confirmTitle = title;
		confirmMessage = message;
		pendingAction = action;
		confirmOpen = true;
	}

	async function runPendingAction() {
		const action = pendingAction;
		confirmOpen = false;
		pendingAction = null;
		if (!action) return;

		busy = true;
		try {
			await action();
		} finally {
			busy = false;
		}
	}

	async function deleteDatabase() {
		const result = await sendWorkerMessage('RESET_DB');
		if (result.success) {
			alertQueue.queue({ type: 'success', message: m.settings_expert_reset_success() });
			window.location.reload();
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.settings_expert_reset_error({ error: result.error ?? '' })
			});
		}
	}

	async function exportSqlite() {
		const result = await sendWorkerMessage('EXPORT_DB_SQLITE');
		if (result.success && result.fileBase64) {
			const buffer = base64ToArrayBuffer(result.fileBase64);
			downloadBlob(new Blob([buffer]), `sbb-utility-${Date.now()}.sqlite`);
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.settings_expert_export_error({ error: result.error ?? '' })
			});
		}
	}

	async function exportJson() {
		const result = await sendWorkerMessage('EXPORT_DB_JSON');
		if (result.success && result.json) {
			downloadBlob(
				new Blob([result.json], { type: 'application/json' }),
				`sbb-utility-${Date.now()}.json`
			);
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.settings_expert_export_error({ error: result.error ?? '' })
			});
		}
	}

	function triggerSqliteImport() {
		sqliteFileInput?.click();
	}

	function triggerJsonImport() {
		jsonFileInput?.click();
	}

	function handleSqliteFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		askConfirmation(
			m.settings_expert_import_confirm_title(),
			m.settings_expert_import_confirm_message(),
			async () => {
				const buffer = await file.arrayBuffer();
				const result = await sendWorkerMessage('IMPORT_DB_SQLITE', {
					fileBase64: arrayBufferToBase64(buffer)
				});
				if (result.success) {
					alertQueue.queue({ type: 'success', message: m.settings_expert_import_success() });
					window.location.reload();
				} else {
					alertQueue.queue({
						type: 'error',
						message: m.settings_expert_import_error({ error: result.error ?? '' })
					});
				}
			}
		);
	}

	function handleJsonFileSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;

		askConfirmation(
			m.settings_expert_import_confirm_title(),
			m.settings_expert_import_confirm_message(),
			async () => {
				const json = await file.text();
				const result = await sendWorkerMessage('IMPORT_DB_JSON', { json });
				if (result.success) {
					alertQueue.queue({ type: 'success', message: m.settings_expert_import_success() });
					window.location.reload();
				} else {
					alertQueue.queue({
						type: 'error',
						message: m.settings_expert_import_error({ error: result.error ?? '' })
					});
				}
			}
		);
	}
</script>

<div class="card bg-base-200 border border-error/50 shadow-sm">
	<div class="card-body">
		<h2 class="card-title text-error">
			<Icon icon={TriangleAlert} size={24} />
			{m.settings_expert_title()}
		</h2>
		<p class="text-sm opacity-70">{m.settings_expert_subtitle()}</p>

		<div class="divider"></div>

		<div class="flex flex-col gap-3">
			<div class="flex items-center justify-between gap-3">
				<span>{m.settings_expert_export_sqlite()}</span>
				<Button variant="secondary" size="sm" onclick={exportSqlite} disabled={busy}>
					<Icon icon={Download} size={16} />
				</Button>
			</div>

			<div class="flex items-center justify-between gap-3">
				<span>{m.settings_expert_export_json()}</span>
				<Button variant="secondary" size="sm" onclick={exportJson} disabled={busy}>
					<Icon icon={Download} size={16} />
				</Button>
			</div>

			<div class="flex items-center justify-between gap-3">
				<span>{m.settings_expert_import_sqlite()}</span>
				<Button variant="secondary" size="sm" onclick={triggerSqliteImport} disabled={busy}>
					<Icon icon={Upload} size={16} />
				</Button>
			</div>

			<div class="flex items-center justify-between gap-3">
				<span>{m.settings_expert_import_json()}</span>
				<Button variant="secondary" size="sm" onclick={triggerJsonImport} disabled={busy}>
					<Icon icon={Upload} size={16} />
				</Button>
			</div>

			<div class="divider"></div>

			<div class="flex items-center justify-between gap-3">
				<span>{m.settings_expert_delete_db()}</span>
				<Button
					variant="error"
					size="sm"
					disabled={busy}
					onclick={() =>
						askConfirmation(
							m.settings_expert_delete_confirm_title(),
							m.settings_expert_delete_confirm_message(),
							deleteDatabase
						)}
				>
					<Icon icon={Trash} size={16} />
				</Button>
			</div>
		</div>
	</div>
</div>

<input
	bind:this={sqliteFileInput}
	type="file"
	accept=".sqlite,.sqlite3,.db"
	class="hidden"
	onchange={handleSqliteFileSelected}
/>
<input
	bind:this={jsonFileInput}
	type="file"
	accept="application/json,.json"
	class="hidden"
	onchange={handleJsonFileSelected}
/>

<Modal bind:open={confirmOpen} title={confirmTitle} onclose={() => (confirmOpen = false)}>
	<p>{confirmMessage}</p>
	{#snippet actions()}
		<Button variant="ghost" onclick={() => (confirmOpen = false)}
			>{m.settings_expert_cancel()}</Button
		>
		<Button variant="error" onclick={runPendingAction}>{m.settings_expert_confirm()}</Button>
	{/snippet}
</Modal>
