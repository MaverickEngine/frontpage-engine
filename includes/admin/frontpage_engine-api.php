<?php

class FrontPageEngineAPI {
    public function __construct() {
        add_action("wp_ajax_frontpage_engine_order_posts", [ $this, 'order_posts' ]);
        add_action("wp_ajax_frontpage_engine_insert_post", [ $this, 'insert_post' ]);
        add_action("wp_ajax_frontpage_engine_fetch_posts", [ $this, 'fetch_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unfeatured_posts", [ $this, 'fetch_unfeatured_posts' ]);
        add_action("wp_ajax_frontpage_engine_fetch_unordered_posts", [ $this, 'fetch_unordered_posts' ]);
    }

    public function order_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        $status = false;
        if ( ! empty( $_POST['ordering_code'] && ! empty( $_POST['order'] ) ) ) {
            foreach ( sanitize_text_field($_POST['order']) as $key => $id ) {
                $status = update_post_meta( $id, sanitize_text_field($_POST['ordering_code']), $key );
            }
        }
        return $status;
    }

    public function insert_post() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if ( ! empty( $_POST['ordering_code'] && ! empty( $_POST['post_id'] ) && ! empty($_POST['featured_code'] && !empty($_POST["position"])) ) ) {
            update_post_meta( sanitize_text_field($_POST['post_id']), sanitize_text_field($_POST['ordering_code']), sanitize_text_field($_POST["position"]) );
            update_post_meta( sanitize_text_field($_POST['post_id']), sanitize_text_field($_POST['featured_code']), true );
            wp_set_object_terms( intval( $_POST['post_id'] ), [sanitize_text_field($_POST['featured_code'])], 'flag', true );
            return true;
        }
        print "not done";
        return false;
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
        $id = sanitize_text_field($_POST["id"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
        $slot_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}frontpage_engine_slots WHERE frontpage_id = %d", $frontpage->id));
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
        $id = sanitize_text_field($_POST["id"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
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
        $id = sanitize_text_field($_POST["id"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
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