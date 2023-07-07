<?php
/*
 * A highly optomised view of the front page 
 * in RSS, XML, JSON, CSV and HTML formats.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once(plugin_dir_path( __FILE__ ) . '../admin/frontpage_engine-lib.php' );

class FrontpageEngineServe {
    private $default_fields = [
        "title" => "title",
        "link" => "url",
        "guid" => "url",
        "pubDate" => "published_date",
        "description" => "excerpt",
        "category" => "section",
        "author" => "author",
    ];

    public function __construct() {
        // First check that we're in the right place before doing anything exciting
        if (empty($_SERVER['REQUEST_URI'])) return;
        $this->uri = sanitize_url($_SERVER['REQUEST_URI']);
        $this->parsed_url = wp_parse_url($this->uri);
        if (!is_array($this->parsed_url)) return;
        $this->parameters = wp_parse_args($this->parsed_url["query"] ?? null);
        if (!preg_match('/\/frontpage-engine\/(rss|json|xml)\/(.*)/', $this->parsed_url["path"], $matches)) {
            return;
        }
        // Now make sure we have a valid frontpage
        $this->frontpageengine_lib = new FrontpageEngineLib();
        $frontpages = $this->frontpageengine_lib->get_front_pages();
        $frontpage_names = array_map(function($frontpage) {
            return $frontpage->slug;
        }, $frontpages);
        $found = array_search($matches[2], $frontpage_names);
        if ($found === false) {
            return;
        }
        // Get some constants
        if (!defined('FRONTPAGEENGINE_FEED_TTL')) {
            define('FRONTPAGEENGINE_FEED_TTL', 60);
        }
        $format = $matches[1];
        $frontpage_slug = $matches[2];
        $this->serve($frontpage_slug, $format);
        exit;
    }

    public function serve(String $frontpage_slug, String $format, Array $fields = null) {
        if ($fields == null) {
            $fields = $this->default_fields;
        }
        $frontpage = $this->frontpageengine_lib->get_frontpage_by_slug($frontpage_slug);
        $frontpage_content = $this->frontpageengine_lib->_get_featured_posts($frontpage->id);
        switch ($format) {
            case 'rss':
                $this->serve_rss($frontpage, $frontpage_content, $fields);
                break;
            // case 'xml':
            //     $this->serve_xml($frontpage, $frontpage_content, $fields);
            //     break;
            case 'json':
                $this->serve_json($frontpage, $frontpage_content, $fields);
                break;
            // case 'csv':
            //     $this->serve_csv($frontpage, $frontpage_content, $fields);
            //     break;
            // case 'html':
            //     $this->serve_html($frontpage, $frontpage_content, $fields);
            //     break;
            // default:
            //     $this->serve_html($frontpage, $frontpage_content, $fields);
            //     break;
        }
    }

    private function serve_rss($frontpage, $frontpage_content, $fields) {
        header('Content-Type: application/rss+xml; charset=utf-8');
        $rss = new DOMDocument();
        $rss->formatOutput = true;
        $rss->encoding = 'utf-8';
        $channel = $rss->createElement('channel');
        $rss->appendChild($channel);
        $channel->appendChild($rss->createElement('title', $frontpage->name));
        $channel->appendChild($rss->createElement('link', get_site_url() . $this->parsed_url["path"]));
        $channel->appendChild($rss->createElement('description', "FrontPage Engine News Feed for $frontpage->name"));
        $channel->appendChild($rss->createElement('language', get_locale()));
        $channel->appendChild($rss->createElement('copyright', "Copyright (c) ". gmdate("Y") . " " . get_bloginfo('name') . ". All rights reserved."));
        $channel->appendChild($rss->createElement('ttl', FRONTPAGEENGINE_FEED_TTL));
        $channel->appendChild($rss->createElement('pubDate', gmdate(DATE_RSS, strtotime($frontpage->last_updated))));
        $channel->appendChild($rss->createElement('lastBuildDate', gmdate(DATE_RSS, strtotime($frontpage->last_updated))));
        $channel->appendChild($rss->createElement('generator', 'FrontpageEngine'));
        $channel->appendChild($rss->createElement('docs', 'https://validator.w3.org/feed/docs/rss2.html'));
        // Add items
        foreach ($frontpage_content as $p) {
            $post = $this->map_post($p);
            $item = $rss->createElement('item');
            $item->appendChild($rss->createElement('title', mb_convert_encoding($post->title, 'UTF-8')));
            $item->appendChild($rss->createElement('link', $post->url));
            $item->appendChild($rss->createElement('description', mb_convert_encoding($post->excerpt,  'UTF-8')));
            $item->appendChild($rss->createElement('author', $post->author));
            foreach ($post->sections as $section) {
                $item->appendChild($rss->createElement('category', $section));
            }
            $item->appendChild($rss->createElement('pubDate', $post->published_date));
            $item->appendChild($rss->createElement('guid', $post->url));
            $item->appendChild($rss->createElement('comments', $post->url));
            $item->appendChild($rss->createElement('enclosure', $post->img_full));
            $item->appendChild($rss->createElement('source', get_site_url()));
            $channel->appendChild($item);
        }
        // Render RSS
        // phpcs:ignore
        print $rss->saveXML();
    }

    private function serve_json($frontpage, $frontpage_content, $fields) {
        header('Content-Type: application/json; charset=utf-8');
        $json = [];
        $json['title'] = $frontpage->name;
        $json['link'] = get_site_url() . $this->parsed_url["path"];
        $json['language'] = get_locale();
        $json['last_updated'] = strtotime($frontpage->last_updated);
        $json['generator'] = 'FrontpageEngine';
        // $json['docs'] = 'https://validator.w3.org/feed/docs/rss2.html';
        $json['items'] = array_map([$this, "map_post"], $frontpage_content);
        echo wp_json_encode($json);
        return;
    }

    private function map_post($post) {
        // function map_name($term) { return $term->name; }
        $result = new stdClass();
        $post_type = $post->post_type;
        $result->id = $post->ID;
        $result->title = $post->post_title;
        $result->url = get_permalink($post->ID);
        $result->post_type = $post_type;
        $result->excerpt = $post->post_excerpt;
        // $post->section = $this->frontpageengine_lib->get_section_name($post->ID);
        $result->author = get_the_author_meta('display_name', $post->post_author);
        if ($post_type === "opinion-piece") {
            $result->img_thumbnail = get_author_image_url($post->post_author, "thumbnail");
            $result->img_medium = get_author_image_url($post->post_author, "medium");
            $result->img_full = get_author_image_url($post->post_author, "full");
        } else {
            $result->img_thumbnail = get_the_post_thumbnail_url($post->ID, "thumbnail");
            $result->img_medium = get_the_post_thumbnail_url($post->ID, "medium");
            $result->img_full = get_the_post_thumbnail_url($post->ID, "full");
        }
        $result->published_date = get_the_date(DATE_RSS, $post->ID);
        $result->published_time = strtotime($post->post_date);
        $tags = get_the_terms($post->ID, $post_type . "_tag");
        if (is_array($tags)) {
            $result->tags = array_map([$this, "_map_name"], $tags);
        } else {
            $result->tags = [];
        }
        $dm_tags = get_the_terms($post->ID, "dm_article_theme");
        if (is_array($dm_tags)) {
            $result->tags = array_merge($post->tags, array_map([$this, "_map_name"], $dm_tags));
        }
        $terms = get_the_terms($post->ID, "section");
        if (is_array($terms)) {
            $result->sections = array_map([$this, "_map_name"], $terms);
        } else {
            $result->sections = [];
        }
        $result->custom_section_label = get_post_meta($post->ID, "dm_custom_section_label", true);
        $taxonomies = get_post_taxonomies( $post->ID );
        $terms = [];
        foreach($taxonomies as $taxonomy) {
            $new_terms = get_the_terms( $post->ID, $taxonomy );
            if (!empty($new_terms)) {
                $terms = array_merge($terms, $new_terms);
            }
        }
        $result->terms = array_map([$this, "_map_name"], $terms);
        return $result;
    }

    private function map_rss_item($post, $rss) {
        $item = new DOMElement("item");
        $post = $this->map_post($post);
        $item->appendChild($rss->createElement('title', $post->title));
        $item->appendChild($rss->createElement('link', $post->url));
        $item->appendChild($rss->createElement('description', $post->excerpt));
        $item->appendChild($rss->createElement('author', $post->author));
        // $item->appendChild($rss->createElement('category', implode(", ", $post->sections)));
        $item->appendChild($rss->createElement('pubDate', $post->published_date));
        $item->appendChild($rss->createElement('guid', $post->url));
        $item->appendChild($rss->createElement('comments', $post->url));
        // $item->appendChild($rss->createElement('enclosure', $post->img_full));
        $item->appendChild($rss->createElement('source', get_site_url()));
        return $item;
    }

    protected function _map_name($term) {
        return $term->name;
    }

    
}