<?php

require_once("frontpage_engine-lib.php");

class FrontpageEngineAdminSettings {
    private $options = [
        "frontpageengine_development_mode",
        "frontpageengine_revengine_address",
    ];

    public function __construct() {
        add_action('admin_init', [$this, 'register_settings']);
        add_action('admin_menu', [$this, 'menu']);
        // add_action('admin_menu', [ $this, 'manage_page' ]);
    }

    public function register_settings() {
        foreach($this->options as $option) {
            register_setting( 'frontpageengine-settings-group', $option );
        }
    }

    public function menu() {
        global $frontpageengine_menu_slug;
        add_submenu_page('options-general.php', 'Frontpage Engine', 'Frontpage Engine', 'manage_categories', $frontpageengine_menu_slug . "-settings", [$this, "settings"] );
    }

    public function settings() {
        if (!current_user_can('manage_options')) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!$this->check_actions()) {
            require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/settings.php';
        }
    }

    // public function manage_page() {
    //     add_submenu_page(
    //         'frontpage-engine-menu',
	// 		'FrontpageEngine Manage',
	// 		'Manage Front Pages',
	// 		'manage_options',
	// 		'frontpageengine_manage',
	// 		[ $this, 'frontpageengine_manage' ]
	// 	);
    // }

    public function check_actions() {
        if (!current_user_can('manage_options')) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['action'])) {
            return false;
        }
        switch ($_GET['action']) {
            case 'edit':
                $this->edit_frontpage();
                break;
            case 'delete':
                $this->delete_frontpage();
                break;
            case 'delete_confirm':
                $this->delete_confirm();
                break;
            case 'new':
                $this->new_frontpage();
                break;
            case 'slots':
                $this->manage_slots();
                break;
            default: 
                wp_die('Invalid action');
        }
        return true;
    }

    public function new_frontpage() {
        if (isset($_POST['frontpageengine_frontpage'])) {
            if (wp_verify_nonce( $_POST['frontpageengine_frontpage'], 'new' )) {
                $id = $this->save_frontpage(true);
                $this->display_edit($id, 'Front Page Created');
            } else {
                wp_die('You do not have sufficient permissions to access this page.');
            }
        } else {
            require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/new_frontpage.php';
        }
    }

    public function save_frontpage(bool $new) {
        global $wpdb;
        if (! isset($_POST['frontpageengine_frontpage']) || ! wp_verify_nonce($_POST['frontpageengine_frontpage'], $new ? 'new' : 'edit' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_POST['frontpageengine_frontpage_name'])) {
            wp_die('Name required');
        }
        if (!isset($_POST['frontpageengine_frontpage_ordering_code'])) {
            wp_die('Ordering Code required');
        }
        if (!isset($_POST['frontpageengine_frontpage_featured_code'])) {
            wp_die('Featured Code required');
        }
        if (!isset($_POST['frontpageengine_frontpage_post_types'])) {
            wp_die('Post Types required');
        }
        if (!isset($_POST['frontpageengine_frontpage_number_of_slots'])) {
            wp_die('Number of slots required');
        }
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $data = [
            'name' => sanitize_text_field($_POST['frontpageengine_frontpage_name']),
            'ordering_code' => sanitize_text_field($_POST['frontpageengine_frontpage_ordering_code']),
            'featured_code' => sanitize_text_field($_POST['frontpageengine_frontpage_featured_code']),
            'post_types' => sanitize_text_field(join(",", $_POST['frontpageengine_frontpage_post_types'])),
            'number_of_slots' => intval($_POST['frontpageengine_frontpage_number_of_slots'])
        ];
        if ($new) {
            $wpdb->insert($table_name, $data, ['%s', '%s', '%s', '%s', '%d']);
            if ($wpdb->last_error) {
                wp_die(esc_attr($wpdb->last_error));
            }
            $id = $wpdb->insert_id;
        } else {
            if (!isset($_GET['frontpage_id'])) {
                wp_die('ID required');
            }
            $id = intval($_GET['frontpage_id']);
            $wpdb->update($table_name, $data, ['id' => $id]);
            if ($wpdb->last_error) {
                wp_die(esc_attr($wpdb->last_error));
            }
        }
        if (isset($_POST['frontpageengine_frontpage_number_of_slots'])) {
            $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
            $post_types = isset($_POST['frontpageengine_frontpage_post_types']) ? $_POST['frontpageengine_frontpage_post_types'] : [];
            $number_of_slots = intval($_POST['frontpageengine_frontpage_number_of_slots']);
            $start_count = 0;
            if (isset($_GET['frontpage_id']) && !$new) {
                // Ensure we don't have too many (or too few) number of slots
                $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order DESC", intval($_GET["frontpage_id"])));
                if (count($slots) > $number_of_slots) {
                    $wpdb->query($wpdb->prepare("DELETE FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order DESC LIMIT %d", intval($_GET["frontpage_id"]), count($slots) - $number_of_slots));
                    $start_count = $number_of_slots;
                } else {
                    $start_count = count($slots);
                }
            }
            $nf = new NumberFormatter("EN_US", NumberFormatter::ORDINAL);
            for ($i = $start_count; $i < $number_of_slots; $i++) {
                $wpdb->insert($table_name, [
                    'frontpage_id' => $id,
                    'automate' => isset($_POST['frontpageengine_frontpage_automate']) ? 1 : 0,
                    'post_types' => implode(',', $post_types),
                    'display_order' => $i,
                    'name' => "{$nf->format($i + 1)} Position",
                ]);
                // Check for errors
                if ($wpdb->last_error) {
                    wp_die(esc_attr($wpdb->last_error));
                }
            }
        }
        if (isset($_POST['frontpageengine_frontpage_import_legacy'])) {
            $this->import_legacy($id);
        }
        return $id;
    }

    public function import_legacy(int $frontpage_id) {
        $frontpagelib = new FrontPageEngineLib();
        $posts = $frontpagelib->_get_featured_posts( $frontpage_id );
        $slots = $frontpagelib->_get_slots($frontpage_id);
        $i = 0;
        foreach ($slots as $slot) {
            $frontpagelib->_set_slot_post($slot->id, $posts[$i++]->ID);
        }
    }

    public function delete_frontpage() {
        global $wpdb;
        if (!check_admin_referer( 'delete' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        if (!isset($_POST['frontpageengine_delete_confirm'])) {
            $this->delete_confirm();
            exit;
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        $id = intval($_GET['frontpage_id']);
        $frontpagelib = new FrontPageEngineLib();
        $frontpage = $frontpagelib->_get_frontpage($id);
        if (!$frontpage) {
            wp_die('Frontpage not found');
        }
        if (isset($_POST['frontpageengine_delete_confirm'])) {
            if (empty($_POST["frontpageengine_frontpage_name"])) {
                $this->delete_confirm('Name required');
                exit;
            }
            if ($frontpage->name != $_POST["frontpageengine_frontpage_name"]) {
                $this->delete_confirm('Name does not match');
                exit;
            }
        }
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $wpdb->delete($table_name, ['id' => $id]);
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
        $wpdb->delete($table_name, ['frontpage_id' => $id]);
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/delete_success.php';
    }

    public function delete_confirm($error = null) {
        if (!check_admin_referer( 'delete' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        $frontpage_id = intval($_GET['frontpage_id']);
        $frontpagelib = new FrontPageEngineLib();
        $frontpage = $frontpagelib->_get_frontpage($frontpage_id);
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/delete_confirm.php';
    }

    public function manage_frontpage() {
        if (!check_admin_referer( 'manage' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/manage_frontpage.php';
    }

    public function manage_slots() {
        if (!check_admin_referer( 'slots' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        $frontpage_id = intval($_GET['frontpage_id']);
        global $wpdb;
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", intval($_GET['frontpage_id'])));
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/manage_slots.php';
    }

    protected function display_edit($id, $message = null) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", intval($id)));
        if (!empty($message)) {
            echo '<div class="notice notice-success is-dismissible"><p>' . esc_html($message) . '</p></div>';
        }
        require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/edit_frontpage.php';
    }

    public function edit_frontpage() {
        if (!check_admin_referer( 'edit' )) {
            wp_die('You do not have sufficient permissions to access this page man.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        if (isset($_POST['frontpageengine_frontpage'])) {
            if (wp_verify_nonce( $_POST['frontpageengine_frontpage'], 'edit' )) {
                $id = $this->save_frontpage(false);
                $this->display_edit($id, 'Front Page Saved');
            } else {
                wp_die('You do not have sufficient permissions to access this page bro.');
            }
        } else {
            $frontpage_id = intval($_GET['frontpage_id']);
            global $wpdb;
            $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
            $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", intval($_GET['frontpage_id'])));
            require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/edit_frontpage.php';
        }
    }
}