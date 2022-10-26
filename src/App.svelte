<script>
    import { onMount, onDestroy } from 'svelte';
    import FrontpageTable from "./components/FrontpageTable.svelte";
    import { FrontPageEngineSocketServer } from './websocket.js';
    import { featuredPosts } from './stores.js';
    import { wp_api_post } from "./lib/wp_api.js";

    export let frontpage_id;
    export let url;

    let socket = null;
    onMount(async () => {
        console.log("onMount");
        socket = new FrontPageEngineSocketServer(url);
        socket.subscribe(`frontpage-${frontpage_id}`);
        socket.on("frontpage_updated", getPosts);
        await getPosts();
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
        $featuredPosts = wp_posts.map(post => {
            return {
                id: post.id,
                title: post.post_title,
                author: post.post_author,
                date_published: post.post_date,
                type: post.post_type,
                image: post.image,
                order: post.menu_order,
            }
        });
    }

    const updated = () => {
        socket.sendMessage({ name: "frontpage_updated", message: "Updated front page" });
    }
</script>

<main>
    <FrontpageTable on:updated={updated} />
</main>

<style>
</style>