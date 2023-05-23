<form method="post" action="options.php">
    <?php settings_fields( 'frontpageengine-settings-group' ); ?>
    <?php do_settings_sections( 'frontpageengine-settings-group' ); ?>
    <h2><?php _e( 'General Settings', 'frontpageengine' ); ?></h2>
    <hr>
    <table class="form-table">
        <!-- frontpageengine_wssb_ws_address -->
        <tr valign="top">
            <th scope="row"><?php _e( 'WS-Subscribe-Broadcast websocket address', 'frontpageengine' ); ?></th>
            <td>
                <input type="text" name="frontpageengine_wssb_ws_address" value="<?php esc_attr_e(get_option('frontpageengine_wssb_ws_address')); ?>" placeholder="wss://wssb.revengine.dailymaverick.co.za" />
                <p class="description"><?php _e( 'The websocket address of the WSSB server, which will allow for multiple users to collaborate on the same front page at once. Use wss://wssb.revengine.dailymaverick.co.za/_ws if you don\'t have one of your own.', 'frontpageengine' ); ?></p>
            </td>
        </tr>
        <!-- frontpageengine_wssb_web_address -->
        <tr valign="top">
            <th scope="row"><?php _e( 'WS-Subscribe-Broadcast web address', 'frontpageengine' ); ?></th>
            <td>
                <input type="text" name="frontpageengine_wssb_web_address" value="<?php esc_attr_e(get_option('frontpageengine_wssb_web_address')); ?>" placeholder="https://wssb.revengine.dailymaverick.co.za" />
                <p class="description"><?php _e( 'The web address of the WSSB server, which will alert active users of changes on the server. Use https://wssb.revengine.dailymaverick.co.za if you don\'t have one of your own.', 'frontpageengine' ); ?></p>
            </td>
        </tr>
        <tr valign="top">
            <th scope="row"><?php _e( 'Development Mode', 'frontpageengine' ); ?></th>
            <td>
                <input type="checkbox" name="frontpageengine_development_mode" value="1" <?php checked( get_option('frontpageengine_development_mode'), 1 ); ?> />
                <p class="description"><?php _e( 'Enable development mode to use mock analytics and show debugging info.', 'frontpageengine' ); ?></p>
            </td>
        </tr>
        <tr valign="top">
        <th scope="row"><?php _e( 'Roles with front page access', 'frontpageengine' ); ?></th>
            <td>
                <?php
                $roles = get_editable_roles();
                foreach($roles as $the_role => $details) {
                    $checked = "";
                    $approved_roles = get_option('frontpageengine_roles', []);
                    if (!is_array($approved_roles)) {
                        $approved_roles = [];
                    }
                    if (in_array($the_role, $approved_roles)) {
                        $checked = "checked";
                    }
                    ?>
                    <input type="checkbox" name="frontpageengine_roles[]" value="<?php esc_attr_e($the_role); ?>" <?php esc_attr_e($checked); ?> /> <?php esc_html_e($details['name']); ?><br>
                    <?php
                }
                ?>
                <p class="description"><?php _e( 'Select the roles that should have access to the front page.', 'frontpageengine' ); ?></p>
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