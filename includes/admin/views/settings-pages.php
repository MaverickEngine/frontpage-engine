<h2>
    <?php _e( 'Front Pages', 'frontpageengine' ); ?>
    <a href="?page=<?php print esc_attr($_GET["page"]) ?>&tab=pages&action=new" class="page-title-action"><?php _e( 'Add New', 'frontpageengine' ); ?></a>
</h2>
<hr>
<?php
    $frontpages_table = new FrontPageEngineFrontpagesTable();
    $frontpages_table->prepare_items();
    $frontpages_table->display();