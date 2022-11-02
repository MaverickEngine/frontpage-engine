<?php
/**
 * Plugin Name: FrontpageEngine
 * Plugin URI: https://github.com/maverickengine/frontpage-engine
 * Description: A Maverick Engine plugin that brings order to your Wordpress front page.
 * Author: Daily Maverick, Jason Norwood-Young, Realm Digital
 * Author URI: https://dailymaverick.co.za
 * Version: 0.0.2
 * License: GPLv3
 * License URI: https://www.gnu.org/licenses/gpl-3.0.html
 * WC requires at least: 5.8.0
 * Tested up to: 5.8.2
 *
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

const FRONTPAGEENGINE_VERSION = '0.0.2';

require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-frontpages_table.php');
require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-slots_table.php');
require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-frontpage_content_table.php');
require_once(plugin_dir_path( __FILE__ ).'includes/admin/tables/frontpage_engine-unfeatured_content_table.php');

function frontpage_engine_admin_init() {
    if (!is_admin()) {
        return;
    }
    require_once(plugin_dir_path( __FILE__ ) . 'includes/admin/frontpage_engine-admin.php' );
    new FrontpageEngineAdmin([]);
}
add_action( 'init', 'frontpage_engine_admin_init' );

// Settings
function frontpage_engine_manage_init() {
    if (!is_admin()) {
        return;
    }
    require_once(plugin_dir_path( __FILE__ ) . 'includes/admin/frontpage_engine-manage.php' );
    new FrontpageEngineAdminSettings([]);
}
add_action( 'init', 'frontpage_engine_manage_init' );

// API
function frontpage_engine_api_init() {
    if (!is_admin()) {
        return;
    }
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