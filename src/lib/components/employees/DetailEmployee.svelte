<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { sendWorkerDataMessage } from '@/background/messages/messageSender';
	import { alertQueue } from '@/lib/stores/alert';
	import { navigateTo } from '@/lib/stores/navigation';
	import { onMount } from 'svelte';
	import EmployeeFerienanspruch from './EmployeeFerienanspruch.svelte';
	import EmployeeArbeitsverhaeltnis from './EmployeeArbeitsverhaeltnis.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { ChevronLeft, PersonStanding } from '$lib/icons';

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
				message: m.employee_detail_error_fetch({ error: result.error ?? '' })
			});
		}
	});
</script>

<button
	class="gap-1 duration-sbb ease-sbb text-neutral hover:text-primary mb-3 flex items-center text-sm font-medium transition-colors"
	onclick={() => navigateTo('employees')}
>
	<ChevronLeft size={18} />
	{m.employee_detail_back()}
</button>

{#if employeeDetails}
	<PageHeader
		icon={PersonStanding}
		title={m.employee_detail_title({
			name: employeeDetails.name,
			employeeIdentification: employeeDetails.employeeIdentification
		})}
		subtitle={m.employee_settings_title()}
	/>
	<div class="gap-4 mt-4 flex flex-col">
		<EmployeeFerienanspruch employeeId={props.employeeId} />
		<EmployeeArbeitsverhaeltnis employeeId={props.employeeId} />
	</div>
{:else}
	<div class="bg-base-100 rounded-t-3xl p-4">
		<h1 class="text-2xl w-full text-center">{m.employee_detail_loading()}</h1>
	</div>
{/if}
