const Url = require('url');
const Http = require('http');
const Https = require('https');
const Qs = require('querystring');

class HttpClient {

    constructor(defaults) {
        defaults = defaults || {};
        this._defaultUrl = defaults.url || '';
        this._defaultTimeout = defaults.timeout || 60000;
        this._http = new Http.Agent({
            keepAlive: true,
            maxSockets: defaults.maxSockets || 5
        });
        this._https = new Https.Agent({
            keepAlive: true,
            maxSockets: defaults.maxSockets || 5
        });
    }

    request(params) {
        params = params || {};
        let uri = Url.parse(Url.resolve(this._defaultUrl, params.url || ''));

        const agent = params.agent || (uri.protocol === 'http:' ? this._http : this._https);
        const http = uri.protocol === 'http:' ? Http : Https;
        const requestParams = {
            protocol: uri.protocol,
            host: uri.hostname,
            port: uri.port,
            method: params.method.toUpperCase(),
            headers: params.headers || {},
            agent: agent,
            path: uri.path
        };

        if (params.qs && typeof params.qs === 'object') {
            params.path = uri.pathname + '?' + Qs.stringify(params.qs);
        }

        let postData;
        if (params.form && typeof params.form === 'object') {
            postData = Qs.stringify(params.form);
            requestParams.headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        if (params.json && typeof params.json === 'object') {
            postData = JSON.stringify(params.json);
            requestParams.headers['Content-Type'] = 'application/json';
        }

        if (params.payload) {
            postData = params.payload;
        }

        if (postData) {
            params.headers['Content-Length'] = Buffer.isBuffer(postData) ? postData.length : Buffer.byteLength(postData);
        }

        return new Promise((resolve, reject) => {
            const req = http.request(params, (res) => {
                let data = [];
                res.on('data', (chunk) => {
                    data.push(chunk);
                });
                res.on('end', () => {
                    try {
                        let result = JSON.parse(Buffer.concat(data).toString());
                        resolve(result);
                    } catch (err) {
                        err.message = err.message + ' json parse: ' + data.slice(0, 500);
                        reject(err);
                    }
                })
            });

            req.on('error', (e) => {
                reject(e);
            });
            req.setTimeout(params.timeout || this._defaultTimeout, () => {
                req.abort();
            });

            if (postData) {
                req.write(postData);
            }
            req.end();
        });
    }
}

const internals = {
    defaultClient: new HttpClient(),
    get () {

    },
    /**
     * @param defaults
     * @returns {HttpClient}
     */
    create(defaults) {
        return new HttpClient(defaults);
    }
};

module.exports = internals;