<?php

class FrontPageEngineAPI {
    public function __construct() {
        add_action("wp_ajax_frontpage_engine_order_posts", [ $this, 'order_posts' ]);
        // add_action("wp_ajax_frontpage_engine_feature_post", [ $this, 'feature_post' ]);
        add_action("wp_ajax_frontpage_engine_fetch_posts", [ $this, 'fetch_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unfeatured_posts", [ $this, 'fetch_unfeatured_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unordered_posts", [ $this, 'fetch_unordered_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_slots", [ $this, 'fetch_slots' ]);
        add_action("wp_ajax_frontpage_engine_update_slot", [ $this, 'update_slot' ]);
        add_action("wp_ajax_frontpage_engine_fetch_analytics", [ $this, 'fetch_analytics' ]);
    }

    private function get_frontpage($frontpage_id) {
        global $wpdb;
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $frontpage_id));
        return $frontpage;
    }

    public function order_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_POST) || empty($_POST['id'])) {
            wp_die('Missing id.');
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->get_frontpage($frontpage_id);
        $status = false;
        if (isset($_POST['order']) && is_array($_POST['order'])) {
            foreach ( $_POST['order'] as $key => $post_id ) {
                update_post_meta( $post_id, $frontpage->ordering_code, $key );
                update_post_meta( $post_id, $frontpage->featured_code, true );
                wp_set_object_terms( $post_id, [$frontpage->featured_code], 'flag', true );
            }
            $status = true;
        }
        print json_encode( $status );
        wp_die();
    }

    // public function feature_post() {
    //     if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
    //         wp_die('You do not have sufficient permissions to access this page.');
    //     }
    //     $frontpage_id = sanitize_text_field($_POST["id"]);
    //     $frontpage = $this->get_frontpage($frontpage_id);
    //     if (empty($_POST["post_id"]) || empty($_POST["position"])) {
    //         wp_die('Missing post_id or position.');
    //     }
    //     $post_id = intval($_POST["post_id"]);
    //     $position = intval($_POST["position"]);
    //     update_post_meta( $post_id, $frontpage->ordering_code, $position );
    //     update_post_meta( $post_id, $frontpage->featured_code, true );
    //     wp_set_post_terms( $post_id, $frontpage->featured_code, 'flag', true );
    //     print json_encode( true );
    //     wp_die();
    // }

    public function unfeature_post() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        $status = false;
        if ( ! empty( $_POST['ordering_code']) && ! empty( $_POST['post_id'] ) && ! empty($_POST['featured_code'])) {
            $status = update_post_meta( sanitize_text_field($_POST['post_id']), sanitize_text_field($_POST['ordering_code']), -1 );
            $status = update_post_meta( sanitize_text_field($_POST['post_id']), sanitize_text_field($_POST['featured_code']), 0 );
        }
        return $status;
    }

    protected function _get_posts($frontpage_id) {
        global $wpdb;
        $frontpage = $this->get_frontpage($frontpage_id);
        $slot_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d", $frontpage->id));
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
		);
        $params['meta_key'] = $frontpage->ordering_code;
        $params['numberposts'] = $slot_count;
        $params['orderby'] = 'meta_value_num';
        $params['order'] = 'ASC';
        $params['tax_query'] = array(
            'relation' => 'AND',
            array(
                'taxonomy' => 'flag',
                'field'    => 'slug',
                'terms'    => $frontpage->featured_code,
            ),
        );
        return get_posts( $params );
    }

    public function fetch_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $posts = $this->_get_posts($frontpage_id);
        // Get analytics
        // $analytics = $this->fetch_analytics($frontpage_id);
        print json_encode(array_map([$this, "map_post"], $posts));
        wp_die();
    }

    public function fetch_unfeatured_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page!');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        global $wpdb;
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->get_frontpage($frontpage_id);
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
		);
        $params['numberposts'] = 100;
        $params['orderby'] = 'publish_date';
        $params['order'] = 'DESC';
        $params['tax_query'] = array(
            'relation' => 'AND',
            array(
                'taxonomy' => 'flag',
                'field'    => 'slug',
                'terms'    => $frontpage->featured_code,
                'operator' => 'NOT IN',
            ),
        );
        $posts = get_posts( $params );
        print json_encode(array_map([$this, "map_post"], $posts));
        wp_die();
    }

    public function fetch_unordered_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page!');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->get_frontpage($frontpage_id);
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
		);
        $params['numberposts'] = 100;
        $params['orderby'] = 'publish_date';
        $params['order'] = 'DESC';
        $params['tax_query'] = array(
            'relation' => 'AND',
            array(
                'taxonomy' => 'flag',
                'field'    => 'slug',
                'terms'    => $frontpage->featured_code,
                'operator' => 'IN',
            ),
        );
        $params['meta_query'] = array(
            'relation' => 'AND',
            array(
                'key'     => $frontpage->ordering_code,
                'compare' => 'NOT EXISTS',
            ),
        );
        $posts = get_posts( $params );
        print json_encode(array_map([$this, "map_post"], $posts));
        wp_die();
    }

    private function map_post($post) {
        $link      = get_edit_post_link( $post->ID );
        $post_type = get_post_type_object( $post->post_type );
        $thumb     = get_the_post_thumbnail_url( $post->ID, array( 50, 50 ) );
        $data                   = array();
        $data['id']             = $post->ID;
        $data['image'] = ( $thumb ) ? $thumb : '';
        $data['post_title']          = $post->post_title;
        $data['post_link']           = $link;
        $data['post_author']    = get_the_author_meta( 'display_name', $post->post_author );
        $data['post_date']      = get_the_time( 'Y/m/d H:i:s', $post->ID );
        $data['menu_order']     = $post->menu_order;
        $data['post_type']      = $post_type->labels->singular_name;
        $data['post_status']    = $post->post_status;
        return $data;
    }

    protected function _map_slots($slots) {
        foreach ($slots as $slot) {
            if ($slot->lock_until) {
                $lock_until_timestamp = strtotime($slot->lock_until);
                $now = time();
                if ($lock_until_timestamp < $now) {
                    $slot->lock_until = null;
                }
            }
        }
        return $slots;
    }

    public function fetch_slots() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page!');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order ASC", $frontpage_id));
        $slots = $this->_map_slots($slots);
        print json_encode($slots);
        wp_die();
    }

    public function update_slot() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page!');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        $slot_id = sanitize_text_field($_POST["id"]);
        $update = array();
        if (!empty($_POST["post_id"])) {
            $update["post_id"] = sanitize_text_field($_POST["post_id"]);
        }
        if (!empty($_POST["post_type"])) {
            $update["post_type"] = sanitize_text_field($_POST["post_type"]);
        }
        if (!empty($_POST["automate"])) {
            $update["automate"] = sanitize_text_field($_POST["automate"]);
        }
        if (isset($_POST["lock_until"])) {
            if (empty($_POST["lock_until"])) {
                $update["lock_until"] = null;
            } else {
                $update["lock_until"] = sanitize_text_field($_POST["lock_until"]);
            }
        }
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . 'frontpage_engine_frontpage_slots',
            $update,
            array('id' => $slot_id)
        );
        print json_encode(array("success" => true));
        wp_die();
    }

    private function get_revengine_content_promoter($endpoint) {
        try {
            $url = get_option("revengine_content_promoter_api_url") . $endpoint;
            // print_r($url);
            $response = file_get_contents($url);
            return json_decode($response);
        } catch(Exception $e) {
            trigger_error("Unable to access RevEngine Content API", E_WARNING);
            return [];
        }
    }

    protected function _fetch_analytics($frontpage_id) {
        // $frontpage = $this->get_frontpage($frontpage_id);
        $posts = $this->_get_posts($frontpage_id);
        // print_r($posts);
        // die();
        $ids = array_map(function($post) {
            return "post_ids[]=" . $post->ID;
        }, $posts);
        // print_r($ids);
        $qs_ids = implode("&", $ids);
        // print_r($qs_ids);
        $content = $this->get_revengine_content_promoter("/analytics/posts?" . $qs_ids);
        $result = [];
        foreach($posts as $post) {
            $post_id = $post->ID;
            $hits = 0;
            foreach($content as $item) {
                if ($item->post_id == $post_id) {
                    $hits = $item->hits;
                    break;
                }
            }
            $result[] = array(
                "post_id" => $post_id,
                "hits" => $hits,
            );
        }
        return $result;
    }

    public function fetch_analytics() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page!');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        $frontpage_id = sanitize_text_field( $_POST["id"] );
        $content = $this->_fetch_analytics($frontpage_id);
        print json_encode($content);
        wp_die();
    }
}