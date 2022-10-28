import queryString from 'query-string';
const controllers = {};

export const wp_api_post = async (action, data, name=null) => {
    const controller = new AbortController();
    if (name) {
        if (controllers[name]) {
            controllers[name].abort();
        }
        controllers[name] = controller;
    }
    const response = await fetch(ajax_var.url, {
        signal: controller.signal,
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: queryString.stringify({
            action: action,
            nonce: ajax_var.nonce,
            ...data
        })
    })
    try {
        return await response.json()
    } catch (e) {
        throw new Error(e);
    }
}