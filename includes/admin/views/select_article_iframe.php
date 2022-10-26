<?php
	_wp_admin_html_begin();
?>
	<title><?php _e( 'Select Article for Frontpage Engine' ); ?> &#8212; <?php _e( 'frontpage_engine' ); ?></title>
<?php
	wp_enqueue_style( 'colors' );
?>
<script type="text/javascript">
	addLoadEvent = function(func){if(typeof jQuery!=='undefined')jQuery(function(){func();});else if(typeof wpOnload!=='function'){wpOnload=func;}else{var oldonload=wpOnload;wpOnload=function(){oldonload();func();}}};
	var ajaxurl = '<?php echo esc_js( admin_url( 'admin-ajax.php', 'relative' ) ); ?>', pagenow = 'media-upload-popup', adminpage = 'media-upload-popup',
	isRtl = <?php echo (int) is_rtl(); ?>;
</script>
<?php
	/** This action is documented in wp-admin/admin-header.php */
	do_action( 'admin_enqueue_scripts', 'media-upload-popup' );

	/**
	 * Fires when admin styles enqueued for the legacy (pre-3.5.0) media upload popup are printed.
	 *
	 * @since 2.9.0
	 */
	do_action( 'admin_print_styles-media-upload-popup' );  // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

	/** This action is documented in wp-admin/admin-header.php */
	do_action( 'admin_print_styles' );

	/**
	 * Fires when admin scripts enqueued for the legacy (pre-3.5.0) media upload popup are printed.
	 *
	 * @since 2.9.0
	 */
	do_action( 'admin_print_scripts-media-upload-popup' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

	/** This action is documented in wp-admin/admin-header.php */
	do_action( 'admin_print_scripts' );

	/**
	 * Fires when scripts enqueued for the admin header for the legacy (pre-3.5.0)
	 * media upload popup are printed.
	 *
	 * @since 2.9.0
	 */
	do_action( 'admin_head-frontpageengine-iframe' ); // phpcs:ignore WordPress.NamingConventions.ValidHookName.UseUnderscores

	/** This action is documented in wp-admin/admin-header.php */
	do_action( 'admin_head' );

	if ( is_string( $content_func ) ) {
		/**
		 * Fires in the admin header for each specific form tab in the legacy
		 * (pre-3.5.0) media upload popup.
		 *
		 * The dynamic portion of the hook name, `$content_func`, refers to the form
		 * callback for the media upload type.
		 *
		 * @since 2.5.0
		 */
		do_action( "admin_head_{$content_func}" );
	}

	$body_id_attr = '';

	if ( isset( $GLOBALS['body_id'] ) ) {
		$body_id_attr = ' id="' . $GLOBALS['body_id'] . '"';
	}

	?>
</head>
<body<?php echo $body_id_attr; ?> class="wp-core-ui no-js">
    <div id="frontpageengineFeaturePosts">
        <h2><?php _e( "Feature Posts", 'frontpageengine' ); ?></h2>
        <?php
            $unfeatured_table = new FrontPageEngineUnfeaturedContentTable();
            $unfeatured_table->prepare_items();
            $unfeatured_table->display();
        ?>
    </div>
	<script type="text/javascript">
	document.body.className = document.body.className.replace('no-js', 'js');
	</script>
<?php

	call_user_func_array( $content_func, $args );

	/** This action is documented in wp-admin/admin-footer.php */
	do_action( 'admin_print_footer_scripts' );
?>
	<script type="text/javascript">if(typeof wpOnload==='function')wpOnload();</script>
	</body>
</html>