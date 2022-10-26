<script>
    export let post;
</script>


<th scope="row" class="check-column">
    <label class="screen-reader-text" for="cb-select-1">Select</label>
    <input class="cb-select-1" type="checkbox" />
</th>
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
<td class="column-tags">{post.tags}</td>
<td class="column-published">{post.date_published}</td>