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

	type Zuweisung = {
		id: string;
		jahr: number;
		planId: string;
		gruppe: string;
		zyklusLaenge: number;
		linie: number;
		quelle: 'AUTO' | 'MANUAL';
		trefferquote: number | null;
	};

	type Plan = { id: string; gruppe: string; zyklusLaenge: number };

	type Bewertung = {
		gruppe: string;
		planId: string;
		erkannt: boolean;
		linie: number | null;
		trefferquote: number;
		bewertbareTage: number;
		grund: string | null;
	};

	let entries: Zuweisung[] = $state([]);
	let plaene: Plan[] = $state([]);
	let bewertungen: Bewertung[] = $state([]);
	let jahr: string = $state(String(new Date().getFullYear()));
	let planId: string = $state('');
	let linie: string = $state('');

	const gewaehltesJahr = $derived(parseInt(jahr, 10));
	const gewaehlterPlan = $derived(plaene.find((plan) => plan.id === planId));
	const zuweisungDesJahres = $derived(entries.find((entry) => entry.jahr === gewaehltesJahr));

	const rowDefinitions = $derived.by(() =>
		entries
			.slice()
			.sort((a, b) => a.jahr - b.jahr)
			.map((entry): RowDefinition<Zuweisung> => ({ id: entry.id, data: entry }))
	);

	function quelleLabel(entry: Zuweisung): string {
		if (entry.quelle === 'MANUAL') {
			return m.employee_linie_quelle_manual();
		}

		return m.employee_linie_quelle_auto({ quote: entry.trefferquote ?? 0 });
	}

	function grundLabel(grund: string | null): string {
		if (grund === 'zu-wenig-daten') {
			return m.employee_linie_grund_zu_wenig_daten();
		}
		if (grund === 'mehrdeutig') {
			return m.employee_linie_grund_mehrdeutig();
		}
		return m.employee_linie_grund_keine_uebereinstimmung();
	}

	async function fetchEntries() {
		const result = await sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_LINIE', {
			employeeId: props.employeeId
		});

		if (result.success) {
			entries = result.zuweisungen || [];
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_linie_error_fetch({ error: result.error ?? '' })
			});
		}
	}

	async function fetchPlaeneUndBewertung(fuerJahr: number) {
		const plaeneResult = await sendWorkerDataMessage('QUERY_DB', 'GET_JAHRESTOURENPLAENE', {
			jahr: fuerJahr
		});

		if (!plaeneResult.success) {
			alertQueue.queue({
				type: 'error',
				message: m.employee_linie_error_fetch({ error: plaeneResult.error ?? '' })
			});
			return;
		}

		plaene = plaeneResult.plaene || [];
		if (!plaene.some((plan) => plan.id === planId)) {
			planId = plaene[0]?.id ?? '';
		}

		const bewertungResult = await sendWorkerDataMessage(
			'QUERY_DB',
			'GET_EMPLOYEE_LINIEN_BEWERTUNG',
			{ employeeId: props.employeeId, jahr: fuerJahr }
		);
		bewertungen = bewertungResult.success ? (bewertungResult.bewertungen ?? []) : [];
	}

	async function saveEntry() {
		const parsedJahr = parseInt(jahr, 10);
		const parsedLinie = parseInt(linie, 10);

		if (Number.isNaN(parsedJahr) || !planId || Number.isNaN(parsedLinie)) {
			alertQueue.queue({ type: 'error', message: m.employee_linie_error_missing_fields() });
			return;
		}

		const maxLinie = gewaehlterPlan?.zyklusLaenge ?? 0;
		if (parsedLinie < 1 || parsedLinie > maxLinie) {
			alertQueue.queue({
				type: 'error',
				message: m.employee_linie_error_invalid_linie({ max: maxLinie })
			});
			return;
		}

		const result = await sendWorkerDataMessage('INSERT_DB', 'UPSERT_EMPLOYEE_LINIE', {
			employeeId: props.employeeId,
			jahr: parsedJahr,
			planId,
			linie: parsedLinie
		});

		if (result.success) {
			await fetchEntries();
			linie = '';
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_linie_error_save({ error: result.error ?? '' })
			});
		}
	}

	async function deleteEntry(id: string) {
		const result = await sendWorkerDataMessage('DELETE_DB', 'DELETE_EMPLOYEE_LINIE', { id });

		if (result.success) {
			await fetchEntries();
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_linie_error_delete({ error: result.error ?? '' })
			});
		}
	}

	$effect(() => {
		fetchEntries();
	});

	$effect(() => {
		const fuerJahr = parseInt(jahr, 10);
		if (!Number.isNaN(fuerJahr)) {
			fetchPlaeneUndBewertung(fuerJahr);
		}
	});
</script>

<div class="bg-base-100 rounded-3xl p-4">
	<h3 class="text-xl w-full text-center">{m.employee_linie_legend()}</h3>
	<p class="text-sm text-neutral mt-2">{m.employee_linie_hint()}</p>

	<Table
		data={rowDefinitions}
		columnDefinition={[
			{
				type: 'data',
				header: m.employee_linie_table_year(),
				accessor: 'jahr',
				sortFunction: (a, b) => a.jahr - b.jahr,
				allowSorting: true
			},
			{ type: 'data', header: m.employee_linie_table_gruppe(), accessor: 'gruppe' },
			{ type: 'data', header: m.employee_linie_table_linie(), accessor: 'linie' },
			{
				type: 'calculated',
				header: m.employee_linie_table_quelle(),
				calculate: (row) => quelleLabel(row)
			},
			{
				type: 'button',
				header: m.employee_linie_table_actions(),
				buttonIcon: Trash,
				onClick: (row) => deleteEntry(row.id)
			}
		]}
	/>

	{#if !Number.isNaN(gewaehltesJahr) && plaene.length === 0}
		<p class="text-sm text-warning mt-3">{m.employee_linie_no_plans({ jahr: gewaehltesJahr })}</p>
	{:else if !zuweisungDesJahres}
		<p class="text-sm text-warning mt-3">
			{m.employee_linie_not_detected({ jahr: gewaehltesJahr })}
		</p>
		{#if bewertungen.length > 0}
			<p class="text-sm mt-2 font-medium">{m.employee_linie_bewertung_title()}</p>
			<ul class="text-sm text-neutral pl-5 list-disc">
				{#each bewertungen as bewertung (bewertung.planId)}
					<li>
						{m.employee_linie_bewertung_row({
							gruppe: bewertung.gruppe,
							quote: bewertung.trefferquote,
							tage: bewertung.bewertbareTage
						})}
						{#if bewertung.grund}
							&mdash; {grundLabel(bewertung.grund)}
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}

	<fieldset class="fieldset">
		<label for="linie-jahr" class="label">{m.employee_linie_year_label()}</label>
		<Input id="linie-jahr" type="number" class="w-full" bind:value={jahr} />

		<label for="linie-gruppe" class="label">{m.employee_linie_gruppe_label()}</label>
		<select id="linie-gruppe" class="select select-bordered w-full" bind:value={planId}>
			{#each plaene as plan (plan.id)}
				<option value={plan.id}>{plan.gruppe}</option>
			{/each}
		</select>

		<label for="linie-nummer" class="label">{m.employee_linie_linie_label()}</label>
		<Input
			id="linie-nummer"
			type="number"
			min={1}
			max={gewaehlterPlan?.zyklusLaenge}
			class="w-full"
			bind:value={linie}
		/>

		<Button class="mt-4 w-full" onclick={saveEntry} disabled={plaene.length === 0}>
			{m.employee_linie_submit()}
		</Button>
	</fieldset>
</div>
