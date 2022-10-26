import { writable } from 'svelte/store';

export const featuredPosts = writable([
    {
        id: 1,
        title: "Hello world",
        author: "John Doe",
        excerpt: "This is an excerpt",
        thumbnail: "https://via.placeholder.com/150",
        link: "https://example.com"
    },
    {
        id: 2,
        title: "Hello world 2",
        author: "Jane Doe",
        excerpt: "This is an excerpt 2",
        thumbnail: "https://via.placeholder.com/150",
        link: "https://example.com"
    },
    {
        id: 3,
        title: "Hello world 3",
        author: "John Donne",
        excerpt: "This is an excerpt 3",
        thumbnail: "https://via.placeholder.com/150",
        link: "https://example.com"
    },
]);