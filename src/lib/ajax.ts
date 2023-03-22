const wp = (window as any).wp;
export function apiPost(path: string, data: any) {
    return new Promise((resolve, reject) => {
        wp.apiRequest({
            path,
            data,
            type: "POST",
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