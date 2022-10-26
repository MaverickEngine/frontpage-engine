<div class="wrap">
    <form method="post" action="options.php">
        <?php settings_fields( 'frontpageengine-settings-group' ); ?>
        <?php do_settings_sections( 'frontpageengine-settings-group' ); ?>
        <h1>
            <?php _e( 'Front Pages', 'frontpageengine' ); ?>
            <a href="<?php echo esc_url(admin_url( 'admin.php?page=frontpageengine_manage&action=new' )); ?>" class="page-title-action"><?php _e( 'Add New', 'frontpageengine' ); ?></a>
        </h1>
        <?php settings_errors(); ?>
        <hr>

        <?php
            $frontpages_table = new FrontPageEngineFrontpagesTable();
            $frontpages_table->prepare_items();
            $frontpages_table->display();
        ?>
        <?php submit_button(); ?>
    </form>
</div>