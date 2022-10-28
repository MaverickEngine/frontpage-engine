import { writable } from 'svelte/store';
import { wp_api_post } from './lib/wp_api';

export const featuredPosts = writable([]);
export const unfeaturedPosts = writable([]);
export const unorderedPosts = writable([]);
export const slots = writable([]);