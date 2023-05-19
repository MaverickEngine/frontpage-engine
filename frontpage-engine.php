<?php
/**
 * Plugin Name: FrontpageEngine
 * Plugin URI: https://github.com/maverickengine/frontpage-engine
 * Description: A Maverick Engine plugin that brings order to your Wordpress front page.
 * Author: Daily Maverick, Jason Norwood-Young, Realm Digital
 * Author URI: https://dailymaverick.co.za
 * Version: 0.0.40
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * WC requires at least: 5.8.0
 * Tested up to: 6.1.1
 *
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const FRONTPAGEENGINE_VERSION = '0.0.40';
$frontpageengine_menu_slug = "frontpage-engine-menu";

require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-frontpages_table.php');
require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-frontpage_content_table.php');
require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-unfeatured_content_table.php');

function frontpage_engine_admin_init() {
    if (!current_user_can('edit_others_posts')) {
        return;
    }
    require_once(plugin_dir_path( __FILE__ ) . 'includes/admin/frontpage_engine-admin.php' );
    new FrontpageEngineAdmin([]);
}
add_action( 'init', 'frontpage_engine_admin_init' );

// Settings
function frontpage_engine_settings_init() {
    if (!current_user_can('manage_options')) {
        return;
    }
    require_once(plugin_dir_path( __FILE__ ) . 'includes/admin/frontpage_engine-settings.php' );
    new FrontpageEngineAdminSettings();
}
add_action( 'init', 'frontpage_engine_settings_init' );

// API
function frontpage_engine_api_init() {
    require_once(plugin_dir_path( __FILE__ ) . 'includes/admin/frontpage_engine-api.php' );
    new FrontpageEngineAPI([]);
}
add_action( 'init', 'frontpage_engine_api_init' );

// Setup database tables
function frontpage_engine_database_setup() {
    require_once( plugin_dir_path( __FILE__ ) . 'includes/db/frontpage_engine-db.php' );
    $frontpage_engine_db = new FrontPageEngineDB();
    $frontpage_engine_db->setup();
}
add_action( 'init', 'frontpage_engine_database_setup', 2 );

function frontpage_engine_serve_init() {
    require_once(plugin_dir_path( __FILE__ ) . 'includes/frontpage_engine-serve.php' );
    // Serve frontpage if url matches /frontpage-engine/serve/{frontpage_name}
    if (empty($_SERVER['REQUEST_URI'])) return;
    if (preg_match('/\/frontpage-engine\/serve\/(.*)/', $_SERVER['REQUEST_URI'], $matches)) {
        $frontpage_name = $matches[1];
        $frontpage_engine_serve = new FrontpageEngineServe();
        $frontpage_engine_serve->serve($frontpage_name, 'json');
        exit;
    }
}
add_action( 'init', 'frontpage_engine_serve_init' );