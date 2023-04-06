<div class="wrap">
    <form method="post">
        <h1>
            <?php _e( 'Front Page Deleted', 'frontpageengine' ); ?>
        </h1>
        <hr>
        <p>
            The front page <?php print esc_html($frontpage->name); ?> has been deleted.
        </p>
        <p>
            <a href="<?php print esc_attr(admin_url('admin.php?page=frontpageengine_manage')) ?>" class="button">
                <?php _e( 'Back to Front Pages', 'frontpageengine' ); ?>
            </a>
        </p>
    </form>
</div>