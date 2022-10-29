<script>
    import { onMount, onDestroy } from 'svelte';
    import FrontpageTable from "./components/FrontpageTable.svelte";
    import AddPostTable from "./components/AddPostTable.svelte";
    import Modal from "./components/Modal.svelte";
    import { FrontPageEngineSocketServer } from './websocket.js';
    import { featuredPosts, unfeaturedPosts, unorderedPosts, slots, analytics } from './stores.js';
    import { wp_api_post } from "./lib/wp_api.js";
    import { map_posts, applyLockedSlots, applySlots, applyAnalytics } from "./lib/posts.js";
    import { v4 as uuidv4 } from 'uuid';

    export let frontpage_id;
    export let url;
    let show_modal = false;
    let show_unordered_modal = false;
    let updating = false;
    const uuid = uuidv4();
    

    let socket = null;
    onMount(async () => {
        socket = new FrontPageEngineSocketServer(url);
        socket.subscribe(`frontpage-${frontpage_id}`);
        socket.on("frontpage_updated", message => {
            if (uuid === message.uuid) return;
            getPosts();
        });
        await getSlots();
        await getPosts();
        await getUnorderedPosts();
        await getAnalytics();
        setInterval(getUnorderedPosts, 60000);
        setInterval(getAnalytics, 60000);
    });

    onDestroy(() => {
        socket.close();
    });

    const getSlots = async () => {
        const result = await wp_api_post("frontpage_engine_fetch_slots", {
            id: frontpage_id,
        });
        $slots = result;
    };

    const getAnalytics = async() => {
        // Todo: Implement
    }

    const getPosts = async () => {
        const wp_posts = await wp_api_post("frontpage_engine_fetch_posts", {
            id: frontpage_id,
        },
        "getPosts");
        $featuredPosts = wp_posts.map(map_posts);
        console.log("featuredPosts", $featuredPosts);
    }

    const getUnorderedPosts = async () => {
        const wp_posts = await wp_api_post("frontpage_engine_fetch_unordered_posts", {
            id: frontpage_id,
        });
        $unorderedPosts = wp_posts.map(map_posts);
    }

    const updatePosts = async () => {
        updating = true;
        await wp_api_post("frontpage_engine_order_posts", {
            id: frontpage_id,
            "order[]": $featuredPosts.map(post => post.id),
        }, "updatePosts");
        updating = false;
    };

    const updated = async () => {
        // console.log("updated");
        await updatePosts();
        socket.sendMessage({ name: "frontpage_updated", message: "Updated front page", uuid });
    }

    const autoSort = async () => {
        const posts = $featuredPosts;
        posts.sort((a, b) => {
            if (a.analytics && b.analytics) {
                return b.analytics.hits - a.analytics.hits;
            }
            return 0;
        });
        // Put all locked posts back in original position
        $featuredPosts = applyLockedSlots(posts);
        await updated();
    }

    $: if ($featuredPosts.length > 0) {
        $featuredPosts = applySlots($featuredPosts, $slots);
        $featuredPosts = applyAnalytics($featuredPosts, $analytics);
    }
</script>

<main>
    <div class="action-bar">
        {#if $unorderedPosts.length > 0}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="unordered-posts-alert" alt="Posts awaiting placement" on:click={() => show_unordered_modal = true }>{$unorderedPosts.length}</div>
        {/if}
        <a href="#show-modal" class="button button-primary" on:click={() => show_modal = true}>Add posts</a>
        <a href="#auto-sort" class="button" on:click={() => autoSort()}>Auto sort</a>
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
    <FrontpageTable frontpage_id={frontpage_id} on:updated={updated} updating={updating} />
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