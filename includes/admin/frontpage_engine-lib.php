<?php

class FrontPageEngineLib {
    public function get_front_pages() {
        global $wpdb;
        $frontpages = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages ORDER BY display_order ASC");
        return $frontpages;
    }

    public function get_post_slots($post_id) {
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE post_id = %d", $post_id));
        return $slots;
    }

    public function get_frontpage(int $frontpage_id) {
        global $wpdb;
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE id = %d", $frontpage_id));
        return $frontpage;
    }

    public function get_frontpage_by_slug(string $frontpage_slug) {
        global $wpdb;
        $frontpage = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpages WHERE slug = %s", $frontpage_slug));
        return $frontpage;
    }

    protected function _map_wp_post($post) {
        $post_type = get_post_type_object( $post->post_type );
        $thumb = get_the_post_thumbnail_url( $post->ID, array( 50, 50 ) );
        $data = array();
        $data['id'] = $post->ID;
        $data['image'] = ( $thumb ) ? $thumb : '';
        $data['post_title'] = $post->post_title;
        $data['edit_post_link'] = get_edit_post_link( $post->ID );
        $data['post_link']= get_permalink( $post->ID );
        $data['post_author']= get_the_author_meta( 'display_name', $post->post_author );
        $data['post_date'] = get_the_time( 'Y/m/d H:i:s', $post->ID );
        $data['menu_order'] = $post->menu_order;
        $data['post_type'] = $post_type->labels->singular_name;
        $data['post_status'] = $post->post_status;
        $sections = wp_get_post_terms($post->ID, 'section');
        $custom_section_label = get_post_meta($post->ID, "dm_custom_section_label", true);
        if (!empty($custom_section_label)) {
            $sections[] = (object) array("name" => $custom_section_label);
        }
        $data['post_sections'] = array_map(function($section) { return $section->name; }, $sections);
        return $data;
    }

    protected function _map_slots($slots) {
        foreach ($slots as $slot) {
            if (!empty($slot->lock_until)) {
                $lock_until_timestamp = strtotime($slot->lock_until);
                $now = time();
                if ($lock_until_timestamp < $now) {
                    $slot->lock_until = null;
                }
            } else {
                $slot->lock_until = null;
            }
        }
        return $slots;
    }

    public function _get_slots(int $frontpage_id) : array {
        global $wpdb;
        $slots = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d ORDER BY display_order ASC", $frontpage_id));
        return $this->_map_slots($slots);
    }

    protected function _get_slot(int $slot_id) : stdClass {
        global $wpdb;
        $slot = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE id = %d", $slot_id));
        return $this->_map_slots(array($slot))[0];
    }

    protected function _clear_featured_posts(int $frontpage_id) {
        $frontpage = $this->get_frontpage($frontpage_id);
        $posts = $this->_get_featured_posts($frontpage_id);
        global $wpdb;
        $del = array($frontpage->ordering_code, $frontpage->featured_code);  
        $sql = "DELETE FROM {$wpdb->postmeta} WHERE meta_key IN ('".implode("','",$del)."')";
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query($sql);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
        foreach ( $posts as $post ) {
            $this->_remove_featured_flag($post->ID, $frontpage->featured_code);
        }
        update_meta_cache( 'article', wp_list_pluck( $posts, 'post_id' ) );
        update_postmeta_cache( wp_list_pluck( $posts, 'ID' ) );
    }

    protected function _delete_featured_posts(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        $post_ids = array_map(function($post) { return $post->post_id; }, $posts);
        global $wpdb;
        $del = array($frontpage->ordering_code, $frontpage->featured_code);
        $del_pairs = array();
        foreach ($del as $del_key) {
            foreach ($post_ids as $post_id) {
                $del_pairs[] = '(' . $post_id . ',"' . $del_key . '")';
            }
        }
        $sql = "DELETE FROM {$wpdb->postmeta} WHERE (post_id, meta_key) IN (".implode(',',$del_pairs).")";
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query($sql);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
        foreach ( $post_ids as $post_id ) {
            $this->_remove_featured_flag($post_id, $frontpage->featured_code);
        }
        update_postmeta_cache( $post_ids );
    }

    protected function _delete_featured_posts_slow(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        $post_ids = array_map(function($post) { return $post->post_id; }, $posts);
        foreach( $post_ids as $post_id ) {
            $this->_remove_featured_flag($post_id, $frontpage->featured_code);
            delete_post_meta( $post_id, $frontpage->ordering_code );
            delete_post_meta( $post_id, $frontpage->featured_code );
        }
    }

    protected function _update_featured_posts(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        global $wpdb;
        $cases = array();
        foreach ($posts as $post) {
            $cases[] = "WHEN post_id = {$post->post_id} THEN '{$post->display_order}'";
        }
        $sql = "UPDATE {$wpdb->postmeta} SET meta_value = (CASE " . implode(' ', $cases) . " END) WHERE meta_key = '{$frontpage->ordering_code}'";
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query($sql);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
        update_postmeta_cache( wp_list_pluck( $posts, 'post_id' ));
    }

    protected function _update_featured_posts_slow(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        foreach($posts as $post) {
            update_post_meta($post->post_id, $frontpage->ordering_code, $post->display_order);
            update_post_meta($post->post_id, $frontpage->featured_code, '1');
            $this->_set_featured_flag($post->post_id, $frontpage->featured_code);
        }
    }

    protected function _insert_featured_posts(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        $post_ids = array_map(function($post) { return $post->post_id; }, $posts);
        global $wpdb;
        $ins = array();
        foreach ($posts as $post) {
            $ins[] = "({$post->post_id}, '{$frontpage->ordering_code}', '{$post->display_order}'),({$post->post_id}, '{$frontpage->featured_code}', '1')";
        }
        $sql = "INSERT INTO {$wpdb->postmeta} (post_id, meta_key, meta_value) VALUES " . implode(',',$ins);
        // phpcs:ignore WordPress.DB.PreparedSQL.NotPrepared
        $wpdb->query($sql);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
        foreach ( $post_ids as $post_id ) {
            $this->_set_featured_flag( $post_id, $frontpage->featured_code);
        }
        update_postmeta_cache( $post_ids );
    }

    protected function _insert_featured_posts_slow(int $frontpage_id, array $posts) {
        if (empty($posts)) {
            return;
        }
        $frontpage = $this->get_frontpage($frontpage_id);
        foreach($posts as $post) {
            $post_status = get_post_status($post->post_id);
            if ($post_status !== 'publish') {
                continue;
            }
            update_post_meta($post->post_id, $frontpage->ordering_code, $post->display_order);
            update_post_meta($post->post_id, $frontpage->featured_code, '1');
            $this->_set_featured_flag($post->post_id, $frontpage->featured_code);
        }
    }

    protected function _set_featured_flag($post_id, $featured_code) {
        $current_flags = wp_get_object_terms( $post_id, 'flag', array('fields' => 'slugs') );
        $current_flags[] = $featured_code;
        wp_set_object_terms( $post_id, $current_flags, 'flag' );
    }

    protected function _remove_featured_flag($post_id, $featured_code) {
        $current_flags = wp_get_object_terms( $post_id, 'flag', array('fields' => 'slugs') );
        $current_flags = array_diff($current_flags, array($featured_code));
        wp_set_object_terms( $post_id, $current_flags, 'flag' );
    }

    protected function _resolve_featured_posts(array $current_state, array $desired_state) {
        $posts_to_insert = array();
        $posts_to_update = array();
        $posts_to_delete = array();
        $desired_ids = array_map(function($post) { return $post->post_id; }, $desired_state);
        $current_ids = array_map(function($post) { return $post->post_id; }, $current_state);
        $post_ids_to_insert = array_diff($desired_ids, $current_ids);
        $post_ids_to_update = array_intersect($desired_ids, $current_ids);
        $post_ids_to_delete = array_diff($current_ids, $desired_ids);
        foreach($post_ids_to_insert as $post_id) {
            $posts_to_insert[] = $desired_state[array_search($post_id, $desired_ids)];
        }
        foreach($post_ids_to_update as $post_id) {
            $posts_to_update[] = $desired_state[array_search($post_id, $desired_ids)];
        }
        foreach($post_ids_to_delete as $post_id) {
            $posts_to_delete[] = (object) array('post_id' => $post_id);
        }
        return (object) array(
            'insert' => $posts_to_insert,
            'update' => $posts_to_update,
            'delete' => $posts_to_delete
        );
    }

    protected function _set_featured_posts(int $frontpage_id) {
        $frontpage = $this->get_frontpage($frontpage_id);
        $slots = $this->_get_slots($frontpage_id);
        global $wpdb;
        $current_posts = $wpdb->get_results($wpdb->prepare("SELECT post_id, meta_value AS display_order FROM {$wpdb->postmeta} WHERE meta_key = %s", $frontpage->ordering_code));
        $desired_posts = array_filter(
            array_map(
                function($slot) { return (object) [ "post_id" => $slot->post_id, "display_order" => $slot->display_order ]; }, 
                $slots
            ), 
            function($slot) { 
                return (!empty($slot->post_id)); 
            }
        );
        $tasks = $this->_resolve_featured_posts($current_posts, $desired_posts);
        $this->_update_featured_posts_slow($frontpage_id, $tasks->update);
        $this->_insert_featured_posts_slow($frontpage_id, $tasks->insert);
        $this->_delete_featured_posts_slow($frontpage_id, $tasks->delete);
        $this->_set_last_updated($frontpage_id);
        // update_postmeta_cache( wp_list_pluck( $slots, 'post_id' ) );
    }

    public function _get_featured_posts(int $frontpage_id) {
        global $wpdb;
        $frontpage = $this->get_frontpage($frontpage_id);
        $slot_count = $wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}frontpage_engine_frontpage_slots WHERE frontpage_id = %d", $frontpage->id));
        $params = array(
			'post_type'   => explode(",", $frontpage->post_types),
			'post_status' => 'publish',
		);
        $params['meta_key'] = $frontpage->ordering_code;
        $params['numberposts'] = $slot_count;
        $params['orderby'] = 'meta_value_num';
        $params['order'] = 'ASC';
        $params['tax_query'] = array(
            'relation' => 'AND',
            array(
                'taxonomy' => 'flag',
                'field'    => 'slug',
                'terms'    => $frontpage->featured_code,
            ),
        );
        return get_posts( $params );
    }

    public function set_slot_post($slot_id, $post_id) {
        global $wpdb;
        $wpdb->update(
            $wpdb->prefix . 'frontpage_engine_frontpage_slots',
            array(
                'post_id' => $post_id,
            ),
            array(
                'id' => $slot_id,
            )
        );
    }

    protected function _migrate(int $frontpage_id) : stdClass {
        global $wpdb;
        $slots = $this->_get_slots($frontpage_id);
        $empty_slots = array_filter($slots, function($slot) {
            return !$slot->post_id;
        });
        $posts = $this->_get_featured_posts( $frontpage_id );
        // Remove all posts that are already in a slot
        $posts = array_filter($posts, function($post) use ($slots) {
            foreach ($slots as $slot) {
                if ($slot->post_id == $post->ID) {
                    return false;
                }
            }
            return true;
        });
        foreach ($posts as $post) {
            $post_id = $post->ID;
            $slot = array_shift($empty_slots);
            $wpdb->update(
                $wpdb->prefix . 'frontpage_engine_frontpage_slots',
                array(
                    'post_id' => $post_id,
                ),
                array(
                    'id' => $slot->id,
                )
            );
            if ($wpdb->last_error) {
                throw new Exception($wpdb->last_error);
            }
            if (count($empty_slots) == 0) {
                break;
            }
        }
        $result = new stdClass();
        $result->status = "ok";
        $result->slots = $this->_get_slots($frontpage_id);
        $result->posts_migrated = count($posts);
        $result->frontpage_id = $frontpage_id;
        return $result;
    }

    protected function _project_post(WP_Post $post) : stdClass {
        $new_post = new stdClass();
        if (!$post->slot) {
            $post->slot = $this->_get_slot($post->slot_id);
        }
        $new_post->slot = $post->slot;
        $new_post->edit_post_link = get_edit_post_link( $post->ID );
        $new_post->post_link = get_permalink( $post->ID );
        $new_post->id = $post->ID;
        $new_post->image = get_the_post_thumbnail_url( $post->ID, array( 50, 50 ) );
        $new_post->post_title = $post->post_title;
        $new_post->post_author = get_the_author_meta( 'display_name', $post->post_author );
        $new_post->post_date = get_the_time( 'Y/m/d H:i:s', $post->ID );
        $new_post->post_status = $post->post_status;
        $new_post->post_type = $post->post_type;
        $new_post->post_excerpt = $post->post_excerpt;
        $sections = wp_get_post_terms($post->ID, 'section');
        $custom_section_label = get_post_meta($post->ID, "dm_custom_section_label", true);
        if (!empty($custom_section_label)) {
            $sections[] = (object) array("name" => $custom_section_label);
        }
        $new_post->post_sections = array_map(function($section) { return $section->name; }, $sections);
        return $new_post;
    }

    protected function _case_map(stdClass $slot) : string {
        if (is_array($slot)) {
            $slot = (object)$slot;
        }
        $slot_id = intval($slot->id);
        $post_id = intval($slot->post_id);
        $post_id = $post_id == 0 ? "null" : $post_id;
        return "WHEN id = {$slot_id} THEN {$post_id}";
    }

    public function insert_post(int $frontpage_id, int $post_id, int $slot_id) {
        // Inserts a post at slot_id, and moves all other posts down, while maintaining the order of locked post slots
        global $wpdb;
        $post_id = intval($post_id);
        $slot_id = intval($slot_id);
        $slots = $this->_get_slots($frontpage_id);
        $target_slot = $this->_get_slot($slot_id);
        $fixed_slots = array_filter($slots, function($slot) {
            return $slot->lock_until;
        });
        $already_exists = !empty(array_filter($fixed_slots, function($slot) use ($post_id) {
            return $slot->post_id == $post_id;
        }));
        if ($already_exists) {
            throw new Exception("Post already exists in frontpage");
        }
        $post_id_array = [];
        $x = 0;
        foreach($slots as $slot) {
            if (intval($slot->post_id) !== $post_id) {
                $post_id_array[$x++] = $slot->post_id;
            }
        }
        array_splice($post_id_array, $target_slot->display_order, 0, $post_id);
        foreach($fixed_slots as $fixed_slot) {
            $post_id_array = array_filter($post_id_array, function($post_id) use ($fixed_slot) {
                return $post_id !== $fixed_slot->post_id;
            });
        }
        foreach($fixed_slots as $fixed_slot) {
            array_splice($post_id_array, $fixed_slot->display_order, 0, $fixed_slot->post_id);
        }
        foreach($slots as $slot) {
            if (count($post_id_array) > 0) {
                $slot->post_id = array_shift($post_id_array);
            } else {
                $slot->post_id = null;
            }
        }
        // Update the database
        $sql = "UPDATE {$wpdb->prefix}frontpage_engine_frontpage_slots SET post_id = CASE ";
        $sql .= implode(" ", array_map(array($this, '_case_map'), $slots));
        $sql .= " END WHERE id IN (";
        $sql .= implode(", ", array_map(function($slot) { return $slot->id; }, $slots));
        $sql .= ")";
        // phpcs:ignore
        $wpdb->query($sql);
        $this->_set_featured_posts($frontpage_id);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    public function remove_post(int $frontpage_id, int $post_id) {
        global $wpdb;
        $post_id = intval($post_id);
        $slots = $this->_get_slots($frontpage_id);
        $fixed_slots = array_filter($slots, function($slot) {
            return $slot->lock_until;
        });
        $existing_post_ids = [];
        foreach($slots as $slot) {
            if (intval($slot->post_id) !== intval($post_id)) {
                $existing_post_ids[] = $slot->post_id;
            }
        }
        foreach($fixed_slots as $fixed_slot) {
            $existing_post_ids = array_filter($existing_post_ids, function($post_id) use ($fixed_slot) {
                return $post_id !== $fixed_slot->post_id;
            });
        }
        foreach($fixed_slots as $fixed_slot) {
            array_splice($existing_post_ids, $fixed_slot->display_order, 0, $fixed_slot->post_id);
        }
        foreach($slots as $slot) {
            if (count($existing_post_ids) > 0) {
                $slot->post_id = array_shift($existing_post_ids);
            } else {
                $slot->post_id = null;
            }
        }
        $sql = "UPDATE {$wpdb->prefix}frontpage_engine_frontpage_slots SET post_id = CASE ";
        $sql .= implode(" ", array_map(array($this, '_case_map'), $slots));
        $sql .= " END WHERE id IN (";
        $sql .= implode(", ", array_map(function($slot) { return $slot->id; }, $slots));
        $sql .= ")";
        // phpcs:ignore
        $wpdb->query($sql);
        $this->_set_featured_posts($frontpage_id);
        // print_r($wpdb->last_query);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    protected function _generate_hash(String $s, int $min, int $max) : int {
        $hash = crc32($s);
        $hash = ($hash % ($max - $min)) + $min;
        return $hash;
    }

    public function frontpage_analytics($frontpage_id, $simulate = false) {
        $slots = $this->_get_slots($frontpage_id);
        $post_ids = array_filter(array_map(function($slot) {
            return $slot->post_id;
        }, $slots), function($post_id) {
            return $post_id;
        });
        if ($simulate) {
            return $this->simulate_analytics($post_ids);
        }
        return $this->analytics($post_ids);
    }

    public function analytics(Array $post_ids) {
        if (!get_option("revengine_content_promoter_api_url")) {
            foreach ($post_ids as $post_id) {
                $analytics[intval($post_id)] = array(
                    "post_id" => intval($post_id),
                    "hits_last_hour" => 0,
                );
            }
            return $analytics;
        }
        $response = wp_remote_post(get_option("revengine_content_promoter_api_url") . "/analytics/posts", array(
            "body" => (array(
                "post_ids" => $post_ids,
            )),
        ));
        if (is_wp_error($response)) {
            throw new Exception($response->get_error_message());
        }
        $post_hits = json_decode(wp_remote_retrieve_body($response));
        foreach ($post_hits as $post_hit) {
            $analytics[intval($post_hit->post_id)] = array(
                "post_id" => intval($post_hit->post_id),
                "hits_last_hour" => $post_hit->hits,
            );
        }
        return $analytics;
    }

    public function simulate_analytics(Array $post_ids) {
        $analytics = array();
        foreach ($post_ids as $post_id) {
            $analytics[intval($post_id)] = array(
                "post_id" => intval($post_id),
                "hits_last_hour" => $this->_generate_hash($post_id, 100, 1000),
            );
        }
        return $analytics;
    }

    protected function _do_autosort(int $frontpage_id, $simulate = false) {
        global $wpdb;
        $current_slots = $this->_get_slots($frontpage_id);
        if ($simulate) {
            $analytics = $this->frontpage_analytics($frontpage_id, true);
        } else {
            $analytics = $this->frontpage_analytics($frontpage_id);
        }
        $slots = array();
        $posts = array();
        $i = 0;
        foreach ($current_slots as $slot) {
            if (!empty($slot->post_id) && empty($slot->lock_until) && empty($slot->manual_order)) {
                $slots[$i] = new stdClass();
                $slots[$i]->id = $slot->id;
                $slots[$i]->display_order = $slot->display_order;
                $posts[$i] = new stdClass();
                $posts[$i]->post_id = $slot->post_id;
                $posts[$i]->hits_last_hour = $analytics[intval($slot->post_id)]["hits_last_hour"];
                $i++;
            }
        }
        usort($posts, function($a, $b) {
            if ($a->hits_last_hour === $b->hits_last_hour) {
                return 0;
            }
            return ($a->hits_last_hour > $b->hits_last_hour) ? -1 : 1;
        });
        for($i = 0; $i < count($posts); $i++) {
            $slots[$i]->post_id = $posts[$i]->post_id;
            $slots[$i]->hits_last_hour = $posts[$i]->hits_last_hour;
        }
        $sql = "UPDATE {$wpdb->prefix}frontpage_engine_frontpage_slots SET post_id = CASE ";
        $sql .= implode(" ", array_map(array($this, '_case_map'), $slots));
        $sql .= " END WHERE id IN (";
        $sql .= implode(", ", array_map(function($slot) { return $slot->id; }, $slots));
        $sql .= ")";
        // phpcs:ignore
        $wpdb->query($sql);
        $this->_set_featured_posts($frontpage_id);
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
        $this->ws_callback($frontpage_id);
    }

    public function auto_slot($frontpage_id, $post_id, $simulate = false) {
        // Get all the slots
        $slots = $this->_get_slots($frontpage_id);
        // Get analytics for all posts on the frontpage
        $analytics = $this->frontpage_analytics($frontpage_id, $simulate);
        // Get analytics for post_id
        if ($simulate) {
            $post_analytics = $this->simulate_analytics(array($post_id));
        } else {
            $post_analytics = $this->analytics(array($post_id));
        }
        if (empty($post_analytics[$post_id])) {
            return $slots[count($slots) - 1];
        }
        $hits = $post_analytics[$post_id]["hits_last_hour"];
        // Find the first slot with less hits than the post
        foreach ($slots as $slot) {
            if (empty($slot->lock_until) && $analytics[$slot->post_id]["hits_last_hour"] < $hits) {
                return $slot;
            }
        }
        return $slots[count($slots) - 1];
    }

    protected function _update_slot(int $slot_id, Array $data) {
        global $wpdb;
        $wpdb->update("{$wpdb->prefix}frontpage_engine_frontpage_slots", $data, array(
            "id" => $slot_id,
        ));
        if ($wpdb->last_error) {
            throw new Exception($wpdb->last_error);
        }
    }

    public function ws_callback($frontpage_id, $uid = null) {
        $url = get_option("frontpageengine_wssb_web_address");
        if (!$url) {
            return;
        }
        if (!$uid) {
            $uid = uniqid("frontpageengine-server-");
        }
        $domain = admin_url('admin-ajax.php');
        // $uid = 
        $response = wp_remote_post($url . "/broadcast", array(
            "body" => array(
                "domain" => $domain,
                "channel" => "frontpage-" . $frontpage_id,
                "message" => "frontpage_updated",
                "uid" => $uid,
            ),
        ));
        if (is_wp_error($response)) {
            throw new Exception($response->get_error_message());
        }
    }

    public function full_refresh($frontpage_id) {
        $current_slots = $this->_get_slots($frontpage_id);
        foreach($current_slots as $slot) {
            $this->_update_slot($slot->id, array(
                "post_id" => null,
            ));
        }
    }

    protected function _set_last_updated($frontpage_id) {
        global $wpdb;
        $wpdb->update("{$wpdb->prefix}frontpage_engine_frontpages", array(
            "last_updated" => current_time("mysql"),
        ), array(
            "id" => $frontpage_id,
        ));
    }
}