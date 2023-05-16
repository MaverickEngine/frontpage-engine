<script>
    const mode = process.env.NODE_ENV;
    import { onMount, onDestroy } from 'svelte';
    import FrontpageTable from "./components/FrontpageTable.svelte";
    import AddPostTable from "./components/AddPostTable.svelte";
    import Modal from "./components/Modal.svelte";
    import { FrontPageEngineSocketServer } from './websocket.js';
    import { frontpageId, featuredPosts, totalHits, analytics, unique_id, show_modal } from './stores.js';
    import { apiGet, apiPost } from "./lib/ajax.ts";
    import { map_posts } from "./lib/posts.js";
    import Message from "./components/Message.svelte";
    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    export let frontpage_id;
    export let frontpageengine_wssb_address;
    export let url;
    export let uid;
    let updating = false;
    let show_group_actions = false;
    let messages = [];

    let socket = null;
    onMount(async () => {
        try {
            $unique_id = uid;
            $frontpageId = frontpage_id;
            socket = new FrontPageEngineSocketServer(frontpageengine_wssb_address, url, `frontpage-${frontpage_id}`, uid);
            socket.on("frontpage_updated", async message => {
                console.log("Got message", uid, message.sender);
                if (uid === message.sender) return;
                await getPosts();
            });
        } catch (e) {
            console.error("Error connecting to websocket server");
            console.error(e);
        }
        await getPosts();
        await getAnalytics();
        setInterval(getPosts, 600000); // Check posts every 10 minutes
        setInterval(getAnalytics, 60000); // Check analytics every minute
    });

    onDestroy(() => {
        try {
            socket.close();
        } catch (e) {
            console.error("Error closing websocket connection");
            console.error(e);
        }
    });

    const getPosts = async () => {
        const wp_posts = await apiGet(`frontpageengine/v1/get_posts/${frontpage_id}?${(mode === "development") ? "simulate_analytics=1" : ""}`);
        $featuredPosts = wp_posts.posts.map(map_posts);
        console.log("featuredPosts", $featuredPosts);
    }

    const getAnalytics = async () => {
        if ((mode === "development")) {
            $analytics = Object.values((await apiGet(`frontpageengine/v1/analytics/${frontpage_id}?simulate_analytics=1`)).analytics);
        } else {
            $analytics = Object.values((await apiGet(`frontpageengine/v1/analytics/${frontpage_id}`)).analytics);
        }
        $totalHits = $analytics.reduce((a, b) => a + b.hits_last_hour, 0);
        console.log("totalHits", $totalHits);
    }

    const updated = async () => {
        // socket.sendMessage({ name: "frontpage_updated", message: "Updated front page", uuid });
        await getAnalytics();
    }

    const autoSort = async () => {
        try {
            updating = true;
            const wp_posts = await apiGet(`frontpageengine/v1/autosort/${frontpage_id}?${(mode === "development") ? "simulate_analytics=1" : ""}`);
            $featuredPosts = wp_posts.posts.map(map_posts);
        } catch (error) {
            console.error(error);
            messages.push({ type: "error", message: error.message || error });
            messages = messages;
            // console.log(messages);
        } finally {
            updating = false;
        }
    }

    let group_action;
    const onGroupAction = async () => {
        console.log(group_action);
        if (group_action === "remove") {
            if (confirm("Are you sure you want to remove these posts?")) {
                const posts = $featuredPosts.filter(post => post.checked);
                for(let post of posts) {
                    try {
                        console.log(post);
                        $featuredPosts = (await apiPost(`frontpageengine/v1/remove_post/${post.slot.frontpage_id}`, {
                            post_id: post.id,
                        })).posts.map(map_posts);
                    } catch (e) {
                        console.error(e);
                        alert("Error removing post: " + e.message);
                    }
                }
                dispatch("updated");
            }
        }
        group_action = "0";
    }

    $: if ($featuredPosts.length > 0) {
        // $featuredPosts = applySlots($featuredPosts, $slots);
        // $featuredPosts = applyAnalytics($featuredPosts, $analytics);
        show_group_actions = $featuredPosts.filter(post => post.checked).length > 0;
        console.log(messages);
    }
</script>

<main>
    {#each messages as message}
        <Message type={message.type}>{message.message}</Message>
    {/each}
    <div class="action-bar">
        <a href="#show-modal" class="button button-primary" on:click={() => $show_modal = true}>Add posts</a>
        <a href="#auto-sort" class="button" on:click={() => autoSort()}>Auto sort</a>
        {#if show_group_actions}
            <select class="group-action" bind:value={group_action} on:change={onGroupAction}>
                <option value="0">Group action</option>
                <option value="remove">Remove</option>
            </select>
        {/if}
    </div>
    <hr>
    {#if $show_modal}
    <Modal on:close="{() => $show_modal = false}">
        <h2 slot="title">Add Posts</h2>
        <AddPostTable frontpage_id={frontpage_id} on:updated={updated} total_hits={$totalHits} on:close={console.log("Close!")} />
    </Modal>
    {/if}
    <FrontpageTable frontpage_id={frontpage_id} total_hits={$totalHits} on:updated={updated} updating={updating} analytics={$analytics} />
</main>

<style>
   .unordered-posts-alert {
        background-color: rgb(213, 57, 57);
        color: white;
        border-radius: 50%;
        width: 30px;
        height: 30px;
        text-align: center;
        top: 0;
        right: 0;
        margin: 0px 10px;
        font-size: 15px;
        line-height: 30px;
        cursor: pointer;
   }

   .action-bar {
       display: flex;
       justify-content: left;
       flex-direction: row;
   }

   .button {
    margin-right: 10px;
   }
</style>