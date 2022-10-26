import queryString from 'query-string';

export const wp_api_post = async (action, data) => {
    const response = await fetch(ajax_var.url, {
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
        throw new Error(response.text());
    }
}