<script lang="ts">
	import { theme, toggleTheme } from "../stores/theme";
	import { Moon, Sun, Palette, Shield } from "../icons";
	import Icon from "../components/Icon.svelte";
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center gap-3">
		<Icon icon={Shield} size={32} class="text-primary" />
		<div>
			<h1 class="text-3xl font-bold">Settings</h1>
			<p class="text-sm opacity-70">Customize your extension preferences</p>
		</div>
	</div>

	<!-- Theme Settings -->
	<div class="card bg-base-200 shadow-xl">
		<div class="card-body">
			<h2 class="card-title">
				<Icon icon={Palette} size={24} />
				Appearance
			</h2>

			<div class="form-control">
				<label class="label cursor-pointer">
					<span class="label-text">Theme</span>
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
				<span>Current theme: <strong class="capitalize">{$theme}</strong></span>
			</div>
		</div>
	</div>
</div>
