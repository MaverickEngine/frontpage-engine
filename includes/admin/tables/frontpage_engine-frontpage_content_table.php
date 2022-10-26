<?php
if ( ! class_exists( 'WP_List_Table' ) ) {
	require_once ABSPATH . 'wp-admin/includes/class-wp-list-table.php';
}
class FrontPageEngineFrontpageContentTable extends WP_List_Table {
    function __construct() {
        parent::__construct(array(
            'singular' => 'Featured Post',
            'plural' => 'Featured Posts',
            'ajax' => true
        ));
    }

    function column_default($item, $column_name) {
        switch($column_name) {
            case 'cb':
                return sprintf('<input type="checkbox" name="slot_id[]" value="%s" />', $item["id"]);
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

    function column_cb( $item ) {
		return sprintf(
			'<input type="checkbox" name="%1$s[]" value="%2$s" />',
			$this->_args['singular'],
			$item['id']
		);
	}

    function get_columns() {
        $columns = array(
            'id' => 'ID',
            'cb' => '<input type="checkbox" />',
            'image' => 'Image',
            'post_title' => 'Title',
            'post_author' => 'Author',
        );
        return $columns;
    }

    function get_bulk_actions() {
        $actions = array(
            'unfeature' => 'Unfeature'
        );
        return $actions;
    }

    function process_bulk_action() {
        if ('feature' === $this->current_action()) {
            // Todo
        }
    }

    function prepare_items() {
        $this->process_bulk_action();
        $columns = $this->get_columns();
        $hidden = array("id");
        $sortable = array();
        $this->_column_headers = array($columns, $hidden, $sortable);
        $this->items = $this->get_posts();
    }

    function get_posts() {
        global $wpdb;
        $screen = get_current_screen();
        $id = str_replace("frontpage-engine_page_frontpage-engine-menu-", "", $screen->id);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
        $slot_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}frontpage_engine_slots WHERE frontpage_id = %d", $frontpage->id));
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
        $posts = get_posts( $params );
        return array_map([$this, "map_post"], $posts);
    }

    private function map_post($post) {
        $link      = get_edit_post_link( $post->ID );
        $post_type = get_post_type_object( $post->post_type );
        $thumb     = get_the_post_thumbnail( $post->ID, array( 50, 50 ) );
        $status    = ( $post->post_status == 'publish' ) ? 'Published' : '';

        $data                   = array();
        $data['id']             = $post->ID;
        $data['image'] = ( $thumb ) ? $thumb : '';
        $data['post_title']     = "<a href='{$link}' target='_blank'>{$post->post_title}</a>";
        $data['post_title']    .= '<br/><a href="/wp-admin/admin.php?page=frontpage-engine-menu-5&frontpageengine_select_article=true&position=1&" class="thickbox">Insert below</a> | <a href="/wp-admin/admin.php?page=frontpage-engine-menu-5&frontpageengine_select_article=true&position=2&" class="thickbox">Replace</a>';
        $data['post_author']    = get_the_author_meta( 'display_name', $post->post_author );
        $data['post_date']      = $status . '<br/>' . get_the_time( 'Y/m/d', $post->ID );
        $data['menu_order']     = $post->menu_order;
        $data['post_type']      = $post_type->labels->singular_name;

        return $data;
		
    }

    // Inspired by https://github.com/debba/wp-list-table-ajax-sample
    function ajax_response() {
		check_ajax_referer( 'ajax-custom-list-nonce', '_ajax_custom_list_nonce' );
		$this->prepare_items();
		extract( $this->_args );
		extract( $this->_pagination_args, EXTR_SKIP );
		ob_start();
		if ( ! empty( $_REQUEST['no_placeholder'] ) )
			$this->display_rows();
		else
			$this->display_rows_or_placeholder();
		$rows = ob_get_clean();

		ob_start();
		$this->print_column_headers();
		$headers = ob_get_clean();

		ob_start();
		$this->pagination('top');
		$pagination_top = ob_get_clean();

		ob_start();
		$this->pagination('bottom');
		$pagination_bottom = ob_get_clean();

		$response = array( 'rows' => $rows );
		$response['pagination']['top'] = $pagination_top;
		$response['pagination']['bottom'] = $pagination_bottom;
		$response['column_headers'] = $headers;

		if ( isset( $total_items ) )
			$response['total_items_i18n'] = sprintf( _n( '1 item', '%s items', $total_items ), number_format_i18n( $total_items ) );

		if ( isset( $total_pages ) ) {
			$response['total_pages'] = $total_pages;
			$response['total_pages_i18n'] = number_format_i18n( $total_pages );
		}

		die( json_encode( $response ) );
	}

}