<script lang="ts">
	import { onMount } from "svelte";
	import { sendWorkerDataMessage } from "../../background/messages/messageSender";
	import Icon from "../components/Icon.svelte";
	import { Trash } from "@lucide/svelte";
	import { alertQueue } from "../stores/alert";

    let employees: { id: string; name: string; employeeIdentification: string; }[] = $state([]);
    let name: string = $state("");
    let employeeIdentification: string = $state("");

    async function fetchEmployees() {
        const result = await sendWorkerDataMessage("QUERY_DB", "GET_EPMLOYEES");

        if (result.success) {
            employees = result.employees || [];
        } else {
            alertQueue.queue({ type: "error", message: "Fehler beim Abrufen der Mitarbeiter: " + result.error });
        }

        employees = result.employees || [];
    }

    async function deleteEmployee(employeeId: string) {
        const result = await sendWorkerDataMessage("DELETE_DB", "DELETE_EMPLOYEE", { employeeId });

        if (result.success) {
            await fetchEmployees();
        } else {
            alertQueue.queue({ type: "error", message: "Fehler beim Löschen des Mitarbeiters: " + result.error });
        }
    }

    async function createEmployee() {
        if (!name || !employeeIdentification) {
            alertQueue.queue({ type: "error", message: "Bitte Name und Mitarbeiter-ID ausfüllen." });
            return;
        }

        let upperCaseEmployeeId = employeeIdentification.toUpperCase();

        let employeeIdPattern = /^(E|U)([0-9]{6})$/;
        if (!employeeIdPattern.test(upperCaseEmployeeId)) {
            alertQueue.queue({ type: "error", message: "Mitarbeiter-ID muss mit 'E' oder 'U' beginnen, gefolgt von 6 Ziffern." });
            return;
        }

        const result = await sendWorkerDataMessage("INSERT_DB", "INSERT_EMPLOYEE", { name, employeeIdentification: upperCaseEmployeeId });

        if (result.success) {
            await fetchEmployees();
            name = "";
            employeeIdentification = "";
        } else {
            alertQueue.queue({ type: "error", message: "Fehler beim Erstellen des Mitarbeiters: " + result.error });
        }
    }

    onMount(async () => {
        await fetchEmployees();
    });
</script>

<div class="flex flex-col">
    <div class="bg-base-100 rounded-t-3xl p-4">
        <h1 class="text-2xl text-center w-full">Mitarbeiter</h1>
        <table class="table w-full">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Mitarbeiter-ID</th>
                </tr>
            </thead>
            <tbody>
                {#each employees as employee}
                    <tr>
                        <td>{employee.name}</td>
                        <td>{employee.employeeIdentification}</td>
                        <td>
                            <button class="btn btn-sm btn-primarx" onclick={() => deleteEmployee(employee.id)}>
                                <Icon icon={Trash} />
                            </button>
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
    <div class="bg-base-100 rounded-b-3xl pt-10 p-5">
        <fieldset class="fieldset">
            <legend class="fieldset-legend">Mitarbeiter erfassen</legend>
            <label for="name" class="label">Name</label>
            <input id="name" type="text" class="input input-bordered w-full" bind:value={name} />
            <label for="employeeIdentification" class="label">Mitarbeiter-ID</label>
            <input id="employeeIdentification" type="text" class="input input-bordered w-full" bind:value={employeeIdentification} />
            <button class="btn btn-primary w-full mt-4" onclick={createEmployee}>Mitarbeiter erfassen</button>
        </fieldset>
    </div>
</div>