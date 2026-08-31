<script lang="ts">
	import { m } from '@/paraglide/messages';
	import { sendWorkerDataMessage } from '$background/messages/messageSender';
	import { alertQueue } from '$lib/stores/alert';
	import { navigateTo } from '$lib/stores/navigation';
	import { onMount } from 'svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { ChevronLeft, Calculator } from '$lib/icons';
	import type { AccountId } from '$background/caluclations/types';
	import type { CalculationLogEntry } from '$background/caluclations/rules/types';

	const props: {
		employeeId: string;
	} = $props();

	type Calculation = {
		year: number;
		scores: { ferien: number; kompensationstage: number; ruhetage: number };
		soll: { ruhetage: number; kompensationstage: number };
		geplant: { ruhetage: number; kompensationstage: number };
		hochgerechnet: { ruhetage: number; kompensationstage: number; daten: string[] };
		ferienAnteil: { ruhetage: number; kompensationstage: number };
		kuerzungen: { ruhetage: number; kompensationstage: number; ferien: number };
		aktuell: Partial<Record<AccountId, number>>;
		log: CalculationLogEntry[];
	};

	let employeeDetails: { id: string; name: string; employeeIdentification: string } | null =
		$state(null);
	let calculation: Calculation | null = $state(null);

	onMount(async () => {
		const [employeeResult, calculationResult] = await Promise.all([
			sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_BY_ID', { employeeId: props.employeeId }),
			sendWorkerDataMessage('QUERY_DB', 'GET_EMPLOYEE_CALUCULATION', {
				employeeId: props.employeeId
			})
		]);

		if (employeeResult.success) {
			employeeDetails = employeeResult.employee!;
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.employee_detail_error_fetch({ error: employeeResult.error ?? '' })
			});
		}

		if (calculationResult.success) {
			calculation = calculationResult.calculation!;
		} else {
			alertQueue.queue({
				type: 'error',
				message: m.calc_error_fetch({ error: calculationResult.error ?? '' })
			});
		}
	});

	// "Prognose" (scores.*) is the projected year-end balance computed by the rule
	// engine; "Aktuell" is the last known balance from a real SAP Zeitkonto snapshot.
	// Konto 5 (GLZ-Saldo) has no engine calculation yet, so its Prognose/Differenz
	// stay unavailable on purpose.
	const prognoseRows = $derived.by(() => {
		if (!calculation) {
			return [];
		}

		return (
			[
				{ accountId: '5', label: m.calc_konto_glz(), prognose: undefined },
				{ accountId: '9040', label: m.calc_konto_ferien(), prognose: calculation.scores.ferien },
				{
					accountId: '9046',
					label: m.calc_konto_ausgleichstage(),
					prognose: calculation.scores.kompensationstage
				},
				{ accountId: '9047', label: m.calc_konto_ruhetage(), prognose: calculation.scores.ruhetage }
			] satisfies { accountId: AccountId; label: string; prognose: number | undefined }[]
		).map((row) => {
			const aktuell = calculation!.aktuell[row.accountId] ?? 0;
			const differenz = row.prognose !== undefined ? row.prognose - aktuell : undefined;
			return { ...row, aktuell, differenz };
		});
	});

	function formatBalance(value: number): string {
		return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
	}

	function balanceClass(value: number): string {
		return value >= 0 ? 'text-success' : 'text-error';
	}

	// The engine's score for an account already starts at that account's Soll and
	// is reduced by 1 for every day charged against it, so the score itself IS the
	// remaining balance: positive = entitlement not yet used up (zu wenig genommen),
	// negative = more was scheduled than entitled (zu viel genommen).
	function verdictLabel(remaining: number): string {
		if (remaining < 0) {
			return m.calc_zu_viel({ count: Math.abs(remaining).toFixed(2) });
		}
		if (remaining > 0) {
			return m.calc_zu_wenig({ count: remaining.toFixed(2) });
		}
		return m.calc_ausgeglichen();
	}

	function verdictClass(remaining: number): string {
		if (remaining < 0) {
			return 'text-error';
		}
		if (remaining > 0) {
			return 'text-warning';
		}
		return 'text-success';
	}

	const rechnerCards = $derived.by(() => {
		if (!calculation) {
			return [];
		}

		return [
			{
				key: 'ruhetage',
				title: m.calc_card_ruhetage_title(),
				soll: calculation.soll.ruhetage,
				geplant: calculation.geplant.ruhetage,
				ferien: calculation.ferienAnteil.ruhetage,
				kuerzungen: calculation.kuerzungen.ruhetage,
				remaining: calculation.scores.ruhetage
			},
			{
				key: 'kompensationstage',
				title: m.calc_card_kompensationstage_title(),
				soll: calculation.soll.kompensationstage,
				geplant: calculation.geplant.kompensationstage,
				ferien: calculation.ferienAnteil.kompensationstage,
				kuerzungen: calculation.kuerzungen.kompensationstage,
				remaining: calculation.scores.kompensationstage
			}
		];
	});

	// Tage, die nicht aus dem publizierten Tourenplan stammen, sondern ueber die
	// Linie hochgerechnet wurden. Dient nur der Kennzeichnung im Log.
	const hochgerechneteDaten = $derived.by(() => {
		if (!calculation) {
			return new Set<string>();
		}

		return new Set(calculation.hochgerechnet.daten);
	});

	const kombiniertCard = $derived.by(() => {
		if (!calculation) {
			return null;
		}

		return {
			total:
				calculation.geplant.ruhetage +
				calculation.ferienAnteil.ruhetage +
				calculation.geplant.kompensationstage +
				calculation.ferienAnteil.kompensationstage,
			remaining: calculation.scores.ruhetage + calculation.scores.kompensationstage
		};
	});
</script>

<button
	class="gap-1 duration-sbb ease-sbb text-neutral hover:text-primary mb-3 text-sm font-medium flex items-center transition-colors"
	onclick={() => navigateTo('caluclations')}
>
	<ChevronLeft size={18} />
	{m.calc_detail_back()}
</button>

{#if employeeDetails && calculation}
	<PageHeader
		icon={Calculator}
		title={m.calc_detail_title({
			name: employeeDetails.name,
			employeeIdentification: employeeDetails.employeeIdentification
		})}
		subtitle={m.calc_detail_subtitle({ year: String(calculation.year) })}
	/>

	<div class="gap-4 mt-4 flex flex-col">
		<div class="bg-base-100 rounded-3xl p-4">
			<h3 class="text-xl mb-4 w-full text-center">{m.calc_prognose_title()}</h3>
			<div class="overflow-x-auto">
				<table class="table w-full">
					<thead>
						<tr>
							<th>{m.calc_prognose_konto()}</th>
							<th>{m.calc_prognose_beschreibung()}</th>
							<th>{m.calc_prognose_aktuell()}</th>
							<th>{m.calc_prognose_prognose()}</th>
							<th>{m.calc_prognose_differenz()}</th>
						</tr>
					</thead>
					<tbody>
						{#each prognoseRows as row (row.accountId)}
							<tr>
								<td>{row.accountId}</td>
								<td>{row.label}</td>
								<td>{row.aktuell.toFixed(2)}</td>
								<td>{row.prognose !== undefined ? row.prognose.toFixed(2) : '–'}</td>
								<td class={row.differenz !== undefined ? balanceClass(row.differenz) : ''}>
									{row.differenz !== undefined ? formatBalance(row.differenz) : '–'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-xs mt-2 opacity-60">{m.calc_glz_not_available()}: {m.calc_konto_glz()}</p>
		</div>

		<div class="bg-base-100 rounded-3xl p-4">
			<h3 class="text-xl w-full text-center">
				{m.calc_ruhetag_rechner_title({ year: String(calculation.year) })}
			</h3>
			<p class="text-sm mt-1 text-center opacity-70">
				{m.calc_ruhetag_rechner_subtitle({
					from: `${calculation.year}-01-01`,
					to: `${calculation.year}-12-31`,
					ruhetageSoll: String(calculation.soll.ruhetage),
					kompensationstageSoll: String(calculation.soll.kompensationstage)
				})}
			</p>

			<div class="md:grid-cols-3 gap-4 mt-4 grid grid-cols-1">
				{#each rechnerCards as card (card.key)}
					<div class="bg-base-200 rounded-2xl p-4">
						<p class="text-xs uppercase opacity-60">{card.title}</p>
						<p class="font-semibold mt-1">
							{m.calc_card_soll()}: {card.soll} | {m.calc_card_geplant()}: {card.geplant} | {m.calc_card_ferien()}:
							{card.ferien} | {m.calc_card_gekuerzt()}: {card.kuerzungen} | {m.calc_card_geschaetzt()}:
							0
						</p>
						<p class={`mt-2 ${verdictClass(card.remaining)}`}>
							{verdictLabel(card.remaining)}
						</p>
					</div>
				{/each}

				{#if kombiniertCard}
					<div class="bg-base-200 rounded-2xl p-4">
						<p class="text-xs uppercase opacity-60">{m.calc_card_kombiniert_title()}</p>
						<p class="font-semibold mt-1">{m.calc_card_total()}: {kombiniertCard.total}</p>
						<p class={`mt-2 ${verdictClass(kombiniertCard.remaining)}`}>
							{verdictLabel(kombiniertCard.remaining)}
						</p>
					</div>
				{/if}
			</div>

			<div class="bg-base-200 rounded-2xl p-4 mt-4 text-sm gap-2 flex flex-col opacity-70">
				<p>{m.calc_saturdays_note({ count: String(calculation.soll.kompensationstage) })}</p>
				<p>{m.calc_estimation_note()}</p>
				{#if calculation.hochgerechnet.daten.length > 0}
					<p>
						{m.calc_hochgerechnet_hint({
							count: String(calculation.hochgerechnet.daten.length)
						})}
						{m.calc_card_ruhetage_title()}: {calculation.hochgerechnet.ruhetage} | {m.calc_card_kompensationstage_title()}:
						{calculation.hochgerechnet.kompensationstage}
					</p>
				{:else}
					<p>{m.calc_hochgerechnet_none()}</p>
				{/if}
			</div>
		</div>

		<div class="bg-base-100 rounded-3xl p-4">
			<h3 class="text-xl mb-4 w-full text-center">{m.calc_log_title()}</h3>
			{#if calculation.log.length === 0}
				<p class="text-sm text-center opacity-60">{m.calc_log_empty()}</p>
			{:else}
				<div class="max-h-96 overflow-x-auto overflow-y-auto">
					<table class="table w-full">
						<thead>
							<tr>
								<th>{m.calc_log_date()}</th>
								<th>{m.calc_log_tour()}</th>
								<th>{m.calc_log_konto()}</th>
								<th>{m.calc_log_rule()}</th>
								<th>{m.calc_log_delta()}</th>
							</tr>
						</thead>
						<tbody>
							{#each calculation.log as entry, i (i)}
								<tr>
									<td>
										{entry.date}
										{#if hochgerechneteDaten.has(entry.date)}
											<span class="badge badge-outline badge-sm ml-1">
												{m.calc_log_hochgerechnet()}
											</span>
										{/if}
									</td>
									<td>{entry.tourLabel}</td>
									<td>{entry.outcome.kind === 'apply' ? entry.outcome.accountId : '–'}</td>
									<td>
										{entry.outcome.kind === 'apply' ? entry.outcome.rule : entry.outcome.reason}
									</td>
									<td class={entry.outcome.kind === 'apply' ? 'text-error' : 'opacity-60'}>
										{entry.outcome.kind === 'apply' ? entry.outcome.delta : '–'}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div class="bg-base-100 rounded-t-3xl p-4">
		<h1 class="text-2xl w-full text-center">{m.calc_detail_loading()}</h1>
	</div>
{/if}
