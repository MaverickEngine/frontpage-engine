<div class="wrap">
    <form method="post" action="options.php">
        <?php settings_fields( 'frontpageengine-settings-group' ); ?>
        <?php do_settings_sections( 'frontpageengine-settings-group' ); ?>
        <h1>
            <?php esc_html_e($frontpage->name); ?> 
            <?php _e( "Slots", 'frontpageengine' ); ?>
            <a href="<?php echo esc_url(admin_url( 'admin.php?page=frontpageengine_settings&action=new_slot' )); ?>" class="page-title-action"><?php _e( 'Add New', 'frontpageengine' ); ?></a>
        </h1>
        <?php settings_errors(); ?>
        <hr>
        <?php
            $slots_table = new FrontPageEngineSlotsTable();
            $slots_table->prepare_items();
            $slots_table->display();
        ?>
        <?php submit_button(); ?>
    </form>
</div>