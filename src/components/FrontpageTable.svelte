<script>
    const mode = process.env.NODE_ENV;
    import { DateInput } from './date-picker-svelte';
    import { featuredPosts, unique_id, frontpageId } from '../stores.js';
    import { onMount, afterUpdate } from 'svelte';
    import PostRow from "./PostRow.svelte";
    import SvelteTooltip from 'svelte-tooltip';
    import { flip } from 'svelte/animate';
    import { apiPost, apiGet } from "../lib/ajax.ts";
    import { map_posts } from '../lib/posts.js';

    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    let hovering = false;
    let rowHovering = false;
    export let updating = false;
    export let total_hits = 0;
    export let analytics = [];

    const doMove = async (post_id, slot_id) => {
        updating = true;
        try {
            $featuredPosts = (await apiPost(`frontpageengine/v1/move_post/${$frontpageId}?${mode == "development" ? "simulate_analytics=1" : ""}`, {
                post_id,
                slot_id,
            }, $unique_id)).posts.map(map_posts);
            dispatch("updated");
        } catch (e) {
            console.error(e);
        } finally {
            updating = false;
        }
    }

    const doLock = async (post, date) => {
        updating = true;
        let lock_until = new Date().getTime() + 1000 * 60 * 60 * 24;
        if (date) {
            lock_until = new Date(date).getTime();
        }
        $featuredPosts = (await apiPost(`frontpageengine/v1/lock_post/${$frontpageId}?${(mode == "development") ? "simulate_analytics=1" : ""}`, {
            lock_until: formatTimeSql(new Date(lock_until)),
            post_id: post.slot.post_id,
        })).posts.map(map_posts);
        dispatch("updated");
        updating = false;
    }

    const doManual = async(slot) => {
        updating = true;
        $featuredPosts = (await apiGet(`frontpageengine/v1/slot/manual/${$frontpageId}/${slot.id}`)).posts.map(map_posts);
        dispatch("updated");
        updating = false;
    }

    const doAuto = async(slot) => {
        updating = true;
        $featuredPosts = (await apiGet(`frontpageengine/v1/slot/auto/${$frontpageId}/${slot.id}`)).posts.map(map_posts);
        dispatch("updated");
        updating = false;
    }

    const chooseTime = (post) => {
        // post.edit_lock_until = true;
        // const date = prompt("Enter a date and time to lock the post until (YYYY-MM-DD HH:MM)", formatTime(new Date(post.slot.lock_until)));
        // if (date) {
        //     // Check date is valid
        //     if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) {
        //         alert("Invalid date format");
        //         return;
        //     }
        //     // Check date is in the future
        //     if (new Date(date).getTime() < new Date().getTime()) {
        //         alert("Date must be in the future");
        //         return;
        //     }
            // doLock(post, date);
        // }
    }

    const updateTime = (post) => {
        if (post.locked_until) {
            post.slot.lock_until = post.locked_until;
        }
    }

    const doUnlock = async (post) => {
        updating = true;
        $featuredPosts = (await apiPost(`frontpageengine/v1/unlock_post/${$frontpageId}?${(mode == "development") ? "simulate_analytics=1" : ""}`, {
            post_id: post.slot.post_id,
        })).posts.map(map_posts);
        updating = false;
        dispatch("updated");
    }

    // const doRemove = async (post) => {
    //     if (confirm("Are you sure you want to remove this post from the frontpage?")) {
    //         updating = true;
    //         try {
    //             $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${$frontpageId}?${(mode == "development") ? "simulate_analytics=1" : ""}`, {
    //                 post_id: post.id,
    //             })).posts.map(map_posts);
    //             dispatch("updated");
    //         } catch (e) {
    //             console.error(e);
    //             alert("Error removing post: " + e.message);
    //         }
    //         updating = false;
    //     }
    // }

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

    const setupSortable = () => {
        console.log("setup sortable");
        if (jQuery("table.featuredposts").hasClass("ui-sortable")) {
            jQuery("table.featuredposts").sortable("destroy");
        }
        jQuery("table.featuredposts").sortable({
            items: "tr:not(.is-locked)",
            cursor: "move",
            opacity: 0.6,
            containment: "parent",
            axis: "y",
            start: (e, ui) => {
                // Disable item while moving
                ui.item.prop("disabled", true);
            },
            update: (e, ui) => {
                if (ui.item.hasClass("is-locked")) {
                    jQuery("table.featuredposts").sortable("cancel");
                    return;
                }
                const post_id = ui.item.data("post_id");
                const target_index = ui.item.index();
                const start_index = ui.item.data("index");
                const slot_id = $featuredPosts[target_index].slot.id;
                if (start_index !== target_index) {
                    console.log({post_id, slot_id});
                    doMove(post_id, slot_id);
                }
            },
        })
    }

    onMount(() => {
        console.log("onMount");
        setupSortable();
    });

    afterUpdate( () => {
        // setupSortable();
        // jQuery("table.featuredposts").sortable("refresh");
    });
    
    $: {
        $featuredPosts.forEach(post => {
            if (post.locked_until) {
                post.slot.lock_until = formatTime(post.locked_until);
            }
        });
        // console.log("featuredPosts changed");
        // jQuery("table.featuredposts").sortable("destroy");
        // jQuery("table.featuredposts").sortable("refreshPositions");
        // setupSortable();
    }


    
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
            <th scope="col" class="manage-column">Section</th>
            <th scope="col" class="column-header-title">Title</th>
            <th scope="col" class="manage-column">Author</th>
            <th scope="col" class="manage-column">Published</th>
            <th scope="col" class="manage-column">Hits</th>
            <th scope="col" class="manage-column"></th>
        </tr>
    </thead>
    <tbody>
        {#each $featuredPosts as post, index (post.id)}
        <tr 
            id="post-{post.id}"
            data-post_id={post.id}
            data-index={index}
            data-slot_id={post.slot.id}
            animate:flip={{ duration: 600 }}
            class:is-active={hovering === index}
            class:is-locked={post.locked}
            on:mouseover={() => rowHovering = index}
            on:focus={() => rowHovering = index}
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
                hovering={rowHovering === index}
                {total_hits}
                {analytics}
            />
            <th scope="row" class="lock-column">
                {#if (!!post.slot.post_id)}
                    {#if (post.locked)}
                        <div class="locked-slot">
                            <SvelteTooltip tip="This post is locked to this slot. Locked by {post.slot.locked_by} on {post.slot.locked_at}." left color="#FFB74D">
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <span class="dashicons dashicons-lock cursor-pointer" on:click={doUnlock(post)}></span>
                            </SvelteTooltip>
                            <DateInput bind:value={post.locked_until} on:update={doLock(post, post.locked_until)} closeOnSelection={true} />
                        </div>
                    {:else}
                        <SvelteTooltip tip="Click to lock this post in this slot." left color="#FFB74D">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <span class="dashicons dashicons-unlock cursor-pointer" on:click={doLock(post)}></span>
                        </SvelteTooltip>
                        {#if (post.manual)}
                            <SvelteTooltip tip="This slot is manually ordered." left color="#FFB74D">
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <span class="dashicons dashicons-businessperson cursor-pointer" on:click={doAuto(post.slot)}></span>
                            </SvelteTooltip>
                        {:else}
                            <SvelteTooltip tip="This slot is automatically ordered." left color="#FFB74D">
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <span class="dashicons dashicons-chart-pie cursor-pointer" on:click={doManual(post.slot)}></span>
                            </SvelteTooltip>
                        {/if}
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
        width: 30%;
    }

    .dot-underline {
        text-decoration: underline dotted;
        cursor: pointer;
    }

    .width-150 {
        width: 150px;
    }

    .cursor-pointer {
        cursor: pointer;
    }
</style>