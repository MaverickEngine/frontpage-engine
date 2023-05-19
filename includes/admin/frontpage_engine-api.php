<?php

require_once("frontpage_engine-lib.php");

class FrontPageEngineAPI extends FrontPageEngineLib {

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

        register_rest_route('frontpageengine/v1', '/autosort/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'autosort' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/analytics/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'get_analytics' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/analytics', array(
            'methods' => 'POST',
            'callback' => array( $this, 'post_analytics' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/slot/manual/(?P<frontpage_id>\d+)/(?P<slot_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'set_manual' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/slot/auto/(?P<frontpage_id>\d+)/(?P<slot_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'set_auto' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));

        register_rest_route('frontpageengine/v1', '/full_refresh/(?P<frontpage_id>\d+)', array(
            'methods' => 'GET',
            'callback' => array( $this, 'full_refresh' ),
            'permission_callback' => function () {
                return current_user_can( 'edit_others_posts' );
            }
        ));
    }

    /**
     * Internal methods
     */
    
    public function _get_frontpage(int $frontpage_id) {
        global $wpdb;
        if ($this->frontpage_id == $frontpage_id) {
            return $this->frontpage;
        }
        $this->frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $frontpage_id));
        $this->frontpage_id = $frontpage_id;
        return $this->frontpage;
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
                    $post_class->sections = [];
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

    /**
     * Move a post to a new position
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function move_post(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
            $slot_id = intval($request->get_param('slot_id'));
            $this->_insert_post($frontpage_id, $post_id, $slot_id);
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Lock a slot
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function lock_post(WP_REST_Request $request) {
        global $wpdb;
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
            $lock_until = $request->get_param('lock_until');
            $user = wp_get_current_user();
            $locked_by = $user->user_login;
            $locked_at = gmdate("Y-m-d H:i:s");
            $wpdb->update(
                "{$wpdb->prefix}frontpage_engine_frontpage_slots",
                array(
                    'lock_until' => $lock_until,
                    'locked_by' => $locked_by,
                    'locked_at' => $locked_at,
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
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Unlock a slot
     *
     * @param WP_REST_Request $request
     * @return array
     */
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
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Add a post to a frontpage
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function add_post(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $frontpage = $this->_get_frontpage($frontpage_id);
            $post_id = intval($request->get_param('post_id'));
            $position = $request->get_param('position');
            $slots = $this->_get_slots($frontpage_id);
            $slot = null;
            if (is_numeric($position)) {
                $slot = $slots[$position - 1];
            }
            if ($position === "top") {
                $slot = $slots[0];
            }
            if ($position === "bottom") {
                $slot = $slots[$frontpage->number_of_slots - 1];
            }
            if ($position === "auto") {
                $slot = $this->_auto_slot($frontpage_id, $post_id, ($request->get_param("simulate_analytics") !== null));
            }
            $this->_insert_post($frontpage_id, $post_id, $slot->id);
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Remove a post from a frontpage
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function remove_post(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $post_id = intval($request->get_param('post_id'));
            if (!$frontpage_id || !$post_id) {
                throw new Exception("Invalid parameters");
            }
            $this->_remove_post($frontpage_id, $post_id);
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Get a list of posts that are not featured
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function unfeatured_posts(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $page = intval($request->get_param('page')) ?: 1;
            $per_page = intval($request->get_param('per_page')) ?: 50;
            $search = $request->get_param('search') ?: "";
            $frontpage = $this->_get_frontpage($frontpage_id);
            $params = array(
                'post_type'   => explode(",", $frontpage->post_types),
                'post_status' => 'publish',
            );
            $params['numberposts'] = $per_page;
            $params['offset'] = ($page - 1) * $per_page;
            $params['s'] = $search;
            $params['orderby'] = 'publish_date';
            $params['order'] = 'DESC';
            $params['meta_query'] = array(
                array(
                 'key' => $frontpage->ordering_code,
                 'compare' => 'NOT EXISTS'
                ),
            );
            $posts = get_posts( $params );
            return array("posts" => array_map([$this, "_map_wp_post"], $posts));
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Autosort the frontpage
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function autosort(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $this->_do_autosort($frontpage_id, ($request->get_param("simulate_analytics") !== null));
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    /**
     * Get the analytics data for a frontpage
     *
     * @param WP_REST_Request $request
     * @return array
     */
    public function get_analytics(WP_REST_Request $request) {
        try {
            if ($request->get_param("simulate_analytics") !== null) {
                $analytics = $this->_frontpage_analytics($request->get_param('frontpage_id'), true);
            } else {
                $analytics = $this->_frontpage_analytics($request->get_param('frontpage_id'));
            }
            return array("analytics" => $analytics);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function post_analytics(WP_REST_Request $request) {
        try {
            $post_ids = $request->get_param('post_ids');
            if ($request->get_param("simulate_analytics") !== null) {
                $analytics = $this->_simulate_analytics($post_ids);
            } else {
                $analytics = $this->_analytics($post_ids);
            }
            return array("analytics" => $analytics);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function set_manual(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $slot_id = intval($request->get_param('slot_id'));
            $this->_update_slot($slot_id, array("manual_order" => true));
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function set_auto(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $slot_id = intval($request->get_param('slot_id'));
            $this->_update_slot($slot_id, array("manual_order" => false));
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }

    public function full_refresh(WP_REST_Request $request) {
        try {
            $frontpage_id = intval($request->get_param('frontpage_id'));
            $this->_full_refresh($frontpage_id);
            $this->_ws_callback($frontpage_id, $request->get_header("x-wssb-uid"));
            return $this->get_posts($request);
        } catch (Exception $e) {
            return new WP_Error( 'error', $e->getMessage(), array( 'status' => 500 ) );
        }
    }
}