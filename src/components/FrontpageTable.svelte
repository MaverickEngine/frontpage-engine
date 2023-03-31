<script>
    const mode = process.env.NODE_ENV;
    import { analytics, featuredPosts, slots } from '../stores.js';
    import { onMount } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import { flip } from 'svelte/animate';
    import { wp_api_post } from "../lib/wp_api.js";
    import { apiGet, apiPost } from "../lib/ajax.ts";
    import { applyLockedSlots, map_posts } from '../lib/posts.js';

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();
    
    // export let frontpage_id;

    let hovering = false;
    export let updating = false;

    const dragStart = (e, i) => {
        // console.log("dragStart", i);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.dropEffect = 'move';
        const start = i;
        e.dataTransfer.setData('text/plain', start);
    }

    const dragDrop = async (e, target) => {
        try {
            updating = true;
            e.dataTransfer.dropEffect = 'move'; 
            const start = parseInt(e.dataTransfer.getData("text/plain"));
            const post_id = $featuredPosts[start].id;
            const from = $featuredPosts[start].slot.id;
            const to = $featuredPosts[target].slot.id;
            if (!from || !to) {
                throw "From or to is missing";
            }
            if (from === to) {
                throw "From and to are the same";
            }
            if (!post_id) {
                throw "Post id is missing";
            }
            // if (!$featuredPosts[target].slot.post_id) {
            //     throw "Target slot is empty";
            // }
            $featuredPosts = (await apiPost(`frontpageengine/v1/move_post/${$featuredPosts[start].slot.frontpage_id}`, {
                post_id,
                from,
                to,
            })).posts.map(map_posts);
            dispatch("updated");
            hovering = null
            updating = false;
        } catch (e) {
            console.error(e);
            hovering = null
            updating = false;
        }
    }

    const doLock = async (post, date) => {
        updating = true;
        let lock_until = new Date().getTime() + 1000 * 60 * 60 * 24;
        if (date) {
            lock_until = new Date(date).getTime();
        }
        $featuredPosts = (await apiPost(`frontpageengine/v1/lock_post/${post.slot.frontpage_id}`, {
            lock_until: formatTimeSql(new Date(lock_until)),
            post_id: post.slot.post_id,
        })).posts.map(map_posts);
        dispatch("updated");
        updating = false;
    }

    const chooseTime = (post) => {
        const date = prompt("Enter a date and time to lock the post until (YYYY-MM-DD HH:MM)", formatTime(new Date(post.slot.lock_until)));
        if (date) {
            // Check date is valid
            if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
                alert("Invalid date format");
                return;
            }
            // Check date is in the future
            if (new Date(date).getTime() < new Date().getTime()) {
                alert("Date must be in the future");
                return;
            }
            doLock(post, date);
        }
    }

    const doUnlock = async (post) => {
        updating = true;
        $featuredPosts = (await apiPost(`frontpageengine/v1/unlock_post/${post.slot.frontpage_id}`, {
            post_id: post.slot.post_id,
        })).posts.map(map_posts);
        updating = false;
        dispatch("updated");
    }

    const doRemove = async (post) => {
        if (confirm("Are you sure you want to remove this post from the frontpage?")) {
            updating = true;
            try {
                $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${post.slot.frontpage_id}`, {
                    post_id: post.id,
                })).posts.map(map_posts);
                dispatch("updated");
            } catch (e) {
                console.error(e);
                alert("Error removing post: " + e.message);
            }
            updating = false;
        }
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
        return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0") + " " + date.getHours() + ":" + String(date.getMinutes()).padStart(2, "0");
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
            {#if (mode === "development")}
            <th scope="col" class="manage-column">Slot ID</th>
            <th scope="col" class="manage-column">Post ID</th>
            <th scope="col" class="manage-column">Display Order</th>
            {/if}
            <th scope="col" class="column-header-title">Title</th>
            <th scope="col" class="manage-column">Author</th>
            <th scope="col" class="manage-column">Published</th>
            <th scope="col" class="manage-column"></th>
            <th scope="col" class="manage-column"></th>
        </tr>
    </thead>
    <tbody>
        {#each $featuredPosts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            animate:flip={{ duration: 600 }}
            draggable={((!post.locked) && (!!post.slot.post_id))}
            on:dragstart={e => dragStart(e, index)}
            on:drop|preventDefault={e => dragDrop(e, index)}
            on:dragenter={() => hovering = (!post.locked && !!post.slot.post_id) && index}
            ondragover="return false"
            class:is-active={hovering === index}
            class:is-locked={post.locked}
        >
            <th scope="row" class="check-column">
                {#if (!post.locked && !!post.slot.post_id)}
                <label class="screen-reader-text" for="cb-select-1">Select</label>
                <input class="cb-select-1" type="checkbox" bind:checked={post.checked} />
                {/if}
            </th>
            <PostRow 
                post={post} 
                index={index}
            />
            <th scope="row" class="lock-column">
                {#if (!!post.slot.post_id)}
                    {#if (post.locked)}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <span class="dashicons dashicons-lock" on:click={doUnlock(post)}></span>
                        <span class="dot-underline" on:click={chooseTime(post)} on:keypress={chooseTime(post)}>{formatTime(post.slot.lock_until)}</span>
                    {:else}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <span class="dashicons dashicons-unlock" on:click={doLock(post)}></span>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <span class="dashicons dashicons-trash" on:click={doRemove(post)}></span>
                    {/if}
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

    .dot-underline {
        text-decoration: underline dotted;
        cursor: pointer;
    }
</style>