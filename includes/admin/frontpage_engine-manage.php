<?php

class FrontpageEngineAdminSettings {
    public function __construct() {
        add_action('admin_menu', [ $this, 'manage_page' ]);
    }

    public function manage_page() {
        add_submenu_page(
            'frontpage-engine-menu',
			'FrontpageEngine Manage',
			'Manage Front Pages',
			'manage_options',
			'frontpageengine_manage',
			[ $this, 'frontpageengine_manage' ]
		);
    }

    public function frontpageengine_manage() {
        if (!current_user_can('manage_options')) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['action'] )) {
            require_once plugin_dir_path( dirname( __FILE__ ) ).'admin/views/settings.php';
            return;
        }
        switch ($_GET['action']) {
            case 'edit':
                $this->edit_frontpage();
                break;
            case 'delete':
                $this->delete_frontpage();
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
    }

    public function new_frontpage() {
        if (isset($_POST['frontpageengine_frontpage'])) {
            if (wp_verify_nonce( $_POST['frontpageengine_frontpage'], 'new' )) {
                $this->save_frontpage(true);
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
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $data = [
            'name' => sanitize_text_field($_POST['frontpageengine_frontpage_name']),
            'ordering_code' => sanitize_text_field($_POST['frontpageengine_frontpage_ordering_code']),
            'featured_code' => sanitize_text_field($_POST['frontpageengine_frontpage_featured_code']),
            'post_types' => sanitize_text_field(join(",", $_POST['frontpageengine_frontpage_post_types'])),
        ];
        if ($new) {
            $wpdb->insert($table_name, $data);
            $id = $wpdb->insert_id;
        } else {
            if (!isset($_GET['frontpage_id'])) {
                wp_die('ID required');
            }
            $id = intval($_GET['frontpage_id']);
            $wpdb->update($table_name, $data, ['id' => $id]);
        }
        if (isset($_POST['frontpageengine_frontpage_slots'])) {
            $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
            $post_types = isset($_POST['frontpageengine_frontpage_post_types']) ? $_POST['frontpageengine_frontpage_post_types'] : [];
            $slots = intval($_POST['frontpageengine_frontpage_slots']);
            if (isset($_POST['id'])) {
                $wpdb->delete($table_name, ['frontpage_id' => intval($_POST['id'])]);
            }
            $nf = new NumberFormatter("EN_US", NumberFormatter::ORDINAL);
            for ($i = 0; $i < $slots; $i++) {
                $wpdb->insert($table_name, [
                    'frontpage_id' => $id,
                    'automate' => isset($_POST['frontpageengine_frontpage_automate']) ? 1 : 0,
                    'types' => implode(',', $post_types),
                    'display_order' => $i,
                    'name' => "{$nf->format($i + 1)} Position",
                ]);
            }
        }
        wp_redirect(admin_url( 'admin.php?page=frontpageengine_manage' ));
        exit;
    }

    // TODO: A confirmation page
    public function delete_frontpage() {
        global $wpdb;
        if (!check_admin_referer( 'delete' )) {
            wp_die('You do not have sufficient permissions to access this page.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $wpdb->delete($table_name, ['id' => intval($_GET['frontpage_id'])]);
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
        $wpdb->delete($table_name, ['frontpage_id' => intval($_GET['frontpage_id'])]);
        wp_redirect(admin_url( 'admin.php?page=frontpageengine_manage' ));
        exit;
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

    public function edit_frontpage() {
        if (!check_admin_referer( 'edit' )) {
            wp_die('You do not have sufficient permissions to access this page man.');
        }
        if (!isset($_GET['frontpage_id'])) {
            wp_die('ID required');
        }
        if (isset($_POST['frontpageengine_frontpage'])) {
            if (wp_verify_nonce( $_POST['frontpageengine_frontpage'], 'edit' )) {
                $this->save_frontpage(false);
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