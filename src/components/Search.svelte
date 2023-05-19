<script lang="ts">
    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    export let value = "";
    let previous_value = "";

    const doSearch = () => {
        if (value === previous_value) return;
        dispatch("search", value);
        previous_value = value;
    }

    const doClear = () => {
        value = "";
        if (previous_value == "") return;
        previous_value = "";
        dispatch("search", value);
    }
</script>

<input 
    type="text" 
    placeholder="Search"
    bind:value={value}
    on:keydown={e => e.key == "Enter" && doSearch()}
/>
<button on:click={doSearch} on:keypress={e => e.key === "Enter" && doSearch}>Search</button>
<button on:click={doClear} on:keypress={e => e.key === "Enter" && doClear}>Clear</button>