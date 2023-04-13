<div class="wrap">
    <h2><?php _e( 'Frontpage Engine', 'frontpage-engine' ); ?></h2>
    <div class="error">
        <p><?php _e( 'No frontpages found. Please create a new frontpage.', 'frontpage-engine' ); ?></p>
    </div>
    <div class="card">
        Welcome to Frontpage Engine, the plugin that allows you to create and manage your frontpages. To start off, please create your first front page layout. You can do this by clicking the button below.
    </div>
    <p>
        <a href="<?php echo admin_url('/options-general.php?page=frontpage-engine-menu-settings&tab=pages&action=new'); ?>" class="button button-primary">Create Front Page</a>
    </p>
</div>