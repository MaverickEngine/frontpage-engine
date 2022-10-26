import { writable } from 'svelte/store';

export const featuredPosts = writable([]);
export const unfeaturedPosts = writable([]);
export const unorderedPosts = writable([]);