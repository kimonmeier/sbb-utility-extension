<script lang="ts">
	import { sendWorkerMessage } from "../../../../background/messages/messageSender";

    let isSuccess = $state(false);
    let errorMessage: string | null = $state(null);
    let isLoading = $state(false);

    async function syncApi() {
        isLoading = true;

        const result = await sendWorkerMessage("SYNC_API_WORKER");

        isLoading = false;
        isSuccess = result.success;
        errorMessage = result.error || null;
    }
</script>


<div class="rounded-xl bg-base-100 p-3 shadow-xl">
    <div class="text font-bold text-3xl">
        Daten synchronisieren
    </div>
    <div class="text">
        Hiermit können die Daten synchronisiert werden
    </div>
    {#if isLoading}
        <button class="btn btn-success loading" disabled>
            Synchronisation läuft...
        </button>
    {:else if isSuccess}
        <button class="btn btn-success" disabled>
            Synchronisation erfolgreich!
        </button>
    {:else}
        <button class="btn btn-success" onclick={syncApi}>
            Synchronisation starten
        </button>
    {/if}
    {#if errorMessage}
        <div class="alert alert-error mt-3">
            Fehler: {errorMessage}
        </div>
    {/if}
</div>
