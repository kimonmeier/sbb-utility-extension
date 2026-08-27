<script lang="ts">
	import { theme, toggleTheme } from "../stores/theme";
	import { locale, changeLocale, AVAILABLE_LOCALES } from "../stores/locale";
	import { Moon, Sun, Palette, Shield, Globe } from "../icons";
	import Icon from "../components/Icon.svelte";
	import { m } from "../../paraglide/messages.js";

	const languageLabels: Record<string, () => string> = {
		de: m.language_de,
		it: m.language_it,
	};
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Icon icon={Shield} size={32} class="text-primary" />
		<div>
			<h1 class="text-3xl font-bold">{m.settings_title()}</h1>
			<p class="text-sm opacity-70">{m.settings_subtitle()}</p>
		</div>
	</div>

	<!-- Theme Settings -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">
				<Icon icon={Palette} size={24} />
				{m.settings_appearance()}
			</h2>

			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">{m.settings_theme()}</span>
					<div class="flex items-center gap-3">
						<Icon icon={$theme === "light" ? Sun : Moon} size={20} />
						<input
							type="checkbox"
							class="toggle toggle-primary"
							checked={$theme === "dark"}
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
	<div class="card bg-base-200 shadow-xl">
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
					{#each AVAILABLE_LOCALES as availableLocale}
						<option value={availableLocale}>{languageLabels[availableLocale]()}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>
</div>
