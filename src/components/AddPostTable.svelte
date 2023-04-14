<script lang="ts">
    const mode = process.env.NODE_ENV;
    import { featuredPosts, unfeaturedPosts, unorderedPosts } from '../stores.js';
    import Search from "./Search.svelte";
    import { fly, fade } from 'svelte/transition';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { apiGet, apiPost } from "../lib/ajax";
    import { map_posts } from "../lib/posts.js";

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
    
    export let frontpage_id;
    export let total_hits = 0;

    let posts = [];
    let analytics = [];
    let search = "";
    let page = 1;
    let per_page = 10;
    let rowHovering = -1;
    export let updating = false;

    const featurePost = async (post, position) => {
        updating = true;
        try {
            $featuredPosts = (await apiPost(`frontpageengine/v1/add_post/${frontpage_id}?${(mode === "development") ? "simulate_analytics=1" : ""}`, {
                post_id: post.id,
                position,
            })).posts.map(map_posts);
            posts = posts.filter(p => p.id !== post.id);
            dispatch("updated");
        } catch (e) {
            console.error(e);
        } finally {
            updating = false;
        }
    }

    const getPosts = async() => {
        updating = true;
        try {
            const result = await apiGet(`frontpageengine/v1/unfeatured_posts/${frontpage_id}?search=${search}&page=${page}&per_page=${per_page}`);
            $unfeaturedPosts = result.posts.map(map_posts);
            posts = $unfeaturedPosts;
            getAnalytics();
        } catch (e) {
            console.error(e);
        } finally {
            updating = false;
        }
    }

    const getAnalytics = async () => {
        const post_ids = posts.map(p => p.id);
        const result = await apiPost(`frontpageengine/v1/analytics?${(mode === "development") ? "simulate_analytics=1" : ""}`, {post_ids});
        analytics = Object.values(result.analytics);
        
        // total_hits = analytics.reduce((a, b) => a + b.hits_last_hour, 0);
        // console.log("totalHits", total_hits);
    }

    onMount(async () => {
        getPosts();
    });
</script>

<div class="frontpageengine-addpost-container">
    <div class="frontpageengine-addpost-search">
        <Search bind:value={search} on:search={getPosts} />
    </div>
    <table class="wp-list-table widefat fixed striped table-view-list featuredposts {updating  ? "is-updating" : ""}">
        <thead>
            <tr>
                <td class="manage-column check-column">
                    <label class="screen-reader-text" for="cb-select-all-1">Select All</label>
                    <input class="cb-select-all-1" type="checkbox" />
                </td>
                <th scope="col" class="column-header-image">Image</th>
                {#if (mode === "development")}
                <th scope="col" class="manage-column">Slot ID</th>
                <th scope="col" class="manage-column">Post ID</th>
                <th scope="col" class="manage-column">Display Order</th>
                {/if}
                <th scope="col" class="column-header-title">Title</th>
                <th scope="col" class="manage-column">Author</th>
                <th scope="col" class="manage-column">Published</th>
                <th></th>
                <th>Insert</th>
            </tr>
        </thead>
        <tbody>
            {#each posts as post, index (post.id)}
            <tr 
                id="post-{post.id}"
                out:fly|local="{{ y: -200, duration: 600 }}"
                on:mouseover={() => rowHovering = index}
                on:focus={() => rowHovering = index}
            >
                <th scope="row" class="check-column">
                    <label class="screen-reader-text" for="cb-select-1">Select</label>
                    <input class="cb-select-1" type="checkbox" />
                </th>
                <PostRow 
                    {post} 
                    {index}
                    {total_hits}
                    {analytics}
                    hovering={rowHovering === index}
                />
                <th>
                    <button 
                        class="button"
                        on:click="{featurePost(post, "top")}"
                    >
                        Top
                    </button>
                    <button 
                        class="button"
                        on:click="{featurePost(post, "bottom")}"
                    >
                        Bottom
                    </button>
                    <button 
                        class="button"
                        on:click="{featurePost(post, "auto")}"
                    >
                        Auto
                    </button>
                </th>
            </tr>
            {/each}
            
        </tbody>
    </table>
</div>

<style>
    table.is-updating {
        opacity: 0.5;
        pointer-events: none;
    }

    .column-header-image {
        width: 50px;
    }

    .column-header-title {
        width: 500px;
    }

    .frontpageengine-addpost-search {
        margin-bottom: 20px;
    }

    .button {
        margin-bottom: 5px;
    }
</style>