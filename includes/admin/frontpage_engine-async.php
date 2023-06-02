<?php

require_once("frontpage_engine-lib.php");
require_once("frontpage_engine-admin.php");
require_once("frontpage_engine-api.php");

class FrontpageEngineAsync extends FrontpageEngineAdmin {
    

    public function __construct() {
        add_action( 'transition_post_status', [$this, 'handlePostStatusChange'], 10, 3 );
    }

    public function handlePostStatusChange($new_status, $old_status, $post) {
        if ($new_status === 'publish' && $old_status !== 'publish') {
            $this->publishPost($post);
        }
        if ($new_status !== 'publish' && $old_status === 'publish') {
            $this->unpublishPost($post);
        }
    }

    protected function publishPost($post) {
        $frontpagelib = new FrontPageEngineLib();
        try {
            $frontpages = $this->get_front_page_with_pos($post->ID);
            foreach($frontpages as $frontpage) {
                $pos = get_post_meta($post->ID, "frontpage_engine_queued_position_{$frontpage->id}", true);
                if ($pos === "" || $pos + 0 === -1) {
                    continue;
                }
                // Here we replicate what we'd usually do through the API. Would be good to move it for DRY   
                $frontpage_id = intval($frontpage->id);
                $post_id = intval($post->ID);
                if (!$post_id) {
                    throw new Exception("Post ID not found");
                }
                $position = $pos + 1;
                $slots = $frontpagelib->_get_slots($frontpage_id);
                $slot = null;
                $slot = $slots[$position - 1];
                if (!$slot) {
                    throw new Exception("Invalid position");
                }
                $frontpagelib->insert_post($frontpage_id, $post_id, $slot->id);
                $frontpagelib->ws_callback($frontpage_id, "wp_cron");
                // Unset old meta
                delete_post_meta($post->ID, "frontpage_engine_queued_position_{$frontpage->id}");
            }
        } catch (Exception $e) {
            // Log the error but keep going
            // phpcs:ignore
            error_log("Error setting front page position on publish: ".$e->getMessage());
        }
    }

    protected function unpublishPost($post) {
        $frontpagelib = new FrontPageEngineLib();
        try {
            $frontpages = $this->get_front_page_with_pos($post->ID);
            foreach($frontpages as $frontpage) {
                $frontpage_id = intval($frontpage->id);
                $post_id = intval($post->ID);
                if (!$post_id) {
                    throw new Exception("Post ID not found");
                }
                $frontpagelib->remove_post($frontpage_id, $post_id);
                $frontpagelib->ws_callback($frontpage_id, "wp_cron");
            }
        } catch (Exception $e) {
            // Log the error but keep going
            // phpcs:ignore
            error_log("Error setting front page position on unpublish: ".$e->getMessage());
        }
    }
}