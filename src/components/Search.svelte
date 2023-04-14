<script lang="ts">
    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    export let value = "";
    export let debounce = 500;
    let timer;

    const doSearch = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            dispatch("search", value);
        }, debounce);
    }
</script>

<input 
    type="text" 
    placeholder="Search"
    bind:value={value}
    on:keyup={doSearch}
/>