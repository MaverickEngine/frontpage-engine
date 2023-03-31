<?php

class FrontPageEngineAPI {

    /**
     * Constructor
     */
    public function __construct() { // All wp_ajax routes to be deprecated
        $this->frontpage_id = -1;
        add_action( 'rest_api_init', array( $this, 'register_api_routes' ) );
    }

    /**
     * Register the API routes
     */
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

    /**
     * Private methods
     */

    private function _map_wp_post($post) {
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
    private function _get_frontpage(int $frontpage_id) {
        global $wpdb;
        if ($this->frontpage_id == $frontpage_id) {
            return $this->frontpage;
        }
        $this->frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $frontpage_id));
        $this->frontpage_id = $frontpage_id;
        return $this->frontpage;
    }

    private function _get_slots(int $frontpage_id) : array {
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order ASC", $frontpage_id));
        return $this->_map_slots($slots);
    }

    private function _get_slot(int $slot_id) : stdClass {
        global $wpdb;
        $slot = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE id = %d", $slot_id));
        return $this->_map_slots(array($slot))[0];
    }

    private function _clear_featured_posts(int $frontpage_id) {
        $frontpage = $this->_get_frontpage($frontpage_id);
        $posts = $this->_get_featured_posts($frontpage_id);
        foreach ( $posts as $post ) {
            delete_post_meta( $post->ID, $frontpage->ordering_code );
            delete_post_meta( $post->ID, $frontpage->featured_code );
            wp_remove_object_terms( $post->ID, $frontpage->featured_code, 'flag' );
        }
    }

    private function _set_featured_posts(int $frontpage_id) {
        $frontpage = $this->_get_frontpage($frontpage_id);
        $slots = $this->_get_slots($frontpage_id);
        $this->_clear_featured_posts($frontpage_id);
        foreach ( $slots as $slot ) {
            if ( $slot->post_id ) {
                update_post_meta( $slot->post_id, $frontpage->ordering_code, $slot->display_order );
                update_post_meta( $slot->post_id, $frontpage->featured_code, true );
                wp_set_object_terms( $slot->post_id, [$frontpage->featured_code], 'flag', true );
            }
        }
    }

    private function _get_featured_posts(int $frontpage_id) {
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

    protected function _migrate(int $frontpage_id) : stdClass {
        global $wpdb;
        $slots = $this->_get_slots($frontpage_id);
        $empty_slots = array_filter($slots, function($slot) {
            return !$slot->post_id;
        });
        $posts = $this->_get_featured_posts( $frontpage_id );
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
        $result = new stdClass();
        $result->status = "ok";
        $result->slots = $this->_get_slots($frontpage_id);
        $result->posts_migrated = count($posts);
        $result->frontpage_id = $frontpage_id;
        return $result;
    }

    protected function _project_post(WP_Post $post) : stdClass {
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
        $new_post->post_status  = $post->post_status;
        return $new_post;
    }

    protected function _case_map(stdClass $slot) : string {
        if (is_array($slot)) {
            $slot = (object)$slot;
        }
        $slot_id = intval($slot->id);
        $post_id = intval($slot->post_id);
        $post_id = $post_id == 0 ? "null" : $post_id;
        return "WHEN id = {$slot_id} THEN {$post_id}";
    }

    protected function _insert_post(int $frontpage_id, int $post_id, int $slot_id) {
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
        $this->_set_featured_posts($frontpage_id);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    protected function _remove_post(int $frontpage_id, int $post_id) {
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
        $this->_set_featured_posts($frontpage_id);
        // print_r($wpdb->last_query);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    /**
     * Requests
     */

    /**
     * Get all posts in a frontpage
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function get_posts(WP_REST_Request $request) : array {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            if (!$frontpage_id) {
                throw new Exception("Missing frontpage_id");
            }
            $slots = $this->_get_slots($frontpage_id);
            $posts = array_map(function($slot) {
                if (!$slot->post_id) {
                    $post_class = new stdClass();
                    $post_class->ID = null;
                    $post_class->post_title = "Empty";
                    $post_class->post_author = null;
                    $post_class->post_date = null;
                    $post_class->post_type = null;
                    $post_class->post_status = null;
                    $post = new WP_Post($post_class);
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

    public function move_post(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
            $to = intval($request->get_param('to'));
            $this->_insert_post($frontpage_id, $post_id, $to);
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function lock_post(WP_REST_Request $request) {
        global $wpdb;
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
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

    public function unlock_post(WP_REST_Request $request) {
        global $wpdb;
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
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

    public function add_post(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $frontpage = $this->_get_frontpage($frontpage_id);
            $post_id = intval($request->get_param('post_id'));
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

    public function remove_post(WP_REST_Request $request) {
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

    public function unfeatured_posts(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
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
            return array("posts" => array_map([$this, "_map_wp_post"], $posts));
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    private function _show_error($error, $code = 500) {
        wp_send_json_error( $error, $code );
        wp_die();
    }
}