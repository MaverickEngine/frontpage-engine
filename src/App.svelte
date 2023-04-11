<script>
    import { onMount, onDestroy } from 'svelte';
    import FrontpageTable from "./components/FrontpageTable.svelte";
    import AddPostTable from "./components/AddPostTable.svelte";
    import Modal from "./components/Modal.svelte";
    import { FrontPageEngineSocketServer } from './websocket.js';
    import { featuredPosts, unorderedPosts, totalHits, dev } from './stores.js';
    import { apiGet, apiPost } from "./lib/ajax.ts";
    import { map_posts } from "./lib/posts.js";
    import { v4 as uuidv4 } from 'uuid';
    import Message from "./components/Message.svelte";
    import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

    export let frontpage_id;
    export let url;
    let show_modal = false;
    let show_unordered_modal = false;
    let updating = false;
    let show_group_actions = false;
    const uuid = uuidv4();
    let messages = [];
    $dev = false;

    let socket = null;
    onMount(async () => {
        socket = new FrontPageEngineSocketServer(url);
        socket.subscribe(`frontpage-${frontpage_id}`);
        socket.on("frontpage_updated", async message => {
            if (uuid === message.uuid) return;
            await getPosts();
        });
        await getPosts();
        await getAnalytics();
        setInterval(getPosts, 600000); // Check posts every 10 minutes
    });

    onDestroy(() => {
        socket.close();
    });

    const getPosts = async () => {
        const wp_posts = await apiGet(`frontpageengine/v1/get_posts/${frontpage_id}?${$dev ? "simulate_analytics=1" : ""}`);
        $featuredPosts = wp_posts.posts.map(map_posts);
        $totalHits = $featuredPosts.filter(post => (post.analytics?.hits_last_hour)).reduce((a, b) => a + b.analytics.hits_last_hour, 0);
        console.log("featuredPosts", $featuredPosts);
    }

    const getAnalytics = async () => {
        const analytics = await apiGet(`frontpageengine/v1/analytics/${frontpage_id}`);
        console.log("analytics", analytics);
    }

    const updated = async () => {
        socket.sendMessage({ name: "frontpage_updated", message: "Updated front page", uuid });
    }

    async function onMove(e) {
        try {
            const from = e.detail.from;
            const to = e.detail.to;
            const post_id = e.detail.post_id;
            // console.log("moved", from, to, post_id);
            const wp_posts = await apiPost(`frontpageengine/v1/move_post/${frontpage_id}`, {
                post_id,
                from,
                to,
            }, "onMove");
            // console.log(wp_posts);
            $featuredPosts = wp_posts.posts.map(map_posts);
        } catch (error) {
            console.error(error);
            messages.push({ type: "error", message: error.message || error });
            messages = messages;
            // console.log(messages);
        }
    }

    const autoSort = async () => {
        try {
            const wp_posts = await apiGet(`frontpageengine/v1/autosort/${frontpage_id}?${$dev ? "simulate_analytics=1" : ""}`);
            $featuredPosts = wp_posts.posts.map(map_posts);
        } catch (error) {
            console.error(error);
            messages.push({ type: "error", message: error.message || error });
            messages = messages;
            // console.log(messages);
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
        {#if $unorderedPosts.length > 0}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="unordered-posts-alert" alt="Posts awaiting placement" on:click={() => show_unordered_modal = true }>{$unorderedPosts.length}</div>
        {/if}
        <a href="#show-modal" class="button button-primary" on:click={() => show_modal = true}>Add posts</a>
        <a href="#auto-sort" class="button" on:click={() => autoSort()}>Auto sort</a>
        {#if show_group_actions}
            <select class="group-action" bind:value={group_action} on:change={onGroupAction}>
                <option value="0">Group action</option>
                <option value="remove">Remove</option>
            </select>
        {/if}
    </div>
    <hr>
    {#if show_unordered_modal}
    <Modal on:close="{() => show_unordered_modal = false}">
        <h2>Posts awaiting placement</h2>
        <AddPostTable frontpage_id={frontpage_id} type="unordered" on:updated={updated} />
    </Modal>
    {/if}
    {#if show_modal}
    <Modal on:close="{() => show_modal = false}">
        <h2 slot="header">Add Posts</h2>
        <AddPostTable frontpage_id={frontpage_id} on:updated={updated} />
    </Modal>
    {/if}
    <FrontpageTable frontpage_id={frontpage_id} on:updated={updated} updating={updating} on:moved={onMove} />
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