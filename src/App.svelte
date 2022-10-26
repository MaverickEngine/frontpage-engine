<script>
    import { onMount, onDestroy } from 'svelte';
    import FrontpageTable from "./components/FrontpageTable.svelte";
    import AddPostTable from "./components/AddPostTable.svelte";
    import Modal from "./components/Modal.svelte";
    import { FrontPageEngineSocketServer } from './websocket.js';
    import { featuredPosts, unfeaturedPosts, unorderedPosts } from './stores.js';
    import { wp_api_post } from "./lib/wp_api.js";
    import map_posts from "./lib/map_posts.js";
    
    export let frontpage_id;
    export let url;
    let show_modal = false;

    let socket = null;
    onMount(async () => {
        console.log("onMount");
        socket = new FrontPageEngineSocketServer(url);
        socket.subscribe(`frontpage-${frontpage_id}`);
        socket.on("frontpage_updated", getPosts);
        await getPosts();
        await getUnorderedPosts();
        setInterval(getUnorderedPosts, 10000);
    });

    onDestroy(() => {
        console.log("onDestroy");
        socket.close();
    });

    const getPosts = async () => {
        console.log('getPosts');
        const wp_posts = await wp_api_post("frontpage_engine_fetch_posts", {
            id: frontpage_id,
        });
        $featuredPosts = wp_posts.map(map_posts);
    }

    const getUnorderedPosts = async () => {
        console.log('getUnOrderedPosts');
        const wp_posts = await wp_api_post("frontpage_engine_fetch_unordered_posts", {
            id: frontpage_id,
        });
        $unorderedPosts = wp_posts.map(map_posts);
    }

    const updated = () => {
        socket.sendMessage({ name: "frontpage_updated", message: "Updated front page" });
    }
</script>

<main>
    <a href="#show-modal" class="button button-primary" on:click={() => show_modal = true}>Add posts</a>
    Posts waiting to be added to the front page: <b>{$unorderedPosts.length}</b>
    <hr>
    {#if show_modal}
    <Modal on:close="{() => show_modal = false}">
        <h2 slot="header">Add Posts</h2>
        <AddPostTable frontpage_id={frontpage_id} on:updated={updated} />
    </Modal>
    {/if}
    <FrontpageTable on:updated={updated} />
</main>

<style>
   
</style>