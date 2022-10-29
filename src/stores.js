import { writable } from 'svelte/store';
import { wp_api_post } from './lib/wp_api';

export const featuredPosts = writable([]);
export const unfeaturedPosts = writable([]);
export const unorderedPosts = writable([]);
export const slots = writable([]);
export const analytics = writable([
    {
        "post_id": 703,
        "hits": 657,
        "page_depth": 0.8,
        "time_on_page": 420
    },
    {
        "post_id": 654,
        "hits": 4684,
        "page_depth": 0.4,
        "time_on_page": 447
    },
    {
        "post_id": 224,
        "hits": 206,
        "page_depth": 0.9,
        "time_on_page": 872
    },
    {
        "post_id": 178,
        "hits": 7153,
        "page_depth": 0.5,
        "time_on_page": 729
    },
    {
        "post_id": 177,
        "hits": 1455,
        "page_depth": 0.3,
        "time_on_page": 12
    },
    {
        "post_id": 752,
        "hits": 2960,
        "page_depth": 0.2,
        "time_on_page": 675
    },
    {
        "post_id": 679,
        "hits": 3066,
        "page_depth": 0.2,
        "time_on_page": 710
    },
    {
        "post_id": 738,
        "hits": 402,
        "page_depth": 0.8,
        "time_on_page": 750
    },
    {
        "post_id": 733,
        "hits": 8940,
        "page_depth": 0.1,
        "time_on_page": 148
    },
    {
        "post_id": 562,
        "hits": 5588,
        "page_depth": 0.3,
        "time_on_page": 513
    },
    {
        "post_id": 559,
        "hits": 5717,
        "page_depth": 0.6,
        "time_on_page": 807
    },
    {
        "post_id": 592,
        "hits": 8837,
        "page_depth": 0.4,
        "time_on_page": 778
    },
    {
        "post_id": 659,
        "hits": 6695,
        "page_depth": 0.2,
        "time_on_page": 692
    },
    {
        "post_id": 564,
        "hits": 9278,
        "page_depth": 0.9,
        "time_on_page": 700
    },
    {
        "post_id": 673,
        "hits": 9074,
        "page_depth": 0.2,
        "time_on_page": 872
    },
    {
        "post_id": 672,
        "hits": 8196,
        "page_depth": 0.8,
        "time_on_page": 825
    },
    {
        "post_id": 683,
        "hits": 6316,
        "page_depth": 0.3,
        "time_on_page": 89
    },
    {
        "post_id": 718,
        "hits": 1396,
        "page_depth": 0.1,
        "time_on_page": 767
    },
    {
        "post_id": 684,
        "hits": 4857,
        "page_depth": 0.9,
        "time_on_page": 395
    },
    {
        "post_id": 739,
        "hits": 4867,
        "page_depth": 0.4,
        "time_on_page": 636
    },
    {
        "post_id": 707,
        "hits": 8539,
        "page_depth": 0.4,
        "time_on_page": 714
    }
]);