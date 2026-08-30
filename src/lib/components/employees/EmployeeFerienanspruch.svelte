<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { Button, Input, Table } from '$lib/components/ui';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { Trash } from '$lib/icons';
	import type { RowDefinition } from '$lib/components/ui/Table.types';

	const props: {
		employeeId: string;
	} = $props();

	let entries: { id: string; jahr: number; ferienAnspruchInTagen: number }[] = $state([]);
	let jahr: string = $state(String(new Date().getFullYear()));
	let ferienAnspruchInTagen: string = $state('');

	const rowDefinitions = $derived.by(() =>
		entries.map((entry): RowDefinition<typeof entry> => {
			return {
				id: entry.id,
				data: entry,
				calculateClasses: () => ''
			};
		})
	);

	async function fetchEntries() {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_FERIENANSPRUCH', {
			employeeId: props.employeeId
		});

		if (result.success) {
			entries = result.ferienanspruch || [];
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_ferien_error_fetch({ error: result.error ?? '' })
			});
		}
	}

	async function saveEntry() {
		const parsedJahr = parseInt(jahr, 10);
		const parsedFerientage = parseInt(ferienAnspruchInTagen, 10);

		if (Number.isNaN(parsedJahr) || Number.isNaN(parsedFerientage)) {
			alertQueue.queue({ type: 'error', message: m.employee_ferien_error_missing_fields() });
			return;
		}

		const result = await sendWorkerDataMessage('INSERT_DB', 'UPSERT_EMPLOYEE_FERIENANSPRUCH', {
			employeeId: props.employeeId,
			jahr: parsedJahr,
			ferienAnspruchInTagen: parsedFerientage
		});

		if (result.success) {
			await fetchEntries();
			ferienAnspruchInTagen = '';
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_ferien_error_save({ error: result.error ?? '' })
			});
		}
	}

	async function deleteEntry(id: string) {
		const result = await sendWorkerDataMessage('DELETE_DB', 'DELETE_EMPLOYEE_FERIENANSPRUCH', {
			id
		});

		if (result.success) {
			await fetchEntries();
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_ferien_error_delete({ error: result.error ?? '' })
			});
		}
	}

	$effect(() => {
		fetchEntries();
	});
</script>

<div class="bg-base-100 rounded-3xl p-4">
	<h3 class="text-xl w-full text-center">{m.employee_ferien_legend()}</h3>
	<Table
		data={rowDefinitions}
		columnDefinition={[
			{
				type: 'data',
				header: m.employee_ferien_table_year(),
				accessor: 'jahr',
				sortFunction: (a, b) => a.jahr - b.jahr,
				allowSorting: true
			},
			{
				type: 'data',
				header: m.employee_ferien_table_days(),
				accessor: 'ferienAnspruchInTagen'
			},
			{
				type: 'button',
				header: m.employee_ferien_table_actions(),
				buttonIcon: Trash,
				onClick: (row) => deleteEntry(row.id)
			}
		]}
	/>
	<fieldset class="fieldset">
		<label for="ferien-jahr" class="label">{m.employee_ferien_year_label()}</label>
		<Input id="ferien-jahr" type="number" class="w-full" bind:value={jahr} />
		<label for="ferien-tage" class="label">{m.employee_ferien_days_label()}</label>
		<Input
			id="ferien-tage"
			type="number"
			min={20}
			max={40}
			class="w-full"
			bind:value={ferienAnspruchInTagen}
		/>
		<Button class="mt-4 w-full" onclick={saveEntry}>{m.employee_ferien_submit()}</Button>
	</fieldset>
</div>
