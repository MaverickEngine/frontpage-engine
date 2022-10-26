<script>
    import { featuredPosts } from '../stores.js';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { flip } from 'svelte/animate';
    import { wp_api_post } from "../lib/wp_api.js";

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    let hovering = false;

    const dragStart = (e, i) => {
        console.log("dragStart", i);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        const start = i;
        e.dataTransfer.setData('text/plain', start);
    }

    const dragDrop = async (e, target) => {
        console.log("drop", target);
        e.dataTransfer.dropEffect = 'move'; 
        const start = parseInt(e.dataTransfer.getData("text/plain"));
        const posts = $featuredPosts;
        if (start < target) {
            posts.splice(target + 1, 0, posts[start]);
            posts.splice(start, 1);
        } else {
            posts.splice(target, 0, posts[start]);
            posts.splice(start + 1, 1);
        }
        featuredPosts.set(posts);
        await wp_api_post("frontpage_engine_order_posts", {
            id: $featuredPosts[0].id,
            ordering_code: ajax_var.ordering_code,
            "order[]": $featuredPosts.map(post => post.id),
        });
        dispatch("updated");
        hovering = null
    }

    onMount(() => {
        console.log("onMount");
    });
</script>

<table class="wp-list-table widefat fixed striped table-view-list featuredposts">
    <thead>
        <tr>
            <td class="manage-column check-column">
                <label class="screen-reader-text" for="cb-select-all-1">Select All</label>
                <input class="cb-select-all-1" type="checkbox" />
            </td>
            <th scope="col" class="manage-column">Image</th>
            <th scope="col" class="manage-column">Title</th>
            <th scope="col" class="manage-column">Author</th>
            <th scope="col" class="manage-column">Tags</th>
            <th scope="col" class="manage-column">Published</th>
        </tr>
    </thead>
    <tbody>
        {#each $featuredPosts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            animate:flip
            draggable={true}
            on:dragstart={e => dragStart(e, index)}
            on:drop|preventDefault={e => dragDrop(e, index)}
            on:dragenter={() => hovering = index}
            ondragover="return false"
            class:is-active={hovering === index}
        >
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
</style>