<?php
if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}
class FrontPageEngineFrontpagesTable extends WP_List_Table {
    
    function __construct() {
        parent::__construct(array(
            'singular' => 'Front Page',
            'plural' => 'Front Pages',
            'ajax' => false
        ));
    }

    function column_default($item, $column_name) {
        switch($column_name) {
            case 'id':
            case 'name':
            case 'code':
            default:
                return $item[$column_name];
        }
    }

    function column_name($item) {
        // print_r($item);
        $page = isset($_REQUEST['page']) ? esc_attr($_REQUEST['page']) : 'frontpage_engine';
        $actions = array(
            'manage' => sprintf('<a href="?page=%s&action=%s&frontpage_id=%s&_wpnonce=%s">Manage</a>', $page, 'manage', $item['id'], wp_create_nonce('manage')),
            'slots' => sprintf('<a href="?page=%s&action=%s&frontpage_id=%s&_wpnonce=%s">Slots</a>', $page, 'slots', $item['id'], wp_create_nonce('slots')),
            'edit' => sprintf('<a href="?page=%s&action=%s&frontpage_id=%s&_wpnonce=%s">Edit</a>', $page, 'edit', $item['id'], wp_create_nonce('edit')),
            'delete' => sprintf('<a href="?page=%s&action=%s&frontpage_id=%s&_wpnonce=%s">Delete</a>', $page, 'delete', $item['id'], wp_create_nonce('delete')),
        );
        return sprintf('%1$s %2$s', $item['name'], $this->row_actions($actions));
    }

    function get_columns() {
        $columns = array(
            'id' => 'ID',
            'name' => 'Name',
            'ordering_code' => 'Ordering Code',
            'featured_code' => 'Featured Code',
        );
        return $columns;
    }

    function get_bulk_actions() {
        $actions = array(
            'delete' => 'Delete'
        );
        return $actions;
    }

    function process_bulk_action() {
        if ('delete' === $this->current_action()) {
            $frontpages_json = get_option("frontpageengine_frontpages", '[{"name":"Main","code":"main","slots":10}]' );
            $frontpages = json_decode($frontpages_json);
            $new_frontpages = array();
            foreach($frontpages as $frontpage) {
                if ($frontpage->code != $_GET['frontpage']) {
                    $new_frontpages[] = $frontpage;
                }
            }
            update_option("frontpageengine_frontpages", json_encode($new_frontpages));
        }
    }

    function prepare_items() {
        global $wpdb;
        $this->process_bulk_action();
        $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY `display_order` DESC");
        // print_r($frontpages);
        $columns = $this->get_columns();
        $hidden = array("id");
        $this->_column_headers = array($columns, $hidden);
        $this->items = array();
        foreach($frontpages as $frontpage) {
            $this->items[] = array(
                'id' => $frontpage->id,
                'name' => $frontpage->name,
                'ordering_code' => $frontpage->ordering_code,
                'featured_code' => $frontpage->featured_code,
                'post_types' => $frontpage->post_types,
            );
        }
    }
}