<script lang="ts">
	import { fade } from "svelte/transition";
	import { currentAlert } from "../stores/alert";
	import { Alert } from "./ui";
</script>

<div class="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
    {#if $currentAlert}
        {#key $currentAlert.id}
            <Alert variant={$currentAlert.type} showIcon={true}>
                {$currentAlert.message}
            </Alert>
        {/key}
    {/if}
</div>