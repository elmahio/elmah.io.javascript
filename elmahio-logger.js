/*!
 * Elmah.io Javascript Logger
 * (c) 2018 Eduard-Dan Stanescu, MIT License, https://elmah.io
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
	var scriptIndex = scriptFile.length - 1;
	var myScript = scriptFile[scriptIndex];
	var queryString = myScript.src.replace(/^[^\?]+\??/, '');
	var params = parseQuery(queryString);
	var paramsLength = objectLength(params);
	var debugSettings = {
		label: ' Elmah.io debugger : On ',
		labelCSS: 'background: #06a89c; color: #ffffff; display: inline-block; font-size: 14px;',
		successCSS: 'background: #d4edda; color: #155724; display: inline-block; font-size: 13px;',
		errorCSS: 'background: #f8d7da; color: #721c24; display: inline-block; font-size: 13px;',
		warningCSS: 'background: #fff3cd; color: #856404; display: inline-block; font-size: 13px;',
		lightCSS: 'background: #e2e3e5; color: #383d41; display: inline-block; font-size: 13px;'
	};
	var defaults = {
		apiKey: null,
		logId: null,
		debug: false
	};


	//
	// Shared Methods
	//

	/*!
	 * Merge two or more objects together.
	 * (c) 2017 Chris Ferdinandi, MIT License, https://gomakethings.com
	 * @param   {Boolean}  deep     If true, do a deep (or recursive) merge [optional]
	 * @param   {Object}   objects  The objects to merge together
	 * @returns {Object}            Merged values of defaults and options
	 */
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
				if (paramsLength === 2) {
					api_key = params['api_key'];
					log_id = params['log_id'];
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
				return console.log('Login api error');
			}
		};

		/**
		 * A public method
		 */
		publicAPIs.doSomething = function () {

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

	if (paramsLength === 2) {
		if (params.hasOwnProperty('api_key') && params.hasOwnProperty('log_id')) {
			// Immediately-Invoked Function Expression (IIFE)
			return new Constructor;
		}
	} else {
		// UMD Constructor
		return Constructor;
	}

});
