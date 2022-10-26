<?php

class FrontpageEngineAdmin {

    function __construct() {
        add_action('admin_init', [ $this, 'inlinePage'], 1);
        add_action('admin_menu', [ $this, 'menu' ]);
    }

    function menu() {
        add_action( 'admin_menu', 'addFeaturedFlaggedPostMenu' );
        global $wpdb;
        $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY display_order ASC");
        add_menu_page( 'FrontPage Engine', 'FrontPage Engine', 'manage_categories', 'frontpage-engine-menu', 'orderFrontPage', 'dashicons-editor-kitchensink', 2 );
        foreach($frontpages as $frontpage) {
            add_submenu_page( 'frontpage-engine-menu', $frontpage->name, $frontpage->name, 'manage_categories', 'frontpage-engine-menu-'.$frontpage->id, [$this, 'orderFrontPage'] );
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
        wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.js', array( 'jquery' ), $this->version, false );
        wp_localize_script('frontpageengine-admin', 'ajax_var', array(
            'url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('frontpageengine-admin-nonce'),
            'ordering_code' => $frontpage->ordering_code,
            'featured_code' => $frontpage->featured_code,
            'action' => 'frontpage_engine_order_posts',
            'frontpage_id' => $frontpage->id,
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
            wp_enqueue_script( 'frontpageengine-admin', plugin_dir_url( dirname( __FILE__ ) ) . '../dist/frontpage_engine.js', array( 'jquery' ), $this->version, false );
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
        $id = str_replace("frontpage-engine-menu-", "", $_GET["page"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
        return $frontpage;
    }
}