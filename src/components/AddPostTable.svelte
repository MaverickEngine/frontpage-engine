<script>
    import { featuredPosts, unfeaturedPosts } from '../stores.js';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { wp_api_post } from "../lib/wp_api.js";
    import map_posts from "./lib/map_posts.js";

    export let frontpage_id;

    const dragStart = (e, i) => {
        console.log("dragStart", i);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        const start = i;
        e.dataTransfer.setData('text/plain', start);
    }

    onMount(async () => {
        const posts = await wp_api_post("frontpage_engine_fetch_unfeatured_posts", {
            id: frontpage_id,
        });
        $unfeaturedPosts = posts.map(map_posts);
    });
</script>

<table class="wp-list-table widefat fixed striped table-view-list featuredposts">
    <thead>
        <tr>
            <td class="manage-column check-column">
                <label class="screen-reader-text" for="cb-select-all-1">Select All</label>
                <input class="cb-select-all-1" type="checkbox" />
            </td>
            <th scope="col" class="column-header-image">Image</th>
            <th scope="col" class="column-header-title">Title</th>
            <th scope="col" class="manage-column">Author</th>
            <th scope="col" class="manage-column">Tags</th>
            <th scope="col" class="manage-column">Published</th>
        </tr>
    </thead>
    <tbody>
        {#each $unfeaturedPosts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            draggable="true"

        >
            <th scope="row" class="check-column">
                <label class="screen-reader-text" for="cb-select-1">Select</label>
                <input class="cb-select-1" type="checkbox" />
            </th>
            <PostRow 
                post={post} 
                index={index}
            />
        </tr>
        {/each}
        
    </tbody>
</table>

<style>
    tr.is-active {
        background-color: rgb(128, 162, 213) !important;
    }

    .column-header-image {
        width: 50px;
    }

    .column-header-title {
        width: 500px;
    }
</style>