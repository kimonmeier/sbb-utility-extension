<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { sendWorkerDataMessage } from '@/background/messages/messageSender';
	import { alertQueue } from '@/lib/stores/alert';
	import { onMount } from 'svelte';
	import EmployeeFerienanspruch from './EmployeeFerienanspruch.svelte';
	import EmployeeArbeitsverhaeltnis from './EmployeeArbeitsverhaeltnis.svelte';

	const props: {
		employeeId: string;
	} = $props();

	let employeeDetails: { id: string; name: string; employeeIdentification: string } | null =
		$state(null);

	onMount(async () => {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_BY_ID', {
			employeeId: props.employeeId
		});

		if (result.success) {
			employeeDetails = result.employee!;
		} else {
			alertQueue.queue({
				type: 'error',
				message: `Error fetching employee details: ${result.error ?? ''}`
			});
		}
	});
</script>

{#if employeeDetails}
	<div class="bg-base-100 rounded-t-3xl p-4">
		<h1 class="text-2xl w-full text-center">
			Mitarbeiter {employeeDetails.name} ({employeeDetails.employeeIdentification})
		</h1>
	</div>
	<div class="gap-4 mt-4 flex flex-col">
		<h2 class="text-xl w-full text-center">{m.employee_settings_title()}</h2>
		<EmployeeFerienanspruch employeeId={props.employeeId} />
		<EmployeeArbeitsverhaeltnis employeeId={props.employeeId} />
	</div>
{:else}
	<div class="bg-base-100 rounded-t-3xl p-4">
		<h1 class="text-2xl w-full text-center">Loading employee details...</h1>
	</div>
{/if}
