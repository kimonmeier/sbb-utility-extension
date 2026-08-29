<script lang="ts">
	import SyncStatus from '$lib/components/home/sync/SyncStatus.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { Home } from '$lib/icons';
	import { m } from '@/paraglide/messages';
</script>

<PageHeader icon={Home} title={m.nav_home()} />
<SyncStatus />
