/*!
 * elmah.io Javascript Logger
 * (c) 2018 elmah.io, Apache 2.0 License, https://elmah.io
 */
(function (root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], function () {
			return factory(root);
		});
	} else if (typeof exports === 'object') {
		module.exports = factory(root);
	} else {
		root.Elmahio = factory(root);
	}
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, function (window) {

	'use strict';

	//
	// Shared Variables
	//

	var scriptFile = document.getElementsByTagName('script');
	var	scriptIndex = scriptFile.length - 1;
	var	myScript = scriptFile[scriptIndex];
	var	queryString = myScript.src.replace(/^[^\?]+\??/, '');
	var	params = parseQuery(queryString);
	var	paramsLength = objectLength(params);

	var debugSettings = {
		label: ' elmah.io debugger : On ',
		labelCSS: 'background: #06a89c; color: #ffffff; display: inline-block; font-size: 14px;',
		successCSS: 'background: #d4edda; color: #155724; display: inline-block; font-size: 13px;',
		errorCSS: 'background: #f8d7da; color: #721c24; display: inline-block; font-size: 13px;',
		warningCSS: 'background: #fff3cd; color: #856404; display: inline-block; font-size: 13px;',
		lightCSS: 'background: #e2e3e5; color: #383d41; display: inline-block; font-size: 13px;'
	};

	var defaults = {
		apiKey: null,
		logId: null,
		debug: false,
		application: null
	};

	//
	// Shared Methods
	//

	var extend = function () {

		// Variables
		var extended = {};
		var deep = false;
		var i = 0;

		// Check if a deep merge
		if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
			deep = arguments[0];
			i++;
		}

		// Merge the object into the extended object
		var merge = function (obj) {
			for (var prop in obj) {
				if (obj.hasOwnProperty(prop)) {
					// If property is an object, merge properties
					if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
						extended[prop] = extend(extended[prop], obj[prop]);
					} else {
						extended[prop] = obj[prop];
					}
				}
			}
		};

		// Loop through each object and conduct a merge
		for (; i < arguments.length; i++) {
			var obj = arguments[i];
			merge(obj);
		}

		return extended;

	};

	//
	// Helpers
	//

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

	function merge_objects(obj1, obj2) {
		var obj3 = {};
		for (var attrname in obj1) {
			obj3[attrname] = obj1[attrname];
		}
		for (var attrname in obj2) {
			obj3[attrname] = obj2[attrname];
		}

		return obj3;
	}

	function ErrorStackParser(settings) {
		'use strict';

		var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/;
		var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m;
		var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;

		return {
			parse: function (error) {
				if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
					return this.parseOpera(error);
				} else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
					return this.parseV8OrIE(error);
				} else if (error.stack) {
					return this.parseFFOrSafari(error);
				} else if (settings.debug) {
					console.log('%c Cannot parse given Error object', debugSettings.warningCSS);
				} else {
					return null;
				}
			},

			// Separate line and column numbers from a string of the form: (URI:Line:Column)
			extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
				// Fail-fast but return locations like "(native)"
				if (urlLike.indexOf(':') === -1) {
					return [urlLike];
				}

				var regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/;
				var parts = regExp.exec(urlLike.replace(/[\(\)]/g, ''));
				return [parts[1], parts[2] || undefined, parts[3] || undefined];
			},

			parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
				var filtered = error.stack.split('\n').filter(function (line) {
					return !!line.match(CHROME_IE_STACK_REGEXP);
				}, this);

				return filtered.map(function (line) {
					if (line.indexOf('(eval ') > -1) {
						// Throw away eval information until we implement stacktrace.js/stackframe#8
						line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, '');
					}
					var tokens = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').split(/\s+/).slice(1);
					var locationParts = this.extractLocation(tokens.pop());
					var functionName = tokens.join(' ') || undefined;
					var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];

					return ({
						functionName: functionName,
						fileName: fileName,
						lineNumber: locationParts[1],
						columnNumber: locationParts[2],
						source: line
					});
				}, this);
			},

			parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
				var filtered = error.stack.split('\n').filter(function (line) {
					return !line.match(SAFARI_NATIVE_CODE_REGEXP);
				}, this);

				return filtered.map(function (line) {
					// Throw away eval information until we implement stacktrace.js/stackframe#8
					if (line.indexOf(' > eval') > -1) {
						line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g, ':$1');
					}

					if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
						// Safari eval frames only have function names and nothing else
						return ({
							functionName: line
						});
					} else {
						var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
						var matches = line.match(functionNameRegex);
						var functionName = matches && matches[1] ? matches[1] : undefined;
						var locationParts = this.extractLocation(line.replace(functionNameRegex, ''));

						return ({
							functionName: functionName,
							fileName: locationParts[0],
							lineNumber: locationParts[1],
							columnNumber: locationParts[2],
							source: line
						});
					}
				}, this);
			},

			parseOpera: function ErrorStackParser$$parseOpera(e) {
				if (!e.stacktrace || (e.message.indexOf('\n') > -1 &&
					e.message.split('\n').length > e.stacktrace.split('\n').length)) {
					return this.parseOpera9(e);
				} else if (!e.stack) {
					return this.parseOpera10(e);
				} else {
					return this.parseOpera11(e);
				}
			},

			parseOpera9: function ErrorStackParser$$parseOpera9(e) {
				var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
				var lines = e.message.split('\n');
				var result = [];

				for (var i = 2, len = lines.length; i < len; i += 2) {
					var match = lineRE.exec(lines[i]);
					if (match) {
						result.push(({
							fileName: match[2],
							lineNumber: match[1],
							source: lines[i]
						}));
					}
				}

				return result;
			},

			parseOpera10: function ErrorStackParser$$parseOpera10(e) {
				var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
				var lines = e.stacktrace.split('\n');
				var result = [];

				for (var i = 0, len = lines.length; i < len; i += 2) {
					var match = lineRE.exec(lines[i]);
					if (match) {
						result.push(
							({
								functionName: match[3] || undefined,
								fileName: match[2],
								lineNumber: match[1],
								source: lines[i]
							})
						);
					}
				}

				return result;
			},

			// Opera 10.65+ Error.stack very similar to FF/Safari
			parseOpera11: function ErrorStackParser$$parseOpera11(error) {
				var filtered = error.stack.split('\n').filter(function (line) {
					return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
				}, this);

				return filtered.map(function (line) {
					var tokens = line.split('@');
					var locationParts = this.extractLocation(tokens.pop());
					var functionCall = (tokens.shift() || '');
					var functionName = functionCall
						.replace(/<anonymous function(: (\w+))?>/, '$2')
						.replace(/\([^\)]*\)/g, '') || undefined;
					var argsRaw;
					if (functionCall.match(/\(([^\)]*)\)/)) {
						argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, '$1');
					}
					var args = (argsRaw === undefined || argsRaw === '[arguments not available]') ?
						undefined : argsRaw.split(',');

					return ({
						functionName: functionName,
						args: args,
						fileName: locationParts[0],
						lineNumber: locationParts[1],
						columnNumber: locationParts[2],
						source: line
					});
				}, this);
			}
		};

	}


	//
	// Constructor
	// Can be named anything you want
	//

	var Constructor = function (options) {

		//
		// Unique Variables
		//

		var publicAPIs = {};
		var settings;

		function getPayload() {
			var payload = {
				"url": [document.location.protocol, '//', document.location.host, document.location.pathname, document.location.hash].join('') || '/',
				"application": settings.application
			};

			var payload_data = [];

			if (navigator.language) payload_data.push({ "key": "User-Language", "value": navigator.language });
			if (document.documentMode) payload_data.push({ "key": "Document-Mode", "value": document.documentMode });
			if (window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth) payload_data.push({ "key": "Browser-Width", "value": window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth });
			if (window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight) payload_data.push({ "key": "Browser-Height", "value": window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight });
			if (screen.width) payload_data.push({ "key": "Screen-Width", "value": screen.width });
			if (screen.height) payload_data.push({ "key": "Screen-Height", "value": screen.height });
			if (screen.colorDepth) payload_data.push({ "key": "Color-Depth", "value": screen.colorDepth });
			payload_data.push({ "key": "X-ELMAHIO-SEARCH-isClientside", "value": "true" });

			payload.data = payload_data;

			var payload_serverVariables = [];
			if (navigator.userAgent) payload_serverVariables.push({ "key": "User-Agent", "value": navigator.userAgent });
			if (document.referrer) payload_serverVariables.push({ "key": "Referer", "value": document.referrer });

			payload.serverVariables = payload_serverVariables;

			return payload;
		}

		function confirmResponse(status, response) {
			if (settings.debug) {
				if(status === 'error') {
					console.log('%c \u2BC8 Error log: ' + '%c \u2715 Not created ', debugSettings.lightCSS, debugSettings.errorCSS);
				} else {
					console.log('%c \u2BC8 Error log: ' + '%c \u2714 ' + response + ' at ' + new Date().toLocaleString() + ' ', debugSettings.lightCSS, debugSettings.successCSS);
				}
			}
		}


		//
		// Unique Methods
		//

		/**
		 * A private method
		 */
		var sendPayload = function (apiKey, logId, callback, errorLog) {
			var api_key = apiKey,
				log_id = logId,
				error = errorLog,
				queryParams = getSearchParameters();

			if ((api_key !== null && log_id !== null) || (paramsLength === 2)) {

				// Priority for parameters
				if (params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
					api_key = params['apiKey'];
					log_id = params['logId'];
				}

				// get new XHR object
				var xhr = new XMLHttpRequest();
				xhr.open("POST", "https://api.elmah.io/v3/messages/" + log_id + "?api_key=" + api_key, true);
				xhr.setRequestHeader('Content-type', 'application/json');

				xhr.onload = function (e) {
					if (xhr.readyState === 4) {
						if (xhr.status === 201) {
							callback('success', xhr.statusText);
						}
					}
				};

				xhr.onerror = function (e) {
					callback('error', xhr.statusText);
				}

				var stack = ErrorStackParser(settings).parse(error.error);

				var jsonData = {
					"detail": error.error.stack,
					"title": error.message,
					"source": stack && stack.length > 0 ? stack[0].fileName : null,
					"severity": "Error",
					"type": error.error.name,
					"queryString": JSON.parse(JSON.stringify(queryParams))
				};

				// Add payload to jsonData
				jsonData = merge_objects(jsonData, getPayload());

				xhr.send(JSON.stringify(jsonData));

			} else {
				return console.log('Login api error');
			}
		};

		var sendManualPayload = function (apiKey, logId, callback, logType, messageLog, errorLog) {
			var api_key = apiKey,
				log_id = logId,
				type = logType,
				error = errorLog,
				message = messageLog,
				queryParams = getSearchParameters();

			if ((api_key !== null && log_id !== null) || (paramsLength === 2)) {

				// Priority for parameters
				if (params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
					api_key = params['apiKey'];
					log_id = params['logId'];
				}

				// get new XHR object
				var xhr = new XMLHttpRequest();
				xhr.open("POST", "https://api.elmah.io/v3/messages/" + log_id + "?api_key=" + api_key, true);
				xhr.setRequestHeader('Content-type', 'application/json');

				xhr.onload = function (e) {
					if (xhr.readyState === 4) {
						if (xhr.status === 201) {
							callback('success', xhr.statusText);
						}
					}
				};

				xhr.onerror = function (e) {
					callback('error', xhr.statusText);
				}

				var stack = error ? ErrorStackParser(settings).parse(error) : null;

				var jsonData = {
					"title": message,
					"source": stack && stack.length > 0 ? stack[0].fileName : null,
					"detail": error ? error.stack : null,
					"severity": type,
					"type": error ? error.name : null,
					"queryString": JSON.parse(JSON.stringify(queryParams))
				};

				// Add payload to jsonData
				jsonData = merge_objects(jsonData, getPayload());

				xhr.send(JSON.stringify(jsonData));

			} else {
				return console.log('Login api error');
			}
		};

		/**
		 * Some public methods
		 */
		publicAPIs.error = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Error', msg);
		};
		publicAPIs.error = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Error', msg, error);
		};

		publicAPIs.verbose = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Verbose', msg);
		};
		publicAPIs.verbose = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Verbose', msg, error);
		};

		publicAPIs.debug = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Debug', msg);
		};
		publicAPIs.debug = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Debug', msg, error);
		};

		publicAPIs.information = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Information', msg);
		};
		publicAPIs.information = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Information', msg, error);
		};

		publicAPIs.warning = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Warning', msg);
		};
		publicAPIs.warning = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Warning', msg, error);
		};

		publicAPIs.fatal = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Fatal', msg);
		};
		publicAPIs.fatal = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Fatal', msg, error);
		};

		publicAPIs.log = function (msg) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Log function', msg);
		};
		publicAPIs.log = function (msg, error) {
			sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Log function', msg, error);
		};

		/**
		 * Another public method
		 */
		publicAPIs.init = function (options) {

			// Merge options into defaults
			settings = extend(defaults, options || {});

			// Code goes here...
			window.onerror = function (message, source, lineno, colno, error) {

				var errorLog = {
					'message': message,
					'source': source,
					'lineno': lineno,
					'colno': colno,
					'error': error
				}

				sendPayload(settings.apiKey, settings.logId, confirmResponse, errorLog);

				return false;
			}

		};

		// Initialize the plugin
		publicAPIs.init(options);

		if (settings.debug) {
			console.log('%c' + debugSettings.label, debugSettings.labelCSS);
		}

		// Return the public APIs
		return publicAPIs;

	};


	//
	// Return the constructor
	//

	if (paramsLength) {
		if (params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
			// Immediately-Invoked Function Expression (IIFE)
			return new Constructor;
		}
	} else {
		// UMD Constructor
		return Constructor;
	}

});
