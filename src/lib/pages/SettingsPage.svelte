<script lang="ts">
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { locale, changeLocale, AVAILABLE_LOCALES } from '$lib/stores/locale';
	import { expertMode } from '$lib/stores/expertMode';
	import { Moon, Sun, Palette, Shield, Globe } from '$lib/icons';
	import Icon from '$lib/components/Icon.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import ExpertSettings from '$lib/components/settings/ExpertSettings.svelte';
	import { alertQueue } from '$lib/stores/alert';
	import { m } from '@/paraglide/messages.js';

	const languageLabels: Record<string, () => string> = {
		de: m.language_de,
		it: m.language_it
	};

	const TAPS_REQUIRED = 7;
	const TAP_WINDOW_MS = 2000;

	let tapCount = 0;
	let tapResetTimer: ReturnType<typeof setTimeout> | undefined;

	function handleTitleTap() {
		tapCount += 1;

		clearTimeout(tapResetTimer);
		tapResetTimer = setTimeout(() => {
			tapCount = 0;
		}, TAP_WINDOW_MS);

		if (tapCount < TAPS_REQUIRED) return;

		tapCount = 0;
		clearTimeout(tapResetTimer);

		const nowEnabled = !$expertMode;
		expertMode.set(nowEnabled);
		alertQueue.queue({
			type: nowEnabled ? 'success' : 'info',
			message: nowEnabled ? m.settings_expert_unlocked() : m.settings_expert_locked()
		});
	}
</script>

<div class="space-y-6">
	<PageHeader
		icon={Shield}
		title={m.settings_title()}
		subtitle={m.settings_subtitle()}
		onIconClick={handleTitleTap}
	/>

	<!-- Theme Settings -->
	<div
		class="card bg-base-200 border-base-300 duration-sbb ease-sbb hover:shadow-sbb-1 border shadow-sm transition-shadow"
	>
		<div class="card-body">
			<h2 class="card-title">
				<Icon icon={Palette} size={24} />
				{m.settings_appearance()}
			</h2>

			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">{m.settings_theme()}</span>
					<div class="gap-3 flex items-center">
						<Icon icon={$theme === 'light' ? Sun : Moon} size={20} />
						<input
							type="checkbox"
							class="toggle toggle-primary"
							checked={$theme === 'dark'}
							onchange={toggleTheme}
						/>
					</div>
				</label>
			</div>

			<div class="divider"></div>

			<div class="alert alert-info">
				<Icon icon={Moon} size={20} />
				<span>{m.settings_current_theme({ theme: $theme })}</span>
			</div>
		</div>
	</div>

	<!-- Language Settings -->
	<div
		class="card bg-base-200 border-base-300 duration-sbb ease-sbb hover:shadow-sbb-1 border shadow-sm transition-shadow"
	>
		<div class="card-body">
			<h2 class="card-title">
				<Icon icon={Globe} size={24} />
				{m.settings_language()}
			</h2>

			<div class="form-control">
				<select
					class="select select-bordered w-full"
					value={$locale}
					onchange={(e) => changeLocale(e.currentTarget.value as typeof $locale)}
				>
					{#each AVAILABLE_LOCALES as availableLocale (availableLocale)}
						<option value={availableLocale}>{languageLabels[availableLocale]()}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>

	{#if $expertMode}
		<ExpertSettings />
	{/if}
</div>
