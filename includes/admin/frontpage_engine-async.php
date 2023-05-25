<?php

require_once("frontpage_engine-lib.php");
require_once("frontpage_engine-admin.php");

class FrontpageEngineAsync extends FrontpageEngineAdmin {
    

    public function __construct() {
        add_action( 'transition_post_status', [$this, 'positionOnPublish'], 10, 3 );
    }

    public function positionOnPublish($new_status, $old_status, $post) {
        if ($new_status !== 'publish' || $old_status === 'publish') {
            return;
        }
        try {
            $frontpages = $this->_getFrontPageWithPos($post->ID);
            foreach($frontpages as $frontpage) {
                // error_log("Setting front page position on publish: ".$frontpage->id);
                $pos = get_post_meta($post->ID, "frontpage_engine_queued_position_{$frontpage->id}", true);
                if ($pos === "" || $pos + 0 === -1) {
                    continue;
                }
                $data = [ 
                    'post_id' => $post->ID + 0,
                    'position' => $pos + 1,
                ];
                $request = new WP_REST_Request( 'POST', "/frontpageengine/v1/add_post/{$frontpage->id}" );
                $request->set_body_params( $data );
                rest_do_request( $request );
                // Unset old meta
                delete_post_meta($post->ID, "frontpage_engine_queued_position_{$frontpage->id}");
            }
        } catch (Exception $e) {
            // Log the error but keep going
            // phpcs:ignore
            error_log("Error setting front page position on publish: ".$e->getMessage());
        }
    }
}