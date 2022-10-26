<div class="wrap">
    <h1>
        <?php esc_html_e($frontpage->name); ?> 
        <?php _e( "Front Page", 'frontpageengine' ); ?>
    </h1>
    <hr>
    <div id="frontpage-engine-app"></div>
    <?php add_thickbox(); ?>
    <a href="/wp-admin/admin.php?page=frontpage-engine-menu-5&frontpageengine_select_article=true&position=1&" class="thickbox">Add Posts</a>
    <?php
        $featured_table = new FrontPageEngineFrontpageContentTable();
        $featured_table->prepare_items();
        $featured_table->display();
    ?>
</div>