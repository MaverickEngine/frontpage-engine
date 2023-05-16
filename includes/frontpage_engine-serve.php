<?php
/*
 * A highly optomised view of the front page 
 * in RSS, XML, JSON, CSV and HTML formats.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once(plugin_dir_path( __FILE__ ) . 'admin/frontpage_engine-lib.php' );

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
        $this->frontpage_engine_lib = new FrontpageEngineLib();
    }

    public function serve(String $frontpage_name, String $format, Array $fields = null) {
        if ($fields == null) {
            $fields = $this->default_fields;
        }
        $frontpage = $this->frontpage_engine_lib->get_frontpage_by_name($frontpage_name);
        $frontpage_content = $this->frontpage_engine_lib->_get_featured_posts($frontpage->id);
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
        $channel->appendChild($rss->createElement('link', $frontpage->url));
        $channel->appendChild($rss->createElement('description', $frontpage->description));
        $channel->appendChild($rss->createElement('language', 'en-us'));
        $channel->appendChild($rss->createElement('pubDate', gmdate(DATE_RSS, strtotime($frontpage->published_date))));
        $channel->appendChild($rss->createElement('lastBuildDate', gmdate(DATE_RSS, strtotime($frontpage->published_date))));
        $channel->appendChild($rss->createElement('generator', 'FrontpageEngine'));
        $channel->appendChild($rss->createElement('docs', 'https://validator.w3.org/feed/docs/rss2.html'));
    }

    private function serve_json($frontpage, $frontpage_content, $fields) {
        header('Content-Type: application/json; charset=utf-8');
        $json = [];
        $json['title'] = $frontpage->name;
        $json['link'] = $frontpage->url;
        $json['description'] = $frontpage->description;
        $json['language'] = 'en-us';
        $json['pubDate'] = gmdate(DATE_RSS, strtotime($frontpage->published_date));
        $json['lastBuildDate'] = gmdate(DATE_RSS, strtotime($frontpage->published_date));
        $json['generator'] = 'FrontpageEngine';
        $json['docs'] = 'https://validator.w3.org/feed/docs/rss2.html';
        $json['items'] = [];
        echo wp_json_encode($json);
        return;
    }

    
}