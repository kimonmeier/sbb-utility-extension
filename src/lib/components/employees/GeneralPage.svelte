<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { Button, Input, Table } from '$lib/components/ui';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { Trash, PersonStanding } from '$lib/icons';
	import { navigateTo } from '@/lib/stores/navigation';
	import PageHeader from '$lib/components/PageHeader.svelte';
	let employees: { id: string; name: string; employeeIdentification: string }[] = $state([]);
	let name: string = $state('');
	let employeeIdentification: string = $state('');

	async function fetchEmployees() {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_EPMLOYEES');

		if (result.success) {
			employees = result.employees || [];
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_error_fetch({ error: result.error ?? '' })
			});
		}
	}

	async function deleteEmployee(employeeId: string) {
		const result = await sendWorkerDataMessage('DELETE_DB', 'DELETE_EMPLOYEE', { employeeId });

		if (result.success) {
			await fetchEmployees();
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_error_delete({ error: result.error ?? '' })
			});
		}
	}

	async function createEmployee() {
		if (!name || !employeeIdentification) {
			alertQueue.queue({ type: 'error', message: m.employee_error_missing_fields() });
			return;
		}

		let upperCaseEmployeeId = employeeIdentification.toUpperCase();

		let employeeIdPattern = /^(E|U)([0-9]{6})$/;
		if (!employeeIdPattern.test(upperCaseEmployeeId)) {
			alertQueue.queue({ type: 'error', message: m.employee_error_invalid_id() });
			return;
		}

		const result = await sendWorkerDataMessage('INSERT_DB', 'INSERT_EMPLOYEE', {
			name,
			employeeIdentification: upperCaseEmployeeId
		});

		if (result.success) {
			await fetchEmployees();
			name = '';
			employeeIdentification = '';
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_error_create({ error: result.error ?? '' })
			});
		}
	}

	function openDetailPage(employeeId: string) {
		navigateTo('employees', employeeId);
	}

	$effect(() => {
		fetchEmployees();
	});
</script>

<PageHeader icon={PersonStanding} title={m.employee_page_title()} />
<div class="bg-base-100 rounded-t-3xl p-4 mt-4">
	<Table
		data={employees}
		onClick={(row) => openDetailPage(row.id)}
		columnDefinition={[
			{ type: 'data', header: m.employee_table_name(), accessor: 'name' },
			{
				type: 'data',
				header: m.employee_table_id(),
				accessor: 'employeeIdentification',
				sortFunction: (a, b) => a.employeeIdentification.localeCompare(b.employeeIdentification),
				allowSorting: true
			},
			{
				type: 'button',
				header: m.employee_table_actions(),
				buttonIcon: Trash,
				onClick: (row) => deleteEmployee(row.id)
			}
		]}
	/>
</div>
<div class="bg-base-100 rounded-b-3xl pt-10 p-5">
	<fieldset class="fieldset">
		<legend class="fieldset-legend">{m.employee_form_legend()}</legend>
		<label for="name" class="label">{m.employee_form_name_label()}</label>
		<Input id="name" type="text" class="input input-bordered w-full" bind:value={name} />
		<label for="employeeIdentification" class="label">{m.employee_form_id_label()}</label>
		<Input
			id="employeeIdentification"
			type="text"
			class="input input-bordered w-full"
			bind:value={employeeIdentification}
		/>
		<Button class="mt-4 w-full" onclick={createEmployee}>{m.employee_form_submit()}</Button>
	</fieldset>
</div>
