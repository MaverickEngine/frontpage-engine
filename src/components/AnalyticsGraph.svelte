<script lang="ts">
    import Pie from './Pie.svelte';
    export let hits_last_hour;
    export let total_hits;
    const colors = [
        "#003f5c",
        "#58508d",
        "#bc5090",
        "#ff6361",
        "#ffa600",
    ];
    const height = 60;
</script>

{#if (hits_last_hour !== null)}
<div class="analytics-graph" style="height: {height}px;">
    <Pie size={height} percent={ hits_last_hour / total_hits * 100 } />
    { Number(hits_last_hour).toLocaleString() }
</div>
{/if}

<style>
    .analytics-graph {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: center;
    }
</style>