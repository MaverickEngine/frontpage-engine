<?php
if ( ! class_exists( 'FrontPageEngineFrontpageContentTable' ) ) {
	require_once "frontpage_engine-frontpage_content_table.php";
}
class FrontPageEngineUnfeaturedContentTable extends FrontPageEngineFrontpageContentTable {
    function __construct() {
        parent::__construct(array(
            'singular' => 'Unfeatured Post',
            'plural' => 'Unfeatured Posts',
            'ajax' => false
        ));
    }

    function get_bulk_actions() {
        $actions = array(
            'feature' => 'Feature'
        );
        return $actions;
    }

    function process_bulk_action() {
        if ('feature' === $this->current_action()) {
            // Todo
        }
    }

    function get_posts() {
        global $wpdb;
        if (empty($_GET["page"])) {
            wp_exit("Missing page parameter");
        }
        $id = str_replace("frontpage-engine-menu-", "", $_GET["page"]);
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $id));
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
            'numberposts' => 10,

		);
        $params['numberposts'] = 10;
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
        return array_map([$this, "map_post"], $posts);
    }

    private function map_post($post) {
        $link      = get_edit_post_link( $post->ID );
        $post_type = get_post_type_object( $post->post_type );
        $thumb     = get_the_post_thumbnail( $post->ID, array( 50, 50 ) );
        $status    = ( $post->post_status == 'publish' ) ? 'Published' : '';

        $data                   = array();
        $data['id']             = $post->ID;
        $data['featured_image'] = ( $thumb ) ? $thumb : '';
        $data['post_title']     = "<a href='{$link}' target='_blank'>{$post->post_title}</a> ({$post_type->labels->singular_name})";
        $data['post_title']    .= "<br /><a href='#' class='btn-insert' data-id='{$post->ID}'>Insert into slot</a>";
        $data['post_author']    = get_the_author_meta( 'display_name', $post->post_author );
        $data['post_date']      = $status . '<br/>' . get_the_time( 'Y/m/d', $post->ID );
        $data['menu_order']     = $post->menu_order;
        $data['post_type']      = $post_type->labels->singular_name;

        return $data;
		
    }
}