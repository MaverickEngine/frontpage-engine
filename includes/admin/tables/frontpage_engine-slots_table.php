<?php
if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}
class FrontPageEngineSlotsTable extends WP_List_Table {
    function __construct() {
        parent::__construct(array(
            'singular' => 'Slot',
            'plural' => 'Slots',
            'ajax' => false
        ));
    }

    function column_default($item, $column_name) {
        switch($column_name) {
            case 'cb':
                return sprintf('<input type="checkbox" name="slot_id[]" value="%s" />', $item['id']);
            case 'display_order':
                return $item['display_order'] + 1;
            case 'types':
                return ucwords(join(", ", explode(",", $item['types'])));
            case 'automate':
                return $item['automate'] ? "Yes" : "No";
            case 'id':
            case 'name':
            case 'code':
            case 'content':
            default:
                return $item[$column_name];
        }
    }

    function column_name($item) {
        $page = isset($_REQUEST['page']) ? esc_attr($_REQUEST['page']) : 'frontpageengine_settings';
        $actions = array(
            'edit' => sprintf('<a href="?page=%s&action=%s&slot_id=%s&_wpnonce=%s">Edit</a>', $page, 'edit_slot', $item['id'], wp_create_nonce('edit_slot')),
            'delete' => sprintf('<a href="?page=%s&action=%s&slot_id=%s&_wpnonce=%s">Delete</a>', $page, 'delete_slot', $item['id'], wp_create_nonce('delete_slot')),
        );
        return sprintf('%1$s %2$s', $item['name'], $this->row_actions($actions));
    }

    function get_columns() {
        $columns = array(
            'cb' => '<input type="checkbox" />',
            'id' => 'ID',
            'display_order' => 'Position',
            'name' => 'Name',
            'automate' => 'Automated?',
            'types' => 'Type',
            'content' => 'Content'
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
            $slots_json = get_option("frontpageengine_slots", '[]' );
            $slots = json_decode($slots_json);
            $new_slots = array();
            foreach($slots as $slot) {
                if ($slot->id != $_GET['slot_id']) {
                    $new_slots[] = $slot;
                }
            }
            update_option("frontpageengine_slots", json_encode($new_slots));
        }
    }

    function prepare_items() {
        global $wpdb;
        $this->process_bulk_action();
        $columns = $this->get_columns();
        $hidden = array("id");
        $sortable = array();
        $this->_column_headers = array($columns, $hidden, $sortable);
        $per_page = 100;
        $current_page = $this->get_pagenum();
        $total_items = $wpdb->get_var("SELECT COUNT(id) FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = " . $this->id);
        $this->set_pagination_args(array(
            'total_items' => $total_items,
            'per_page' => $per_page
        ));
        $this->items = $this->get_slots($per_page, $current_page);
    }

    function get_slots($per_page = 100, $page_number = 1) {
        global $wpdb;
        $id = intval($_GET["frontpage_id"]);
        $sql = $wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d LIMIT %d OFFSET %d", array($id, $per_page, ($page_number - 1) * $per_page));
        $result = $wpdb->get_results($sql, 'ARRAY_A');
        return $result;
    }

}