export const map_posts = (post) => {
    return {
        id: post.id || post.ID || post.slot?.post_id || `slot-${post.slot?.id}`,
        title: post.post_title,
        author: post.post_author,
        date_published: post.post_date,
        type: post.post_type,
        image: post.image,
        order: post.menu_order,
        slot: post.slot,
        locked: !!(post.slot?.lock_until),
    }
};

export const applyLockedSlots = (posts) => {
    const locked_posts = posts.filter(post => post.locked).sort((a, b) => a.slot.display_order - b.slot.display_order);
    for (let locked_post of locked_posts) {
        const locked_post_index = posts.findIndex(post => post.id === locked_post.id);
        posts.splice(locked_post_index, 1);
        posts.splice(Number(locked_post.slot.display_order), 0, locked_post);
    }
    return posts;
}

export const applySlots = (posts, slots) => {
    return posts
    .map((post, i) => {
        post.slot = slots[i];
        post.locked = false;
        if (post.slot.lock_until) {
            post.locked = true;
        }
        return post;
    })
}

export const applyAnalytics = (posts, analytics) => {
    return posts
    .map(post => {
        const post_analytics = analytics.find(a => a.post_id === post.id);
        if (post_analytics) {
            post.analytics = post_analytics;
        }
        return post;
    });
}