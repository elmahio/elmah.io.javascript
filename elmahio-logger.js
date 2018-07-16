(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define(factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.elmahio = factory();
    }
}(this, function () {

    /* ----------------------------------------------------------- */
    /* == log */
    /* ----------------------------------------------------------- */

    var scriptFile = document.getElementsByTagName('script'),
        scriptIndex = scriptFile.length - 1,
        myScript = scriptFile[scriptIndex],
        errors = [];

    function Logger(options) {

        var defaults = {
            apiKey: null,
            logId: null,
            debug: false
        };

        // extends config
        this.opts = extend({}, defaults, options);

        // init log
        this.init();
    }

    Logger.prototype.init = function () {
        if (this.log) {
            return;
        }

        var self = this;

        window.onerror = function (message, source, lineno, colno, error) {

            var error_log = {
                'message': message,
                'source': source,
                'lineno': lineno,
                'colno': colno,
                'error': error
            }

            _sendPayload(self.opts.apiKey, self.opts.logId, error_log);

            return false;
        }

    };

    Logger.prototype.destroy = function () {
        if (this.log === null) {
            return;
        }

        this.log = null;
    };

    Logger.prototype.showLoginError = function () {
        _loginError.call(this);
    };

    /* ----------------------------------------------------------- */
    /* == helpers */
    /* ----------------------------------------------------------- */

    function extend() {
        for (var i = 1; i < arguments.length; i++) {
            for (var key in arguments[i]) {
                if (arguments[i].hasOwnProperty(key)) {
                    arguments[0][key] = arguments[i][key];
                }
            }
        }
        return arguments[0];
    }

    function parseQuery(query) {
        var Params = new Object();
        if (!query) return Params; // return empty object
        var Pairs = query.split(/[;&]/);
        for (var i = 0; i < Pairs.length; i++) {
            var KeyVal = Pairs[i].split('=');
            if (!KeyVal || KeyVal.length != 2) continue;
            var key = unescape(KeyVal[0]);
            var val = unescape(KeyVal[1]);
            val = val.replace(/\+/g, ' ');
            Params[key] = val;
        }
        return Params;
    }

    function objectLength(obj) {
        var size = 0, key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) size++;
        }
        return size;
    };

    function getSearchParameters() {
        var prmstr = window.location.search.substr(1);
        return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : {};
    }

    function transformToAssocArray(prmstr) {
        var params = [];
        var prmarr = prmstr.split("&");
        for (var i = 0; i < prmarr.length; i++) {
            var tmparr = prmarr[i].split("=");
            params.push({
                'key': tmparr[0],
                'value': tmparr[1]
            });
        }
        return params;
    }


    /* ----------------------------------------------------------- */
    /* == private methods */
    /* ----------------------------------------------------------- */

    function _sendPayload(apiKey, logId, error_log) {

        var api_key = apiKey,
            log_id = logId,
            queryString = myScript.src.replace(/^[^\?]+\??/, ''),
            params = parseQuery(queryString),
            paramsLength = objectLength(params)
            error = error_log,
            queryParams = getSearchParameters();

        if ((api_key !== null && log_id !== null) || (paramsLength === 2)) {

            // Priority for parameters
            if (paramsLength === 2) {
                api_key = params['api_key'];
                log_id = params['log_id'];
            }

            // get new XHR object
            var xhr = new XMLHttpRequest();
            xhr.open("POST", "https://api.elmah.io/v3/messages/"+log_id+"?api_key="+api_key, true);
            xhr.setRequestHeader('Content-type', 'application/json');

            xhr.onload = function (e) {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        callback.call(JSON.parse(xhr.responseText));
                    }
                }
            };

            /* Debug */
            /* xhr.onerror = function (e) {
                console.error(xhr.statusText);
            }; */

            var jsonData = JSON.stringify({
                "application": "-",
                "detail": error.error.stack || 'Not available',
                "hostname": document.domain || 'Not available',
                "title": error.message || 'Not available',
                "source": error.source || 'Not available',
                "type": "string",
                "severity": "Error",
                "url": [document.location.protocol, '//', document.location.host, document.location.pathname, document.location.hash].join('') || '/',
                "queryString": JSON.parse(JSON.stringify(queryParams)),
                "data": [
                    {
                        "key": "User-Language",
                        "value": navigator.language || 'Not available'
                    },
                    {
                        "key": "Document-Mode",
                        "value": document.documentMode || 'Not available'
                    },
                    {
                        "key": "Browser-Width",
                        "value": window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth || 'Not available'
                    },
                    {
                        "key": "Browser-Height",
                        "value": window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight || 'Not available'
                    },
                    {
                        "key": "Screen-Width",
                        "value": screen.width || 'Not available'
                    },
                    {
                        "key": "Screen-Height",
                        "value": screen.height || 'Not available'
                    },
                    {
                        "key": "Color-Depth",
                        "value": screen.colorDepth || 'Not available'
                    },
                    {
                        "key": "Browser",
                        "value": navigator.appCodeName || 'Not available'
                    },
                    {
                        "key": "Browser-Name",
                        "value": navigator.appName || 'Not available'
                    },
                    {
                        "key": "Browser-Version",
                        "value": navigator.appVersion || 'Not available'
                    },
                    {
                        "key": "Platform",
                        "value": navigator.platform || 'Not available'
                    }
                ],
                "serverVariables": [
                    {
                        "key": "User-Agent",
                        "value": navigator.userAgent
                    },
                    {
                        "key": "Referer",
                        "value": document.referrer
                    }
                ]
            });

            xhr.send(jsonData);

        } else {
            return _loginError();
        }
    }

    function _loginError() {
        console.log('Login api error');
        return;
    }

    /* ----------------------------------------------------------- */
    /* == return */
    /* ----------------------------------------------------------- */

    return {
        log: Logger
    };

}));
