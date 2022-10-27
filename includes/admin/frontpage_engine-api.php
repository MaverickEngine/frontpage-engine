<?php

class FrontPageEngineAPI {
    public function __construct() {
        add_action("wp_ajax_frontpage_engine_order_posts", [ $this, 'order_posts' ]);
        add_action("wp_ajax_frontpage_engine_feature_post", [ $this, 'feature_post' ]);
        add_action("wp_ajax_frontpage_engine_fetch_posts", [ $this, 'fetch_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unfeatured_posts", [ $this, 'fetch_unfeatured_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unordered_posts", [ $this, 'fetch_unordered_posts' ]);
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

    public function feature_post() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->get_frontpage($frontpage_id);
        if (empty($_POST["post_id"]) || empty($_POST["position"])) {
            wp_die('Missing post_id or position.');
        }
        $post_id = intval($_POST["post_id"]);
        $position = intval($_POST["position"]);
        update_post_meta( $post_id, $frontpage->ordering_code, $position );
        update_post_meta( $post_id, $frontpage->featured_code, true );
        wp_set_post_terms( $post_id, $frontpage->featured_code, 'flag', true );
        print json_encode( true );
        wp_die();
    }

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

    public function fetch_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page');
        }
        if (empty($_POST["id"])) {
            wp_die('Missing ID');
        }
        
        global $wpdb;
        $frontpage_id = sanitize_text_field($_POST["id"]);
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
        $posts = get_posts( $params );
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
}