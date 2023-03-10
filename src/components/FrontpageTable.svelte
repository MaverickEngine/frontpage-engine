<script>
    import { analytics, featuredPosts, slots } from '../stores.js';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { flip } from 'svelte/animate';
    import { wp_api_post } from "../lib/wp_api.js";
    import { applyLockedSlots } from '../lib/posts.js';

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
    
    // export let frontpage_id;

    let hovering = false;
    export let updating = false;

    const dragStart = (e, i) => {
        console.log("dragStart", i);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        const start = i;
        e.dataTransfer.setData('text/plain', start);
    }

    const dragDrop = async (e, target) => {
        // console.log("drop", target);
        e.dataTransfer.dropEffect = 'move'; 
        const start = parseInt(e.dataTransfer.getData("text/plain"));
        if (start === target) return; // No change
        const posts = $featuredPosts;
        if (start < target) {
            posts.splice(target + 1, 0, posts[start]);
            posts.splice(start, 1);
        } else { // Placing post above
            posts.splice(target, 0, posts[start]);
            posts.splice(start + 1, 1);
        }
        // Put all locked posts back in original position
        for (let x = 0; x < posts.length; x++) {
            if (posts[x].locked) {
                const post = posts[x];
                posts.splice(x, 1);
                posts.splice(Number(post.slot.display_order), 0, post);
            }
        }
        // // Fix up slots again
        // for (let i = 0; i < posts.length; i++) {
        //     posts[i].slot = $slots[i]
        // }
        featuredPosts.set(posts);
        dispatch("updated");
        hovering = null
    }

    const doLock = async (post, date) => {
        let lock_until = new Date().getTime() + 1000 * 60 * 60 * 24;
        if (date) {
            lock_until = new Date(date).getTime();
        }
        post.slot.lock_until = new Date(lock_until);
        post.locked = true;
        $featuredPosts = $featuredPosts.map(p => p.id === post.id ? post : p);
        console.log("doLock", post);
        await wp_api_post("frontpage_engine_update_slot", {
            id: post.slot.id,
            lock_until: formatTimeSql(post.slot.lock_until),
        });
        dispatch("updated");
    }

    const doUnlock = async (post) => {
        post.slot.lock_until = null;
        post.locked = false;
        $featuredPosts = $featuredPosts.map(p => p.id === post.id ? post : p);
        console.log("doUnlock", post);
        await wp_api_post("frontpage_engine_update_slot", {
            id: post.slot.id,
            lock_until: null,
        });
        dispatch("updated");
    }

    const doRemove = async (post) => {
        $featuredPosts = applyLockedSlots($featuredPosts.filter(p => p.id !== post.id));
        dispatch("updated");
    }

    const checkAll = (e) => {
        if (e.target.checked) {
            $featuredPosts = $featuredPosts.map(p => {
                p.checked = true;
                return p;
            });
        } else {
            $featuredPosts = $featuredPosts.map(p => {
                p.checked = false;
                return p;
            });
        }
    }

    const formatTime = (time) => {
        const date = new Date(time);
        return date.getFullYear() + "/" + (date.getMonth() + 1) + "/" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes();
    }

    const formatTimeSql = (time) => {
        const date = new Date(time);
        return date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();
    }

    onMount(() => {
        console.log("onMount");
    });
</script>

<table class="wp-list-table widefat fixed striped table-view-list featuredposts {updating  ? "is-updating" : ""}">
    <thead>
        <tr>
            <td class="manage-column check-column">
                <label class="screen-reader-text" for="">Select All</label>
                <input class="" type="checkbox" on:change={checkAll} />
            </td>
            <th scope="col" class="column-header-image">Image</th>
            <th scope="col" class="column-header-title">Title</th>
            <th scope="col" class="manage-column">Author</th>
            <th scope="col" class="manage-column">Published</th>
            <th scope="col" class="manage-column"></th>
            <th scope="col" class="manage-column">Hits</th>
        </tr>
    </thead>
    <tbody>
        {#each $featuredPosts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            animate:flip={{ duration: 600 }}
            draggable={!(post.locked)}
            on:dragstart={e => dragStart(e, index)}
            on:drop|preventDefault={e => dragDrop(e, index)}
            on:dragenter={() => hovering = index}
            ondragover="return false"
            class:is-active={hovering === index}
            class:is-locked={post.locked}
        >
            <th scope="row" class="check-column">
                {#if (!post.locked)}
                <label class="screen-reader-text" for="cb-select-1">Select</label>
                <input class="cb-select-1" type="checkbox" bind:checked={post.checked} />
                {/if}
            </th>
            <PostRow 
                post={post} 
                index={index}
            />
            <th scope="row" class="lock-column">
                {#if (post.locked)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="dashicons dashicons-lock" on:click={doUnlock(post)}></span>
                    {formatTime(post.slot.lock_until)}
                {:else}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="dashicons dashicons-unlock" on:click={doLock(post)}></span>
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <span class="dashicons dashicons-trash" on:click={doRemove(post)}></span>
                {/if}
            </th>
            <th scope="row" class="analytics-column">
                {#if post.analytics}
                    <div class="analytics-hits">
                        {post.analytics.hits}
                    </div>
                {/if}
            </th>
        </tr>
        {/each}
        
    </tbody>
</table>

<style>
    table {
        border-collapse: collapse; 
    }

    table.is-updating {
        opacity: 0.5;
        pointer-events: none;
    }

    tr.is-active {
        background-color: rgb(204, 204, 204) !important;
    }

    tr.is-locked {
        background-color: rgb(250, 232, 238) !important;
    }

    .column-header-image {
        width: 50px;
    }

    .column-header-title {
        width: 500px;
    }
</style>