<?php

class FrontpageEngineAdmin {

    function __construct() {
        add_action('admin_init', [ $this, 'inlinePage'], 1);
        add_action('admin_menu', [ $this, 'menu' ]);
    }

    function menu() {
        global $wpdb;
        global $frontpageengine_menu_slug;
        add_menu_page( 'frontpage-engine-menu', 'FrontPage Engine', 'manage_categories', $frontpageengine_menu_slug, null, 'dashicons-editor-kitchensink', 2 );
        $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY display_order ASC");
        if (count($frontpages) !== 0) {
            $frontpage = array_shift($frontpages);
            add_menu_page( $frontpage->name, 'FrontPage Engine', 'manage_categories', 'frontpage-engine-menu', [$this, 'orderFrontPage'], 'dashicons-editor-kitchensink', 2 );
        }
        foreach($frontpages as $frontpage) {
            add_submenu_page($frontpageengine_menu_slug, $frontpage->name, $frontpage->name, 'manage_categories', 'frontpage-engine-menu-'.$frontpage->id, [$this, 'orderFrontPage'] );
        }
        
    }

    function orderFrontPage() {
        $frontpage = $this->get_frontpage();
        if (empty($frontpage)) {
            wp_die("Front Page not found");
        }
        if (empty($frontpage)) {
            wp_die("Front Page not found");
        }
        // Load JS
        wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.js', array( 'jquery', 'wp-api' ), FRONTPAGEENGINE_VERSION, false );
        wp_localize_script('frontpageengine-admin', 'ajax_var', array(
            'url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('frontpageengine-admin-nonce'),
            'ordering_code' => $frontpage->ordering_code,
            'featured_code' => $frontpage->featured_code,
            'action' => 'frontpage_engine_order_posts',
            'frontpage_id' => $frontpage->id,
            'revengine_content_promoter_api_url' => get_option("revengine_content_promoter_api_url")
        ));
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
}