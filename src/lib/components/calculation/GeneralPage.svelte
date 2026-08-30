<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { navigateTo } from '$lib/stores/navigation';
	import { Calculator } from '$lib/icons';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Table from '$lib/components/ui/Table.svelte';
	import type { RowDefinition } from '@/lib/components/ui/Table.types';

	type CalculationEntry = {
		id: string;
		name: string;
		employeeId: string;
		ruhetage: number;
		kompensationstage: number;
		ferien: number;
	};
	let calculations: CalculationEntry[] = $state([]);

	async function loadData() {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_ALL_EMPLOYEE_CALUCULATION');

		if (result.success) {
			calculations = result.calculations || [];
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.calc_error_fetch({ error: result.error ?? '' })
			});
		}
	}

	const rowDefinitions = $derived.by(() =>
		calculations.map((calc): RowDefinition<CalculationEntry> => {
			return {
				id: calc.id,
				data: calc,
				calculateClasses: (row) => {
					const total = row.ruhetage + row.kompensationstage;
					if (total < 0) {
						return 'bg-red-800';
					} else if (total > 0) {
						return 'bg-green-800';
					}
					return '';
				}
			};
		})
	);

	function openDetailPage(employeeId: string) {
		navigateTo('caluclations', employeeId);
	}

	$effect(() => {
		loadData();
	});
</script>

<PageHeader icon={Calculator} title={m.calc_page_title()} subtitle={m.calc_page_subtitle()} />
<div class="bg-base-100 rounded-3xl p-4 mt-4">
	<Table
		data={rowDefinitions}
		onClick={(row) => openDetailPage(row.id)}
		columnDefinition={[
			{ type: 'data', header: m.calc_table_name(), accessor: 'name' },
			{
				type: 'data',
				header: m.calc_table_id(),
				accessor: 'employeeId',
				sortFunction: (a, b) => a.employeeId.localeCompare(b.employeeId),
				allowSorting: true
			},
			{
				type: 'data',
				header: m.calc_table_ruhetage(),
				accessor: 'ruhetage',
				allowSorting: true,
				sortFunction: (a, b) => a.ruhetage - b.ruhetage
			},
			{
				type: 'data',
				header: m.calc_table_kompensationstage(),
				accessor: 'kompensationstage',
				allowSorting: true,
				sortFunction: (a, b) => a.kompensationstage - b.kompensationstage
			},
			{
				type: 'calculated',
				header: m.calc_table_combined(),
				calculate: (row) => `${row.ruhetage + row.kompensationstage}`,
				allowSorting: true,
				sortFunction: (a, b) =>
					a.ruhetage + a.kompensationstage - (b.ruhetage + b.kompensationstage)
			},
			{
				type: 'data',
				header: m.calc_table_ferien(),
				accessor: 'ferien',
				allowSorting: true,
				sortFunction: (a, b) => a.ferien - b.ferien
			}
		]}
	></Table>
</div>
