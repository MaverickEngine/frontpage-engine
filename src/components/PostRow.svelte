<script>
    const mode = process.env.NODE_ENV;
    import AnalyticsGraph from "./AnalyticsGraph.svelte";
    export let post;
</script>

<td class="column-image">
    {#if post.image}
    <img class="image column-image" width="50" height="50" src={post.image} alt={post.title} />
    {/if}
</td>
{#if (mode=="development")}
<td>{post.slot?.id}</td>
<td>{post.id}</td>
<td>{post.slot?.display_order}</td>
{/if}
<td class="column-title">
    <strong>
        <a class="row-title" href={post.link}>{post.title}</a>
    </strong>
</td>
<td class="column-author">{post.author}</td>
<td class="column-published">{post.date_published}</td>
<td class="column-analytics">
    {#if post.analytics?.hits_last_hour}
    <AnalyticsGraph hits_last_hour={post.analytics.hits_last_hour}/>
    {/if}
</td>

<style>
    .column-image {
        width: 50px;
    }
    .column-image img {
        width: 50px;
        height: 50px;
    }
</style>