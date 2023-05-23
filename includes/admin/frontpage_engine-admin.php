<?php

require_once("frontpage_engine-lib.php");

class FrontpageEngineAdmin {
    

    public function __construct() {
        add_action('admin_head', [$this, 'hideLegacyMenu']);
        if (!$this->_check_permissions()) {
            return;
        }
        add_action('admin_init', [$this, 'inlinePage'], 1);
        add_action('admin_menu', [$this, 'menu']);
        add_action('add_meta_boxes', [$this, 'addMetaBox']);
        add_action('save_post', [$this, 'saveMetaBox']);
    }

    protected function _check_permissions() {
        if (!current_user_can('edit_others_posts')) {
            return false;
        }
        $approved_roles = get_option('frontpageengine_roles', []);
        if (!is_array($approved_roles)) {
            $approved_roles = [];
        }
        $user = wp_get_current_user();
        $user_roles = $user->roles;
        foreach($user_roles as $user_role) {
            if (in_array($user_role, $approved_roles)) {
                return true;
            }
        }
        return false;
    }

    public function menu() {
        global $wpdb;
        global $frontpageengine_menu_slug;
        add_menu_page( 'Frontpage Engine', 'Frontpage Engine', 'manage_categories', $frontpageengine_menu_slug, null, 'dashicons-editor-kitchensink', 2 );
        $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY display_order ASC");
        if (count($frontpages) !== 0) {
            $frontpage = array_shift($frontpages);
            add_submenu_page($frontpageengine_menu_slug, $frontpage->name, $frontpage->name, 'manage_categories', 'frontpage-engine-menu', [$this, 'orderFrontPage']);
        } else {
            add_submenu_page($frontpageengine_menu_slug, "Add Front Page", "Add Front Page", 'manage_categories', 'frontpage-engine-menu', [$this, 'noFrontPages']);
        }
        foreach($frontpages as $frontpage) {
            add_submenu_page($frontpageengine_menu_slug, $frontpage->name, $frontpage->name, 'manage_categories', 'frontpage-engine-menu-'.$frontpage->id, [$this, 'orderFrontPage'] );
        }
    }

    public function orderFrontPage() {
        $frontpage = $this->get_frontpage();
        if (empty($frontpage)) {
            wp_die("Front Page not found");
        }
        if (empty($frontpage)) {
            wp_die("Front Page not found");
        }
        // Load JS
        $development_mode = get_option("frontpageengine_development_mode");
        if ($development_mode) {
            wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.dev.js', array( 'jquery', 'wp-api' ), FRONTPAGEENGINE_VERSION . "-dev", false );
        } else {
            wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.js', array( 'jquery', 'wp-api' ), FRONTPAGEENGINE_VERSION . "-prod", false );
        }
        wp_localize_script('frontpageengine-admin', 'ajax_var', array(
            'url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('frontpageengine-admin-nonce'),
            'ordering_code' => $frontpage->ordering_code,
            'featured_code' => $frontpage->featured_code,
            'action' => 'frontpage_engine_order_posts',
            'frontpage_id' => $frontpage->id,
            'revengine_content_promoter_api_url' => get_option("revengine_content_promoter_api_url"),
            'frontpageengine_wssb_address' => get_option("frontpageengine_wssb_ws_address"),
            'uid' => uniqid("frontpageengine-"),
        ));
        // Load CSS
        if ($development_mode) {
            wp_enqueue_style( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.dev.css', array(), FRONTPAGEENGINE_VERSION . "-dev" );
        } else {
            wp_enqueue_style( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.css', array(), FRONTPAGEENGINE_VERSION . "-prod" );
        }
        wp_enqueue_style( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/sortable.css', array(), FRONTPAGEENGINE_VERSION );
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/order_frontpage.php';
    }

    public function inlinePage() {
        if (isset($_GET["frontpageengine_select_article"]) && $_GET["frontpageengine_select_article"] == "true") {
            $frontpage = $this->get_frontpage();
            if (empty($frontpage)) {
                wp_die("Front Page not found");
            }
            // Load JS
            wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.js', array( 'jquery', 'wp-api' ), FRONTPAGEENGINE_VERSION, false );
            $nonce = wp_create_nonce('frontpageengine-admin-nonce');
            wp_localize_script('frontpageengine-admin', 'ajax_var', array(
                'url' => admin_url('admin-ajax.php'),
                'nonce' => $nonce,
                'ordering_code' => $frontpage->ordering_code,
                'featured_code' => $frontpage->featured_code,
                // 'action' => 'frontpage_engine_insert_post'
            ));
            require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/select_article_iframe.php';
            exit;
        }
    }

    public function hideLegacyMenu() {
        ?>
        <style>
            #toplevel_page_featured-flagged-post {
                display: none;
            }
        </style>
        <?php
    }

    private function get_frontpage() {
        if (empty($_GET["page"])) {
            return null;
        }
        global $wpdb;
        if ($_GET["page"] == "frontpage-engine-menu") {
            $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY display_order ASC");
            if (count($frontpages) !== 0) {
                $frontpage = array_shift($frontpages);
                return $frontpage;
            }
        }
        $id = str_replace("frontpage-engine-menu-", "", $_GET["page"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
        return $frontpage;
    }

    public function noFrontPages() {
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/no_frontpages.php';
    }

    public function addMetaBox($post_type) {
        try {
            $frontpagelib = new FrontPageEngineLib();
            $frontpages = $frontpagelib->getFrontPages();
            // Check that $post_type is included in one of our front pages
            $post_type_included = false;
            foreach ($frontpages as $frontpage) {
                $post_types = explode(",", $frontpage->post_types);
                if (in_array($post_type, $post_types)) {
                    $post_type_included = true;
                    break;
                }
            }
            if (!$post_type_included) {
                return;
            }
            add_meta_box(
                'frontpage_engine_meta_box',
                __( 'Frontpage Engine', 'frontpage-engine' ),
                [ $this, 'renderMetaBox' ],
                $post_type,
                'side',
                'core'
            );
        } catch (Exception $e) {
            // Log the error but keep going
            // phpcs:ignore
            error_log("Error adding meta box: ".$e->getMessage());
            return;
        }
    }

    public function renderMetaBox($post) {
        // Check if the post is published
        if ($post->post_status !== "publish") {
            print "Post must be published to be added to a front page";
            return;
        }
        $frontpages = $this->_getFrontPageWithPos($post->ID);
		wp_nonce_field( 'frontpage-engine-metabox', 'frontpage-engine-metabox_nonce' );
        require(plugin_dir_path( dirname( __FILE__ ) ).'admin/views/metabox.php');
    }

    public function saveMetaBox( $post_id ) {
        try {
            if ( ! isset( $_POST['frontpage-engine-metabox_nonce'] ) ) {
                return $post_id;
            }
            if ( ! wp_verify_nonce( $_POST['frontpage-engine-metabox_nonce'], 'frontpage-engine-metabox' ) ) {
                return $post_id;
            }
            if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
                return $post_id;
            }
            if ( !current_user_can( 'edit_others_posts' )) {
                return $post_id;
            }
            // Check if the post is published
            $post = get_post($post_id);
            if ($post->post_status !== "publish") {
                return $post_id;
            }
            $frontpages = $this->_getFrontPageWithPos($post_id);
            $to_change = [];
            $to_add = [];
            $to_remove = [];
            foreach($frontpages as $frontpage) {
                if (!isset($_POST["frontpage_engine_position_{$frontpage->id}"])) {
                    continue;
                }
                $pos = intval($_POST["frontpage_engine_position_{$frontpage->id}"]);
                if ($pos + 0 !== $frontpage->position + 0) {
                    if ($pos === -1) {
                        $to_remove[] = $frontpage->id;
                    } else if ($frontpage->position === -1) {
                        $to_add[] = [
                            "frontpage_id" => $frontpage->id,
                            "position" => $pos
                        ];
                    } else {
                        $to_change[] = [
                            "frontpage_id" => $frontpage->id,
                            "position" => $pos
                        ];
                    }
                }
            }
            $frontpagelib = new FrontPageEngineLib();
            foreach($to_add as $change) {
                $data = [ 
                    'post_id' => $post_id + 0,
                    'position' => $change["position"] + 1,
                ];
                $request = new WP_REST_Request( 'POST', "/frontpageengine/v1/add_post/{$change['frontpage_id']}" );
                $request->set_body_params( $data );
                $response = rest_do_request( $request );
            }
            foreach($to_change as $change) {
                $slots = $frontpagelib->_get_slots($change["frontpage_id"]);
                $key = array_search($change["position"], array_column($slots, 'display_order'));
                if ($key === false) {
                    continue;
                }
                $slot = $slots[$key];
                $data = [ 
                    'post_id' => $post_id + 0,
                    'slot_id' => $slot->id,
                ];
                $request = new WP_REST_Request( 'POST', "/frontpageengine/v1/move_post/{$change['frontpage_id']}" );
                $request->set_body_params( $data );
                $response = rest_do_request( $request );
            }
            return $post_id;
        } catch (Exception $e) {
            // Log the error but keep going
            // phpcs:ignore
            error_log("Error saving meta box: ".$e->getMessage());
            return $post_id;
        }
	}

    private function _getFrontPageWithPos($post_id) {
        $frontpagelib = new FrontPageEngineLib();
        $frontpages = $frontpagelib->getFrontPages();
        $post_type = get_post_type($post_id);
        foreach ($frontpages as $key => $frontpage) {
            $post_types = explode(",", $frontpage->post_types);
            if (!in_array($post_type, $post_types)) {
                unset($frontpages[$key]);
            }
        }
        $slots = $frontpagelib->getPostSlots($post_id);
        // Add the position to the front pages
        foreach($frontpages as $frontpage) {
            $slot = array_search($frontpage->id, array_column($slots, 'frontpage_id'));
            if ($slot === false) {
                $pos = -1;
            } else {
                $pos = $slots[$slot]->display_order;
            }
            $frontpage->position = $pos + 0;
        }
        return $frontpages;
    }
}