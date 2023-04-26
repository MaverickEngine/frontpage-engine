<script lang="ts">
    const mode = process.env.NODE_ENV;
    import {fade} from 'svelte/transition';
    import AnalyticsGraph from "./AnalyticsGraph.svelte";
    export let post;
    export let hovering;
    export let total_hits;
    export let analytics;
    export let index;
</script>

<td class="column-image">
    {#if post.image}
    <img class="image" width="50" height="50" src={post.image} alt={post.title} />
    {/if}
</td>
{#if (mode=="development")}
<td>{post.slot?.id}</td>
<td>{post.id}</td>
<td>{post.slot?.display_order}</td>
{/if}
<td class="column-title">
    <strong>
        {#if !post.is_blank}
        <a class="row-title" href={post.edit_link}>{post.title}</a>
        {:else}
        {post.title}
        {/if}
    </strong>
    {#if hovering && !post.is_blank}
    <p in:fade out:fade>
        <a target="_blank" href={post.link} rel="noreferrer">View</a> 
        | 
        <a target="_blank" href={post.edit_link} rel="noreferrer">Edit</a> 
    </p>
    {/if}
</td>
<td class="column-author">{post.author}</td>
<td class="column-published">
    {#if !post.is_blank}
    {post.date_published}
    {/if}
</td>
<td class="column-analytics">
    {#if analytics.find(analytic => post.id === analytic.post_id)}
    <AnalyticsGraph hits_last_hour={analytics.find(analytic => post.id === analytic.post_id).hits_last_hour } total_hits={ total_hits } />
    {/if}
</td>

<style>
    .column-image {
        width: 50px;
    }
    .column-image img {
        width: 50px;
        height: 40px;
        object-fit: cover;
    }

    .column-title {
        width: 500px;
    }
</style>