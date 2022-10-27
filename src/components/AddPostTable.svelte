<script>
    import { featuredPosts, unfeaturedPosts, unorderedPosts } from '../stores.js';
    import { fly } from 'svelte/transition';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { wp_api_post } from "../lib/wp_api.js";
    import map_posts from "../lib/map_posts.js";

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
    
    export let frontpage_id;
    export let type = "unfeatured"; // "unfeatured" or "unordered"
    let posts = [];

    const dragStart = (e, i) => {
        console.log("dragStart", i);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        const start = i;
        e.dataTransfer.setData('text/plain', start);
        dispatch("dragstart");
    }

    const featurePost = async (post) => {
        console.log("featurePost", post);
        $featuredPosts.push(post);
        if (type==="unfeatured") {
            $unfeaturedPosts = $unfeaturedPosts.filter(p => p.id !== post.id);
            posts = $unfeaturedPosts;
        } else if (type==="unordered") {
            $unorderedPosts = $unorderedPosts.filter(p => p.id !== post.id);
            posts = $unorderedPosts;
            console.log("unorderdPosts", $unorderedPosts);
        }
        console.log("Calling updated");
        dispatch("updated");
    }

    onMount(async () => {
        if (type==="unfeatured") {
            posts = $unfeaturedPosts;
            const result = await wp_api_post("frontpage_engine_fetch_unfeatured_posts", {
                id: frontpage_id,
            });
            $unfeaturedPosts = result.map(map_posts);
            posts = $unfeaturedPosts;
        } else if (type==="unordered") {
            posts = $unorderedPosts;
            const result = await wp_api_post("frontpage_engine_fetch_unordered_posts", {
                id: frontpage_id,
            });
            $unorderedPosts = result.map(map_posts);
            posts = $unorderedPosts;
        }
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
            <th></th>
        </tr>
    </thead>
    <tbody>
        {#each posts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            draggable="true"
            on:dragstart="{(e) => dragStart(e, index)}"
            out:fly|local="{{ y: -200, duration: 600 }}"
        >
            <th scope="row" class="check-column">
                <label class="screen-reader-text" for="cb-select-1">Select</label>
                <input class="cb-select-1" type="checkbox" />
            </th>
            <PostRow 
                post={post} 
                index={index}
            />
            <th>
                <button 
                    class="button button-primary"
                    on:click="{featurePost(post)}"
                >
                    Add
                </button>
            </th>
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