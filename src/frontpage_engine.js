import { FrontPageEngineSocketServer } from './websocket.js';

import App from './App.svelte'

const app = new App({
    target: document.getElementById('frontpage-engine-app'),
    props: {
        featured_code: ajax_var.featured_code,
        ordering_code: ajax_var.ordering_code,
        nonce: ajax_var.nonce,
        url: ajax_var.url,
        action: ajax_var.action,
        frontpage_id: ajax_var.frontpage_id,
    }
})

export default app