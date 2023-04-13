<?php
$default_tab = null;
$frontpage_engine_tab = isset($_GET['tab']) ? $_GET['tab'] : $default_tab;
?>
<div class="wrap">
    <h1><?php _e( 'FrontPage Engine Settings', 'frontpageengine' ); ?></h1>
    <nav class="nav-tab-wrapper">
        <a href="?page=frontpage-engine-menu-settings" class="nav-tab <?php if($frontpage_engine_tab===null):?>nav-tab-active<?php endif; ?>">Settings</a>
        <a href="?page=frontpage-engine-menu-settings&tab=pages" class="nav-tab <?php if($frontpage_engine_tab==='pages'):?>nav-tab-active<?php endif; ?>">Front Pages</a>
    </nav>
    <div class="tab-content">
    <?php switch($frontpage_engine_tab) :
      case 'settings':
        include( plugin_dir_path( __FILE__ ) . 'settings-general.php' );
        break;
    case 'pages':
        include( plugin_dir_path( __FILE__ ) . 'settings-pages.php' );
        break;
    default:
        include( plugin_dir_path( __FILE__ ) . 'settings-general.php' );
        break;
    endswitch; ?>
</div>