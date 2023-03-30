<script lang="ts">
    export let analytics;
    const colors = [
        "#003f5c",
        "#58508d",
        "#bc5090",
        "#ff6361",
        "#ffa600",
    ];
    const height = 80;
    const max_hit = Math.max(...analytics.hits);
</script>

{#if (analytics && analytics.hits)}
<div class="analytics-graph" style="height: {height}px;">
    {#each analytics.hits as hit, i}
        <div class="hit" style="height: {hit/max_hit * height}%; background-color: {colors[i]} "></div>
    {/each}
</div>
{/if}

<style>
    .analytics-graph {
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-end;
    }

    .hit {
        width: 20px;
        background-color: #000;
        margin: 0 1px;
    }
</style>