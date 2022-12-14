<?php

class FrontPageEngineDB {
    public function setup() {
        $frontpage_engine_db_version = get_option("frontpage_engine_db_version", 0 );
        if ((string) $frontpage_engine_db_version == (string) FRONTPAGEENGINE_VERSION) {
            return;
        }
        global $wpdb;
        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );
        $charset_collate = $wpdb->get_charset_collate();
        $table_name = $wpdb->prefix . 'frontpage_engine_frontpages';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name tinytext NOT NULL,
            ordering_code varchar(100) NOT NULL,
            featured_code varchar(100) NOT NULL,
            post_types varchar(255) NOT NULL,
            display_order tinyint(3) NOT NULL,
            PRIMARY KEY  (id),
            UNIQUE KEY ordering_code (code),
            UNIQUE KEY featured_code (code),
            UNIQUE KEY name (name),
            INDEX display_order (display_order)
        ) $charset_collate;";
        dbDelta( $sql );

        $table_name = $wpdb->prefix . 'frontpage_engine_frontpage_slots';
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            frontpage_id mediumint(9) NOT NULL,
            name varchar(100) NOT NULL,
            automate tinyint(3) NOT NULL,
            post_types varchar(255) NOT NULL DEFAULT '',
            display_order tinyint(3) NOT NULL,
            post_id mediumint(9) NOT NULL,
            lock_until datetime,
            PRIMARY KEY  (id),
            INDEX frontpage_id (frontpage_id),
            INDEX automate (automate),
            INDEX display_order (display_order),
            INDEX post_id (post_id),
            INDEX lock_until (lock_until)
        ) $charset_collate;";
        dbDelta( $sql );
        update_option( "frontpage_engine_db_version", FRONTPAGEENGINE_VERSION );
    }
}