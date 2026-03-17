import * as https from 'https';
import * as http from 'http';

export interface FetchResult {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
    responseTime: number;
    finalUrl: string;
}

const MAX_REDIRECTS = 5;

export function fetchUrl(
    targetUrl: string,
    onRequest?: (req: http.ClientRequest) => void,
): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
        const start = Date.now();
        let redirectCount = 0;

        function doFetch(currentUrl: string): void {
            const mod = currentUrl.startsWith('https') ? https : http;

            const req = mod.get(currentUrl, { timeout: 15000 }, (res) => {
                const status = res.statusCode ?? 0;
                if ([301, 302, 307, 308].includes(status) && res.headers.location) {
                    redirectCount++;
                    if (redirectCount > MAX_REDIRECTS) {
                        reject(new Error(`Too many redirects (>${MAX_REDIRECTS})`));
                        return;
                    }
                    const nextUrl = new URL(res.headers.location, currentUrl).href;
                    res.resume();
                    doFetch(nextUrl);
                    return;
                }

                let body = '';
                res.on('data', (chunk: Buffer) => { body += chunk.toString(); });
                res.on('end', () => {
                    const headers: Record<string, string> = {};
                    for (const [key, value] of Object.entries(res.headers)) {
                        if (typeof value === 'string') {
                            headers[key.toLowerCase()] = value;
                        } else if (Array.isArray(value)) {
                            headers[key.toLowerCase()] = value.join(', ');
                        }
                    }
                    resolve({
                        statusCode: status,
                        headers,
                        body,
                        responseTime: Date.now() - start,
                        finalUrl: currentUrl,
                    });
                });
            });

            if (onRequest) {
                onRequest(req);
            }

            req.on('error', (err: Error) => {
                reject(err);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timed out after 15 seconds'));
            });
        }

        doFetch(targetUrl);
    });
}
