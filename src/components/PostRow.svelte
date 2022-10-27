<script>
    export let post;
</script>

<td class="column-image">
    {#if post.image}
    <img class="image column-image" width="50" height="50" src={post.image} alt={post.title} />
    {/if}
</td>
<td class="column-title">
    <strong>
        <a class="row-title" href={post.link}>{post.title}</a>
    </strong>
</td>
<td class="column-author">{post.author}</td>
<td class="column-tags">{post.id}</td>
<td class="column-published">{post.date_published}</td>

<style>
    .column-image {
        width: 50px;
    }
    .column-image img {
        width: 50px;
        height: 50px;
    }
</style>