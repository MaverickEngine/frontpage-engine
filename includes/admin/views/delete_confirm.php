<div class="wrap">
    <form method="post">
        <?php wp_nonce_field( 'edit', 'frontpageengine_frontpage' ); ?>
        <input type="hidden" name="frontpageengine_frontpage_id" value="<?php print esc_attr($frontpage_id) ?>" />
        <h1>
            <?php _e( 'Confirm Front Page Deletion', 'frontpageengine' ); ?>
        </h1>
        <?php
            if (isset($error)) {
                print '<div class="error"><p>' . esc_html($error) . '</p></div>';
            }
        ?>
        <hr>
        <p>
            <?php _e( 'Are you sure you want to delete this front page?', 'frontpageengine' ); ?>
        </p>
        <p>
            <strong><?php _e( 'This action cannot be undone.', 'frontpageengine' ); ?></strong>
        </p>
        <p>Type in the name of the front page to confirm deletion:</p>
        <p>
            <input type="text" name="frontpageengine_frontpage_name" id="frontpageengine_frontpage_name" value="" placeholder="<?php print esc_attr($frontpage->name); ?>" />
        </p>
        <p>
            <input type="submit" name="frontpageengine_delete_confirm" value="<?php _e( 'Delete', 'frontpageengine' ); ?>" class="button button-primary" />
            <a href="<?php print esc_attr(admin_url('admin.php?page=frontpageengine_manage')) ?>" class="button"><?php _e( 'Cancel', 'frontpageengine' ); ?></a>
        </p>
    </form>
</div>