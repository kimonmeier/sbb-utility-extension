<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { Button, Input, Table } from '$lib/components/ui';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { Trash } from '$lib/icons';

	const props: {
		employeeId: string;
	} = $props();

	let entries: { id: string; von: Date; bis: Date | null; pensumProzent: number }[] = $state([]);
	let von: string = $state('');
	let pensumProzent: string = $state('');

	function formatDate(date: Date | null): string {
		if (!date) {
			return '';
		}
		return new Date(date).toLocaleDateString('de-CH');
	}

	async function fetchEntries() {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_ARBEITSVERHAELTNIS', {
			employeeId: props.employeeId
		});

		if (result.success) {
			entries = result.arbeitsverhaeltnisse || [];
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_arbeitsverhaeltnis_error_fetch({ error: result.error ?? '' })
			});
		}
	}

	async function saveEntry() {
		if (!von || !pensumProzent) {
			alertQueue.queue({
				type: 'error',
				message: m.employee_arbeitsverhaeltnis_error_missing_fields()
			});
			return;
		}
		const vonDate = new Date(von);

		const parsedProzent = parseInt(pensumProzent, 10);

		if (Number.isNaN(parsedProzent) || parsedProzent < 1 || parsedProzent > 100) {
			alertQueue.queue({
				type: 'error',
				message: m.employee_arbeitsverhaeltnis_error_invalid_prozent()
			});
			return;
		}

		const result = await sendWorkerDataMessage('INSERT_DB', 'INSERT_EMPLOYEE_ARBEITSVERHAELTNIS', {
			employeeId: props.employeeId,
			von: vonDate,
			pensumProzent: parsedProzent
		});

		if (result.success) {
			await fetchEntries();
			von = '';
			pensumProzent = '';
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_arbeitsverhaeltnis_error_save({ error: result.error ?? '' })
			});
		}
	}

	async function deleteEntry(id: string) {
		const result = await sendWorkerDataMessage('DELETE_DB', 'DELETE_EMPLOYEE_ARBEITSVERHAELTNIS', {
			id
		});

		if (result.success) {
			await fetchEntries();
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_arbeitsverhaeltnis_error_delete({ error: result.error ?? '' })
			});
		}
	}

	$effect(() => {
		fetchEntries();
	});
</script>

<div class="bg-base-100 rounded-3xl p-4">
	<h3 class="text-xl w-full text-center">{m.employee_arbeitsverhaeltnis_legend()}</h3>
	<Table
		data={entries}
		columnDefinition={[
			{
				type: 'display',
				header: m.employee_arbeitsverhaeltnis_table_von(),
				render: (row) => formatDate(row.von)
			},
			{
				type: 'display',
				header: m.employee_arbeitsverhaeltnis_table_bis(),
				render: (row) => formatDate(row.bis)
			},
			{
				type: 'data',
				header: m.employee_arbeitsverhaeltnis_table_prozent(),
				accessor: 'pensumProzent'
			},
			{
				type: 'button',
				header: m.employee_arbeitsverhaeltnis_table_actions(),
				buttonIcon: Trash,
				onClick: (row) => deleteEntry(row.id)
			}
		]}
	/>
	<fieldset class="fieldset">
		<label for="arbeitsverhaeltnis-von" class="label"
			>{m.employee_arbeitsverhaeltnis_von_label()}</label
		>
		<Input id="arbeitsverhaeltnis-von" type="date" class="w-full" bind:value={von} />

		<label for="arbeitsverhaeltnis-prozent" class="label"
			>{m.employee_arbeitsverhaeltnis_prozent_label()}</label
		>
		<Input
			id="arbeitsverhaeltnis-prozent"
			type="number"
			class="w-full"
			min={1}
			max={100}
			bind:value={pensumProzent}
		/>
		<Button class="mt-4 w-full" onclick={saveEntry}>{m.employee_arbeitsverhaeltnis_submit()}</Button
		>
	</fieldset>
</div>
