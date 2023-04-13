<form method="post" action="options.php">
    <?php settings_fields( 'frontpageengine-settings-group' ); ?>
    <?php do_settings_sections( 'frontpageengine-settings-group' ); ?>
    <h2><?php _e( 'General Settings', 'frontpageengine' ); ?></h2>
    <hr>
    <table class="form-table">
        <tr valign="top">
            <th scope="row"><?php _e( 'Development Mode', 'frontpageengine' ); ?></th>
            <td>
                <input type="checkbox" name="frontpageengine_development_mode" value="1" <?php checked( get_option('frontpageengine_development_mode'), 1 ); ?> />
                <p class="description"><?php _e( 'Enable development mode to use mock analytics and show more debugging info.', 'frontpageengine' ); ?></p>
            </td>
        </tr>
        <tr>
            <th scope="row"></th>
            <td>
            <?php submit_button(); ?>
            </td>
        </tr>
    </table>
</form>