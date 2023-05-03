function htmlDecode(input) {
    var doc = new DOMParser().parseFromString(input, "text/html");
    return doc.documentElement.textContent;
}

export const map_posts = (post) => {
    return {
        id: post.id || post.ID || post.slot?.post_id || `slot-${post.slot?.id}`,
        title: post.post_title,
        author: post.post_author,
        date_published: post.post_date,
        edit_link: htmlDecode(post.edit_post_link),
        link: htmlDecode(post.post_link),
        type: post.post_type,
        image: post.image,
        order: post.menu_order,
        slot: post.slot,
        locked: !!(post.slot?.lock_until),
        locked_until: (post.slot?.lock_until) ? new Date(post.slot?.lock_until) : null,
        manual: !!(Number(post.slot?.manual_order)),
        analytics: post.analytics || {},
        is_blank: !(post.id),
        sections: post.post_sections || [],
        edit_lock_until: false,
    }
};