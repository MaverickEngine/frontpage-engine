import { writable } from 'svelte/store';

export const featuredPosts = writable([]);
export const featuredPostsDynamic = writable([]);
export const unfeaturedPosts = writable([]);
export const unorderedPosts = writable([]);
export const slots = writable([]);
export const totalHits = writable(0);
export const analytics = writable([]);
export const frontpageId = writable(0);