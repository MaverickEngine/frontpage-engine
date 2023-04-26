const wp = (window as any).wp;
export function apiPost(path: string, data: any, uid: string = null) {
    return new Promise((resolve, reject) => {
        console.log({ uid });
        wp.apiRequest({
            path,
            data,
            type: "POST",
            headers: {
                "x-wssb-uid": uid,
            },
        })
        .done(async (response) => {
            if (response.error) {
                reject(response);
            }
            resolve(response);
        })
        .fail(async (response) => {
            reject(response.responseJSON?.message || response.statusText || response.responseText || response);
        });
    });
}

export function apiGet(path: string) {
    return new Promise((resolve, reject) => {
        wp.apiRequest({
            path,
            type: "GET",
        })
        .done(async (response) => {
            if (response.error) {
                reject(response);
            }
            resolve(response);
        })
        .fail(async (response) => {
            reject(response.responseJSON?.message || response.statusText || response.responseText || response);
        });
    });
}

export function apiDelete(path: string) {
    return new Promise((resolve, reject) => {
        wp.apiRequest({
            path,
            type: "DELETE",
        })
        .done(async (response) => {
            if (response.error) {
                reject(response);
            }
            resolve(response);
        })
        .fail(async (response) => {
            reject(response.responseJSON?.message || response.statusText || response.responseText || response);
        });
    });
}

export function apiPut(path: string, data: any) {
    return new Promise((resolve, reject) => {
        wp.apiRequest({
            path,
            data,
            type: "PUT",
            headers: {
                "x-wssb-uid": (window as any).wssb_uid,
            },
        })
        .done(async (response) => {
            if (response.error) {
                reject(response);
            }
            resolve(response);
        })
        .fail(async (response) => {
            reject(response.responseJSON?.message || response.statusText || response.responseText || response);
        });
    });
}