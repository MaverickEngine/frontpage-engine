export default post => {
    return {
        id: post.id,
        title: post.post_title,
        author: post.post_author,
        date_published: post.post_date,
        type: post.post_type,
        image: post.image,
        order: post.menu_order,
    }
};