<div class="wrap">
    <form method="post">
        <?php wp_nonce_field( 'edit', 'frontpageengine_frontpage' ); ?>
        <h1>
            <?php _e( 'Edit Front Page', 'frontpageengine' ); ?>
        </h1>
        <hr>
        <table class="form-table">
            <tbody>
                <tr>
                    <th scope="row">
                        <label for="frontpageengine_frontpage_name"><?php _e( 'Name', 'frontpageengine' ); ?></label>
                    </th>
                    <td>
                        <input type="text" name="frontpageengine_frontpage_name" id="frontpageengine_frontpage_name" value="<?php print esc_attr($frontpage->name) ?>" />
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="frontpageengine_frontpage_ordering_code"><?php _e( 'Ordering Code', 'frontpageengine' ); ?></label>
                    </th>
                    <td>
                        <input type="text" name="frontpageengine_frontpage_ordering_code" id="frontpageengine_frontpage_ordering_code" value="<?php print esc_attr($frontpage->ordering_code) ?>" />
                        <p class="description"><?php _e( 'eg. "dm-frontpage-main-ordering"', 'frontpageengine' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="frontpageengine_frontpage_featured_code"><?php _e( 'Featured Code', 'frontpageengine' ); ?></label>
                    </th>
                    <td>
                        <input type="text" name="frontpageengine_frontpage_featured_code" id="frontpageengine_frontpage_featured_code" value="<?php print esc_attr($frontpage->featured_code) ?>" />
                        <p class="description"><?php _e( 'eg. "featured", "featured-sports"', 'frontpageengine' ); ?></p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="frontpageengine_frontpage_number_of_slots"><?php _e( 'Number of slots', 'frontpageengine' ); ?></label>
                    </th>
                    <td>
                        <input type="number" name="frontpageengine_frontpage_number_of_slots" id="frontpageengine_frontpage_number_of_slots" value="<?php print esc_attr($frontpage->number_of_slots) ?>" min="1" step="1" />
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="frontpageengine_frontpage_post_types"><?php _e( 'Post types', 'frontpageengine' ); ?></label>
                    </th>
                    <td>
                        <?php
                            $post_types = get_post_types(['public' => true], 'objects');
                            $selected_post_types = explode(",", $frontpage->post_types);
                            foreach($post_types as $pt) {
                                $selected = in_array($pt->name, $selected_post_types) ? 'checked' : '';
                                echo '<input type="checkbox" name="frontpageengine_frontpage_post_types[]" value="' . esc_attr($pt->name) . '" ' . esc_attr($selected) . ' /> ' . esc_html($pt->label) . '<br />';
                            }
                        ?>
                    </td>
                </tr>
            </tbody>
        </table>
        <?php submit_button(); ?>
    </form>
</div>