<?php

class FrontPageEngineAPI {
    public function __construct() { // All wp_ajax routes to be deprecated
        add_action( 'rest_api_init', array( $this, 'register_api_routes' ) );
    }

    public function register_api_routes() {
        register_rest_route('frontpageengine/v1', '/get_posts/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'get_posts' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/move_post/(?P<frontpage_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array( $this, 'move_post' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/lock_post/(?P<frontpage_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array( $this, 'lock_post' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/unlock_post/(?P<frontpage_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array( $this, 'unlock_post' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/add_post/(?P<frontpage_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array( $this, 'add_post' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/remove_post/(?P<frontpage_id>\d+)', array(
            'methods' => 'POST',
            'callback' => array( $this, 'remove_post' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/auto_order/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'auto_order' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/unfeatured_posts/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'unfeatured_posts' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));
    }

    private function _get_frontpage($frontpage_id) {
        global $wpdb;
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $frontpage_id));
        return $frontpage;
    }

    private function _get_slots($frontpage_id) {
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order ASC", $frontpage_id));
        return $this->_map_slots($slots);
    }

    private function _get_slot_by_post_id($frontpage_id, $post_id) {
        global $wpdb;
        $slot = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d AND post_id = %d", $frontpage_id, $post_id));
        if ($wpdb->last_error) {
            throw new Error($wpdb->last_error);
        }
        return $this->_map_slots(array($slot))[0];
    }

    private function _get_slot($slot_id) {
        global $wpdb;
        $slot = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE id = %d", $slot_id));
        return $this->_map_slots(array($slot))[0];
    }

    protected function _insert_missing_post_id_from_old_system($frontpage_id) {
        global $wpdb;
        $frontpage = $this->_get_frontpage($frontpage_id);
        $slots = $this->_get_slots($frontpage_id);
        $empty_slots = array_filter($slots, function($slot) {
            return !$slot->post_id;
        });
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
		);
        $params['meta_key'] = $frontpage->ordering_code;
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
        // Remove all posts that are already in a slot
        $posts = array_filter($posts, function($post) use ($slots) {
            foreach ($slots as $slot) {
                if ($slot->post_id == $post->ID) {
                    return false;
                }
            }
            return true;
        });
        foreach ($posts as $post) {
            $post_id = $post->ID;
            $slot = array_shift($empty_slots);
            $wpdb->update(
                $wpdb->prefix . 'frontpage_engine_frontpage_slots',
                array(
                    'post_id' => $post_id,
                ),
                array(
                    'id' => $slot->id,
                )
            );
            if ($wpdb->last_error) {
                throw new Exception($wpdb->last_error);
            }
            if (count($empty_slots) == 0) {
                break;
            }
        }
        
    }

    protected function _project_post($post) {
        $new_post = new stdClass();
        if (!$post->slot) {
            $post->slot = $this->_get_slot($post->slot_id);
        }
        $new_post->slot        = $post->slot;
        $new_post->post_link   = get_edit_post_link( $post->ID );
        $new_post->id          = $post->ID;
        $new_post->image       = get_the_post_thumbnail_url( $post->ID, array( 50, 50 ) );
        $new_post->post_title  = $post->post_title;
        $new_post->post_author = get_the_author_meta( 'display_name', $post->post_author );
        $new_post->post_date   = get_the_time( 'Y/m/d H:i:s', $post->ID );
        // $new_post->menu_order   = $post->menu_order;
        // $new_post->post_type    = get_post_type_object( $post->post_type )->labels->singular_name;
        $new_post->post_status  = $post->post_status;
        return $new_post;
    }

    protected function _case_map($slot) {
        if (is_array($slot)) {
            $slot = (object)$slot;
        }
        $slot_id = intval($slot->id);
        $post_id = intval($slot->post_id);
        $post_id = $post_id == 0 ? "null" : $post_id;
        return "WHEN id = {$slot_id} THEN {$post_id}";
    }

    protected function _insert_post($frontpage_id, $post_id, $slot_id) {
        // Inserts a post at slot_id, and moves all other posts down, while maintaining the order of locked post slots
        global $wpdb;
        $post_id = intval($post_id);
        $slot_id = intval($slot_id);
        $slots = $this->_get_slots($frontpage_id);
        $target_slot = $this->_get_slot($slot_id);
        $fixed_slots = array_filter($slots, function($slot) {
            return $slot->lock_until;
        });
        $already_exists = !empty(array_filter($fixed_slots, function($slot) use ($post_id) {
            return $slot->post_id == $post_id;
        }));
        if ($already_exists) {
            throw new Exception("Post already exists in frontpage");
        }
        $post_id_array = [];
        $x = 0;
        foreach($slots as $slot) {
            if (intval($slot->post_id) !== $post_id) {
                $post_id_array[$x++] = $slot->post_id;
            }
        }
        array_splice($post_id_array, $target_slot->display_order, 0, $post_id);
        foreach($fixed_slots as $fixed_slot) {
            $post_id_array = array_filter($post_id_array, function($post_id) use ($fixed_slot) {
                return $post_id !== $fixed_slot->post_id;
            });
        }
        foreach($fixed_slots as $fixed_slot) {
            array_splice($post_id_array, $fixed_slot->display_order, 0, $fixed_slot->post_id);
        }
        foreach($slots as $slot) {
            if (count($post_id_array) > 0) {
                $slot->post_id = array_shift($post_id_array);
            } else {
                $slot->post_id = null;
            }
        }
        // Update the database
        $sql = "UPDATE {$wpdb->prefix}frontpage_engine_frontpage_slots SET post_id = CASE ";
        $sql .= implode(" ", array_map(array($this, '_case_map'), $slots));
        $sql .= " END WHERE id IN (";
        $sql .= implode(", ", array_map(function($slot) { return $slot->id; }, $slots));
        $sql .= ")";
        // phpcs:ignore
        $wpdb->query($sql);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    protected function _remove_post($frontpage_id, $post_id) {
        global $wpdb;
        $post_id = intval($post_id);
        $slots = $this->_get_slots($frontpage_id);
        $fixed_slots = array_filter($slots, function($slot) {
            return $slot->lock_until;
        });
        $existing_post_ids = [];
        foreach($slots as $slot) {
            if (intval($slot->post_id) !== intval($post_id)) {
                $existing_post_ids[] = $slot->post_id;
            }
        }
        foreach($fixed_slots as $fixed_slot) {
            $existing_post_ids = array_filter($existing_post_ids, function($post_id) use ($fixed_slot) {
                return $post_id !== $fixed_slot->post_id;
            });
        }
        foreach($fixed_slots as $fixed_slot) {
            array_splice($existing_post_ids, $fixed_slot->display_order, 0, $fixed_slot->post_id);
        }
        foreach($slots as $slot) {
            if (count($existing_post_ids) > 0) {
                $slot->post_id = array_shift($existing_post_ids);
            } else {
                $slot->post_id = null;
            }
        }
        $sql = "UPDATE {$wpdb->prefix}frontpage_engine_frontpage_slots SET post_id = CASE ";
        $sql .= implode(" ", array_map(array($this, '_case_map'), $slots));
        $sql .= " END WHERE id IN (";
        $sql .= implode(", ", array_map(function($slot) { return $slot->id; }, $slots));
        $sql .= ")";
        // phpcs:ignore
        $wpdb->query($sql);
        // print_r($wpdb->last_query);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    public function get_posts($request) {
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            // $posts = $this->_get_posts($frontpage_id);
            $slots = $this->_get_slots($frontpage_id);
            $empty_slots = array_filter($slots, function($slot) {
                return !$slot->post_id;
            });
            // if (count($empty_slots) > 0) {
            //     $this->_insert_missing_post_id_from_old_system($frontpage_id);
            //     $slots = $this->_get_slots($frontpage_id);
            // }
            $posts = array_map(function($slot) use ($frontpage_id) {
                if (!$slot->post_id) {
                    $post = new stdClass();
                    $post->ID = null;
                    $post->post_title = "Empty";
                    $post->post_author = null;
                    $post->post_date = null;
                    $post->post_type = null;
                    $post->post_status = null;
                } else {
                    $post = get_post($slot->post_id);
                }
                $post->slot = $slot;
                return $this->_project_post($post);
            }, $slots);
            return ["posts" => $posts];
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function move_post($request) {
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            $post_id = $request->get_param('post_id');
            $to = $request->get_param('to');
            $this->_insert_post($frontpage_id, $post_id, $to);
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function lock_post($request) {
        global $wpdb;
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            $post_id = $request->get_param('post_id');
            $lock_until = $request->get_param('lock_until');
            $wpdb->update(
                "{$wpdb->prefix}frontpage_engine_frontpage_slots",
                array(
                    'lock_until' => $lock_until,
                ),
                array(
                    'frontpage_id' => $frontpage_id,
                    'post_id' => $post_id,
                ),
                array(
                    '%s',
                ),
                array(
                    '%d',
                    '%d',
                )
            );
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function unlock_post($request) {
        global $wpdb;
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            $post_id = $request->get_param('post_id');
            $wpdb->update(
                "{$wpdb->prefix}frontpage_engine_frontpage_slots",
                array(
                    'lock_until' => null,
                ),
                array(
                    'frontpage_id' => $frontpage_id,
                    'post_id' => $post_id,
                ),
                array(
                    '%s',
                ),
                array(
                    '%d',
                    '%d',
                )
            );
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function add_post($request) {
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            $frontpage = $this->_get_frontpage($frontpage_id);
            $post_id = $request->get_param('post_id');
            $position = $request->get_param('position');
            $slots = $this->_get_slots($frontpage_id);
            $slot = null;
            if ($position === "top") {
                $slot = $slots[0];
            }
            if ($position === "bottom") {
                $slot = $slots[$frontpage->number_of_slots - 1];
            }
            $this->_insert_post($frontpage_id, $post_id, $slot->id);
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function remove_post($request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
            if (!$frontpage_id || !$post_id) {
                throw new Exception("Invalid parameters");
            }
            $this->_remove_post($frontpage_id, $post_id);
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function unfeatured_posts($request) {
        try {
            $frontpage_id = $request->get_param('frontpage_id');
            $frontpage = $this->_get_frontpage($frontpage_id);
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
            return array("posts" => array_map([$this, "map_post"], $posts));
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    // public function remove_post($request) {
    //     $frontpage_id = $request->get_param('frontpage_id');
    //     $post_id = $request->get_param('post_id');
    //     $frontpage = $this->_get_frontpage($frontpage_id);
    //     $slots = $this->_get_slots($frontpage_id);
    //     $slot = array_filter($slots, function($slot) use ($post_id) {
    //         return $slot->post_id == $post_id;
    //     });
    //     $slot = array_values($slot)[0];
    //     $this->_delete_slot($slot->id);
    //     return $this->get_posts($request);
    // }

    public function auto_order($request) {
        $frontpage_id = $request->get_param('frontpage_id');
        $this->_correct_post_order($frontpage_id);
        return $this->get_posts($request);
    }

    

    private function _correct_post_order($frontpage_id) {
        $frontpage = $this->_get_frontpage($frontpage_id);
        $posts = $this->_get_posts($frontpage_id);
        $slots = $this->_get_slots($frontpage_id);
        $locked_slots = array_filter($slots, function($slot) {
            return $slot->lock_until;
        });
        foreach($locked_slots as $slot) {
            $locked_post_pos = array_search($slot->post_id, array_column($posts, 'ID'));
            $locked_post = array_splice($posts, $locked_post_pos, 1);
            array_splice($posts, $slot->display_order, 0, $locked_post);
        }
        $i = 0;
        foreach ($posts as $post) {
            $i++;
            update_post_meta( $post->ID, $frontpage->ordering_code, $i );
        }
    }

    private function _show_error($error, $code = 500) {
        wp_send_json_error( $error, $code );
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
            if (!empty($slot->lock_until)) {
                $lock_until_timestamp = strtotime($slot->lock_until);
                $now = time();
                if ($lock_until_timestamp < $now) {
                    $slot->lock_until = null;
                }
            } else {
                $slot->lock_until = null;
            }
        }
        return $slots;
    }

    protected function _get_posts($frontpage_id) {
        global $wpdb;
        $frontpage = $this->_get_frontpage($frontpage_id);
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

    public function order_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (!isset($_POST) || empty($_POST['id'])) {
            $this->_show_error('Missing id.', 400);
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->_get_frontpage($frontpage_id);
        $status = false;
        if (isset($_POST['order']) && is_array($_POST['order'])) {
            foreach ( $_POST['order'] as $key => $post_id ) {
                update_post_meta( $post_id, $frontpage->ordering_code, $key );
                update_post_meta( $post_id, $frontpage->featured_code, true );
                wp_set_object_terms( $post_id, [$frontpage->featured_code], 'flag', true );
            }
            $status = true;
        }
        $this->_correct_post_order($frontpage_id);
        print wp_json_encode( $status );
        wp_die();
    }

    public function fetch_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing ID', 400);
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $posts = $this->_get_posts($frontpage_id);
        // Get analytics
        // $analytics = $this->fetch_analytics($frontpage_id);
        print wp_json_encode(array_map([$this, "map_post"], $posts));
        wp_die();
    }

    

    public function fetch_unordered_posts() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing id.', 400);
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        $frontpage = $this->_get_frontpage($frontpage_id);
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
        print wp_json_encode(array_map([$this, "map_post"], $posts));
        wp_die();
    }

    

    public function fetch_slots() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing ID', 400);
        }
        $frontpage_id = sanitize_text_field($_POST["id"]);
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order ASC", $frontpage_id));
        $slots = $this->_map_slots($slots);
        print wp_json_encode($slots);
        wp_die();
    }

    public function update_slot() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing id.', 400);
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
                if (empty("post_id")) {
                    wp_die('Missing post_id');
                }
                $update["lock_until"] = sanitize_text_field($_POST["lock_until"]);
            }
        }
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . 'frontpage_engine_frontpage_slots',
            $update,
            array('id' => $slot_id)
        );
        $frontpage_id = $wpdb->get_var($wpdb->prepare("SELECT frontpage_id FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE id = %d", $slot_id));
        $this->_correct_post_order($frontpage_id);
        print wp_json_encode(array("success" => true));
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
        // $frontpage = $this->_get_frontpage($frontpage_id);
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
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing id.', 400);
        }
        $frontpage_id = sanitize_text_field( $_POST["id"] );
        $content = $this->_fetch_analytics($frontpage_id);
        print wp_json_encode($content);
        wp_die();
    }

    public function get_slots() {
        if (empty($_POST['nonce']) || ! wp_verify_nonce( sanitize_text_field($_POST['nonce']), 'frontpageengine-admin-nonce' ) ) {
            $this->_show_error('You do not have sufficient permissions to access this page.', 403);
        }
        if (empty($_POST["id"])) {
            $this->_show_error('Missing id.', 400);
        }
        $frontpage_id = sanitize_text_field( $_POST["id"] );
        $slots = $this->_get_slots($frontpage_id);
        print wp_json_encode($slots);
        wp_die();
    }
}