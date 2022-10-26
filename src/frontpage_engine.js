import { FrontPageEngineSocketServer } from './websocket.js';

import App from './App.svelte'

const app = new App({
    target: document.getElementById('frontpage-engine-app'),
    props: {
        featured_code: ajax_var.featured_code,
        ordering_code: ajax_var.ordering_code,
        nonce: ajax_var.nonce,
        url: ajax_var.url,
        action: ajax_var.action,
        frontpage_id: ajax_var.frontpage_id,
    }
})

export default app

async function main() {
    console.log("Loading frontpage engine...");
    const Helper = function (e, ui) {
        ui.children().children().each(
            function () {
                jQuery( this ).width( jQuery( this ).width() );
            }
        );
        return ui;
    };

    function getOrder() {
        const order = jQuery( '#the-list input[name="featuredpost[]"]' ).map(function () { return jQuery( this ).val() }).get();;
        console.log(order);
        return order;
    }

    // Websocket
    const socketServer = new FrontPageEngineSocketServer(ajax_var.url);
    socketServer.subscribe(`frontpage-${ajax_var.featured_code}`);

    jQuery(function () {
        // Featured posts
        const featuredPostListTable = jQuery( 'table.featuredposts #the-list' );
        featuredPostListTable.sortable(
            {
                'items': 'tr',
                'axis': 'y',
                'helper': Helper,
                'update': function (e, ui) {
                    featuredPostListTable.sortable( "option", "disabled", true );
                    jQuery.post(
                        ajax_var.url,
                        {
                            nonce: ajax_var.nonce,
                            action: ajax_var.action,
                            ordering_code: ajax_var.ordering_code,
                            order: getOrder()
                        }
                    ).done(
                        function (data) {
                            socketServer.sendMessage("update");
                            featuredPostListTable.sortable( "option", "disabled", false );
                        }
                    )
                }
            }
        );
    });

    // Unfeatured posts
    const unfeaturedPostTable = jQuery( '#frontpageengineFeaturePosts table.featuredposts #the-list' );
    jQuery(".btn-insert").on("click", e => {
        const postId = e.target.dataset.id;
        jQuery.post(
            ajax_var.url,
            {
                nonce: ajax_var.nonce,
                action: "frontpage_engine_insert_post",
                ordering_code: ajax_var.ordering_code,
                featured_code: ajax_var.featured_code,
                position: 10,
                post_id: postId
            }
        ).done(
            function (data) {
                socketServer.sendMessage("update");
                socketServer.close();
                // unfeaturedPostTable.find(`tr[data-post-id="${postId}"]`).remove();
                self.parent.tb_remove();
            }
        )
    })
}

main();