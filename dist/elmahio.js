/*!
 * elmah.io Javascript Logger - version 3.0.0-beta2
 * (c) 2018 elmah.io, Apache 2.0 License, https://elmah.io
 */
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], function() {
      return factory(root);
    });
  } else if (typeof exports === 'object') {
    module.exports = factory(root);
  } else {
    root.Elmahio = factory(root);
  }
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this, function(window) {
  'use strict';
  var StackFrame = (function() {
    "use strict";

    function _isNumber(n) {
      return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function _capitalize(str) {
      return str.charAt(0).toUpperCase() + str.substring(1);
    }

    function _getter(p) {
      return function() {
        return this[p];
      };
    }
    var booleanProps = ["isConstructor", "isEval", "isNative", "isToplevel"];
    var numericProps = ["columnNumber", "lineNumber"];
    var stringProps = ["fileName", "functionName", "source"];
    var arrayProps = ["args"];
    var props = booleanProps.concat(numericProps, stringProps, arrayProps);

    function StackFrame(obj) {
      if (obj instanceof Object) {
        for (var i = 0; i < props.length; i++) {
          if (obj.hasOwnProperty(props[i]) && obj[props[i]] !== undefined) {
            this["set" + _capitalize(props[i])](obj[props[i]]);
          }
        }
      }
    }
    StackFrame.prototype = {
      getArgs: function() {
        return this.args;
      },
      setArgs: function(v) {
        if (Object.prototype.toString.call(v) !== "[object Array]") {
          throw new TypeError("Args must be an Array");
        }
        this.args = v;
      },
      getEvalOrigin: function() {
        return this.evalOrigin;
      },
      setEvalOrigin: function(v) {
        if (v instanceof StackFrame) {
          this.evalOrigin = v;
        } else if (v instanceof Object) {
          this.evalOrigin = new StackFrame(v);
        } else {
          throw new TypeError("Eval Origin must be an Object or StackFrame");
        }
      },
      toString: function() {
        var functionName = this.getFunctionName() || "{anonymous}";
        var args = "(" + (this.getArgs() || []).join(",") + ")";
        var fileName = this.getFileName() ? "@" + this.getFileName() : "";
        var lineNumber = _isNumber(this.getLineNumber()) ? ":" + this.getLineNumber() : "";
        var columnNumber = _isNumber(this.getColumnNumber()) ? ":" + this.getColumnNumber() : "";
        return functionName + args + fileName + lineNumber + columnNumber;
      }
    };
    StackFrame.fromString = function StackFrame$$fromString(str) {
      var argsStartIndex = str.indexOf("(");
      var argsEndIndex = str.lastIndexOf(")");
      var functionName = str.substring(0, argsStartIndex);
      var args = str.substring(argsStartIndex + 1, argsEndIndex).split(",");
      var locationString = str.substring(argsEndIndex + 1);
      if (locationString.indexOf("@") === 0) {
        var parts = /@(.+?)(?::(\d+))?(?::(\d+))?$/.exec(locationString, "");
        var fileName = parts[1];
        var lineNumber = parts[2];
        var columnNumber = parts[3];
      }
      return new StackFrame({
        functionName: functionName,
        args: args || undefined,
        fileName: fileName,
        lineNumber: lineNumber || undefined,
        columnNumber: columnNumber || undefined
      });
    };
    for (var i = 0; i < booleanProps.length; i++) {
      StackFrame.prototype["get" + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
      StackFrame.prototype["set" + _capitalize(booleanProps[i])] = function(p) {
        return function(v) {
          this[p] = Boolean(v);
        };
      }(booleanProps[i]);
    }
    for (var j = 0; j < numericProps.length; j++) {
      StackFrame.prototype["get" + _capitalize(numericProps[j])] = _getter(numericProps[j]);
      StackFrame.prototype["set" + _capitalize(numericProps[j])] = function(p) {
        return function(v) {
          if (!_isNumber(v)) {
            throw new TypeError(p + " must be a Number");
          }
          this[p] = Number(v);
        };
      }(numericProps[j]);
    }
    for (var k = 0; k < stringProps.length; k++) {
      StackFrame.prototype["get" + _capitalize(stringProps[k])] = _getter(stringProps[k]);
      StackFrame.prototype["set" + _capitalize(stringProps[k])] = function(p) {
        return function(v) {
          this[p] = String(v);
        };
      }(stringProps[k]);
    }
    return StackFrame;
  })();
  var ErrorStackParser = (function() {
    "use strict";
    var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/;
    var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m;
    var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;
    return {
      parse: function ErrorStackParser$$parse(error) {
        if (typeof error.stacktrace !== "undefined" || typeof error["opera#sourceloc"] !== "undefined") {
          return this.parseOpera(error);
        } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
          return this.parseV8OrIE(error);
        } else if (error.stack) {
          return this.parseFFOrSafari(error);
        } else {
          throw new Error("Cannot parse given Error object");
        }
      },
      extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
        if (urlLike.indexOf(":") === -1) {
          return [urlLike];
        }
        var regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/;
        var parts = regExp.exec(urlLike.replace(/[\(\)]/g, ""));
        return [parts[1], parts[2] || undefined, parts[3] || undefined];
      },
      parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
        var filtered = error.stack.split("\n").filter(function(line) {
          return !!line.match(CHROME_IE_STACK_REGEXP);
        }, this);
        return filtered.map(function(line) {
          if (line.indexOf("(eval ") > -1) {
            line = line.replace(/eval code/g, "eval").replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, "");
          }
          var tokens = line.replace(/^\s+/, "").replace(/\(eval code/g, "(").split(/\s+/).slice(1);
          var locationParts = this.extractLocation(tokens.pop());
          var functionName = tokens.join(" ") || undefined;
          var fileName = ["eval", "<anonymous>"].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];
          return new StackFrame({
            functionName: functionName,
            fileName: fileName,
            lineNumber: locationParts[1],
            columnNumber: locationParts[2],
            source: line
          });
        }, this);
      },
      parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
        var filtered = error.stack.split("\n").filter(function(line) {
          return !line.match(SAFARI_NATIVE_CODE_REGEXP);
        }, this);
        return filtered.map(function(line) {
          if (line.indexOf(" > eval") > -1) {
            line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g, ":$1");
          }
          if (line.indexOf("@") === -1 && line.indexOf(":") === -1) {
            return new StackFrame({
              functionName: line
            });
          } else {
            var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
            var matches = line.match(functionNameRegex);
            var functionName = matches && matches[1] ? matches[1] : undefined;
            var locationParts = this.extractLocation(line.replace(functionNameRegex, ""));
            return new StackFrame({
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
        if (!e.stacktrace || e.message.indexOf("\n") > -1 && e.message.split("\n").length > e.stacktrace.split("\n").length) {
          return this.parseOpera9(e);
        } else if (!e.stack) {
          return this.parseOpera10(e);
        } else {
          return this.parseOpera11(e);
        }
      },
      parseOpera9: function ErrorStackParser$$parseOpera9(e) {
        var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
        var lines = e.message.split("\n");
        var result = [];
        for (var i = 2, len = lines.length; i < len; i += 2) {
          var match = lineRE.exec(lines[i]);
          if (match) {
            result.push(new StackFrame({
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
        var lines = e.stacktrace.split("\n");
        var result = [];
        for (var i = 0, len = lines.length; i < len; i += 2) {
          var match = lineRE.exec(lines[i]);
          if (match) {
            result.push(new StackFrame({
              functionName: match[3] || undefined,
              fileName: match[2],
              lineNumber: match[1],
              source: lines[i]
            }));
          }
        }
        return result;
      },
      parseOpera11: function ErrorStackParser$$parseOpera11(error) {
        var filtered = error.stack.split("\n").filter(function(line) {
          return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
        }, this);
        return filtered.map(function(line) {
          var tokens = line.split("@");
          var locationParts = this.extractLocation(tokens.pop());
          var functionCall = tokens.shift() || "";
          var functionName = functionCall.replace(/<anonymous function(: (\w+))?>/, "$2").replace(/\([^\)]*\)/g, "") || undefined;
          var argsRaw;
          if (functionCall.match(/\(([^\)]*)\)/)) {
            argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, "$1");
          }
          var args = argsRaw === undefined || argsRaw === "[arguments not available]" ? undefined : argsRaw.split(",");
          return new StackFrame({
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
  })();
  var StackTraceGPS = (function(SourceMap, StackFrame) {
    "use strict";

    function _xdr(url) {
      return new Promise(function(resolve, reject) {
        var req = new XMLHttpRequest();
        req.open("get", url);
        req.onerror = reject;
        req.onreadystatechange = function onreadystatechange() {
          if (req.readyState === 4) {
            if (req.status >= 200 && req.status < 300 || url.substr(0, 7) === "file://" && req.responseText) {
              resolve(req.responseText);
            } else {
              reject(new Error("HTTP status: " + req.status + " retrieving " + url));
            }
          }
        };
        req.send();
      });
    }

    function _atob(b64str) {
      if (typeof window !== "undefined" && window.atob) {
        return window.atob(b64str);
      } else {
        throw new Error("You must supply a polyfill for window.atob in this environment");
      }
    }

    function _parseJson(string) {
      if (typeof JSON !== "undefined" && JSON.parse) {
        return JSON.parse(string);
      } else {
        throw new Error("You must supply a polyfill for JSON.parse in this environment");
      }
    }

    function _findFunctionName(source, lineNumber) {
      var syntaxes = [/['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/, /function\s+([^('"`]*?)\s*\(([^)]*)\)/, /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/, /\b(?!(?:if|for|switch|while|with|catch)\b)(?:(?:static)\s+)?(\S+)\s*\(.*?\)\s*\{/, /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*\(.*?\)\s*=>/];
      var lines = source.split("\n");
      var code = "";
      var maxLines = Math.min(lineNumber, 20);
      for (var i = 0; i < maxLines; ++i) {
        var line = lines[lineNumber - i - 1];
        var commentPos = line.indexOf("//");
        if (commentPos >= 0) {
          line = line.substr(0, commentPos);
        }
        if (line) {
          code = line + code;
          var len = syntaxes.length;
          for (var index = 0; index < len; index++) {
            var m = syntaxes[index].exec(code);
            if (m && m[1]) {
              return m[1];
            }
          }
        }
      }
      return undefined;
    }

    function _ensureSupportedEnvironment() {
      if (typeof Object.defineProperty !== "function" || typeof Object.create !== "function") {
        throw new Error("Unable to consume source maps in older browsers");
      }
    }

    function _ensureStackFrameIsLegit(stackframe) {
      if (typeof stackframe !== "object") {
        throw new TypeError("Given StackFrame is not an object");
      } else if (typeof stackframe.fileName !== "string") {
        throw new TypeError("Given file name is not a String");
      } else if (typeof stackframe.lineNumber !== "number" || stackframe.lineNumber % 1 !== 0 || stackframe.lineNumber < 1) {
        throw new TypeError("Given line number must be a positive integer");
      } else if (typeof stackframe.columnNumber !== "number" || stackframe.columnNumber % 1 !== 0 || stackframe.columnNumber < 0) {
        throw new TypeError("Given column number must be a non-negative integer");
      }
      return true;
    }

    function _findSourceMappingURL(source) {
      var sourceMappingUrlRegExp = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)\s*$/gm;
      var lastSourceMappingUrl;
      var matchSourceMappingUrl;
      while (matchSourceMappingUrl = sourceMappingUrlRegExp.exec(source)) {
        lastSourceMappingUrl = matchSourceMappingUrl[1];
      }
      if (lastSourceMappingUrl) {
        return lastSourceMappingUrl;
      } else {
        throw new Error("sourceMappingURL not found");
      }
    }

    function _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache) {
      return new Promise(function(resolve, reject) {
        var loc = sourceMapConsumer.originalPositionFor({
          line: stackframe.lineNumber,
          column: stackframe.columnNumber
        });
        if (loc.source) {
          var mappedSource = sourceMapConsumer.sourceContentFor(loc.source);
          if (mappedSource) {
            sourceCache[loc.source] = mappedSource;
          }
          resolve(new StackFrame({
            functionName: loc.name || stackframe.functionName,
            args: stackframe.args,
            fileName: loc.source,
            lineNumber: loc.line,
            columnNumber: loc.column
          }));
        } else {
          reject(new Error("Could not get original source for given stackframe and source map"));
        }
      });
    }
    return function StackTraceGPS(opts) {
      if (!(this instanceof StackTraceGPS)) {
        return new StackTraceGPS(opts);
      }
      opts = opts || {};
      this.sourceCache = opts.sourceCache || {};
      this.sourceMapConsumerCache = opts.sourceMapConsumerCache || {};
      this.ajax = opts.ajax || _xdr;
      this._atob = opts.atob || _atob;
      this._get = function _get(location) {
        return new Promise(function(resolve, reject) {
          var isDataUrl = location.substr(0, 5) === "data:";
          if (this.sourceCache[location]) {
            resolve(this.sourceCache[location]);
          } else if (opts.offline && !isDataUrl) {
            reject(new Error("Cannot make network requests in offline mode"));
          } else {
            if (isDataUrl) {
              var supportedEncodingRegexp = /^data:application\/json;([\w=:"-]+;)*base64,/;
              var match = location.match(supportedEncodingRegexp);
              if (match) {
                var sourceMapStart = match[0].length;
                var encodedSource = location.substr(sourceMapStart);
                var source = this._atob(encodedSource);
                this.sourceCache[location] = source;
                resolve(source);
              } else {
                reject(new Error("The encoding of the inline sourcemap is not supported"));
              }
            } else {
              var xhrPromise = this.ajax(location, {
                method: "get"
              });
              this.sourceCache[location] = xhrPromise;
              xhrPromise.then(resolve, reject);
            }
          }
        }.bind(this));
      };
      this._getSourceMapConsumer = function _getSourceMapConsumer(sourceMappingURL, defaultSourceRoot) {
        return new Promise(function(resolve, reject) {
          if (this.sourceMapConsumerCache[sourceMappingURL]) {
            resolve(this.sourceMapConsumerCache[sourceMappingURL]);
          } else {
            var sourceMapConsumerPromise = new Promise(function(resolve, reject) {
              return this._get(sourceMappingURL).then(function(sourceMapSource) {
                if (typeof sourceMapSource === "string") {
                  sourceMapSource = _parseJson(sourceMapSource.replace(/^\)\]\}'/, ""));
                }
                if (typeof sourceMapSource.sourceRoot === "undefined") {
                  sourceMapSource.sourceRoot = defaultSourceRoot;
                }
                resolve(new SourceMap.SourceMapConsumer(sourceMapSource));
              }, reject);
            }.bind(this));
            this.sourceMapConsumerCache[sourceMappingURL] = sourceMapConsumerPromise;
            resolve(sourceMapConsumerPromise);
          }
        }.bind(this));
      };
      this.pinpoint = function StackTraceGPS$$pinpoint(stackframe) {
        return new Promise(function(resolve, reject) {
          this.getMappedLocation(stackframe).then(function(mappedStackFrame) {
            function resolveMappedStackFrame() {
              resolve(mappedStackFrame);
            }
            this.findFunctionName(mappedStackFrame).then(resolve, resolveMappedStackFrame)["catch"](resolveMappedStackFrame);
          }.bind(this), reject);
        }.bind(this));
      };
      this.findFunctionName = function StackTraceGPS$$findFunctionName(stackframe) {
        return new Promise(function(resolve, reject) {
          _ensureStackFrameIsLegit(stackframe);
          this._get(stackframe.fileName).then(function getSourceCallback(source) {
            var lineNumber = stackframe.lineNumber;
            var columnNumber = stackframe.columnNumber;
            var guessedFunctionName = _findFunctionName(source, lineNumber, columnNumber);
            if (guessedFunctionName) {
              resolve(new StackFrame({
                functionName: guessedFunctionName,
                args: stackframe.args,
                fileName: stackframe.fileName,
                lineNumber: lineNumber,
                columnNumber: columnNumber
              }));
            } else {
              resolve(stackframe);
            }
          }, reject)["catch"](reject);
        }.bind(this));
      };
      this.getMappedLocation = function StackTraceGPS$$getMappedLocation(stackframe) {
        return new Promise(function(resolve, reject) {
          _ensureSupportedEnvironment();
          _ensureStackFrameIsLegit(stackframe);
          var sourceCache = this.sourceCache;
          var fileName = stackframe.fileName;
          this._get(fileName).then(function(source) {
            var sourceMappingURL = _findSourceMappingURL(source);
            var isDataUrl = sourceMappingURL.substr(0, 5) === "data:";
            var defaultSourceRoot = fileName.substring(0, fileName.lastIndexOf("/") + 1);
            if (sourceMappingURL[0] !== "/" && !isDataUrl && !/^https?:\/\/|^\/\//i.test(sourceMappingURL)) {
              sourceMappingURL = defaultSourceRoot + sourceMappingURL;
            }
            return this._getSourceMapConsumer(sourceMappingURL, defaultSourceRoot).then(function(sourceMapConsumer) {
              return _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache).then(resolve)["catch"](function() {
                resolve(stackframe);
              });
            });
          }.bind(this), reject)["catch"](reject);
        }.bind(this));
      };
    };
  })();
  var scriptFile = document.getElementsByTagName('script');
  var scriptIndex = scriptFile.length - 1;
  var myScript = scriptFile[scriptIndex];
  var queryString = myScript.src.replace(/^[^\?]+\??/, '');
  var params = parseQuery(queryString);
  var paramsLength = objectLength(params);
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
    application: null,
    filter: null
  };
  var extend = function() {
    var extended = {};
    var deep = false;
    var i = 0;
    if (Object.prototype.toString.call(arguments[0]) === '[object Boolean]') {
      deep = arguments[0];
      i++;
    }
    var merge = function(obj) {
      for (var prop in obj) {
        if (obj.hasOwnProperty(prop)) {
          if (deep && Object.prototype.toString.call(obj[prop]) === '[object Object]') {
            extended[prop] = extend(extended[prop], obj[prop]);
          } else {
            extended[prop] = obj[prop];
          }
        }
      }
    };
    for (; i < arguments.length; i++) {
      var obj = arguments[i];
      merge(obj);
    }
    return extended;
  };

  function parseQuery(query) {
    var Params = new Object();
    if (!query) return Params;
    var Pairs = query.split(/[;&]/);
    for (var i = 0; i < Pairs.length; i++) {
      var KeyVal = Pairs[i].split('=');
      if (!KeyVal || KeyVal.length !== 2) continue;
      var key = unescape(KeyVal[0]);
      var val = unescape(KeyVal[1]);
      val = val.replace(/\+/g, ' ');
      Params[key] = val;
    }
    return Params;
  }

  function objectLength(obj) {
    var size = 0,
      key;
    for (key in obj) {
      if (obj.hasOwnProperty(key)) size++;
    }
    return size;
  };

  function getSearchParameters() {
    var prmstr = window.location.search.substr(1);
    return prmstr !== null && prmstr !== "" ? transformToAssocArray(prmstr) : {};
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
    for (var attrname1 in obj1) {
      obj3[attrname1] = obj1[attrname1];
    }
    for (var attrname2 in obj2) {
      obj3[attrname2] = obj2[attrname2];
    }
    return obj3;
  }
  var Constructor = function(options) {
    var publicAPIs = {};
    var settings;

    function getPayload() {
      var payload = {
        "url": document.location.pathname || '/',
        "application": settings.application
      };
      var payload_data = [];
      if (navigator.language) payload_data.push({
        "key": "User-Language",
        "value": navigator.language
      });
      if (document.documentMode) payload_data.push({
        "key": "Document-Mode",
        "value": document.documentMode
      });
      if (window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth) payload_data.push({
        "key": "Browser-Width",
        "value": window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth
      });
      if (window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight) payload_data.push({
        "key": "Browser-Height",
        "value": window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight
      });
      if ((screen.msOrientation || (screen.orientation || screen.mozOrientation || {}).type) !== undefined) payload_data.push({
        "key": "Screen-Orientation",
        "value": ((screen.msOrientation || (screen.orientation || screen.mozOrientation || {}).type).split("-"))[0]
      });
      if (screen.width) payload_data.push({
        "key": "Screen-Width",
        "value": screen.width
      });
      if (screen.height) payload_data.push({
        "key": "Screen-Height",
        "value": screen.height
      });
      if (screen.colorDepth) payload_data.push({
        "key": "Color-Depth",
        "value": screen.colorDepth
      });
      payload_data.push({
        "key": "X-ELMAHIO-SEARCH-isClientside",
        "value": "true"
      });
      payload.data = payload_data;
      var payload_serverVariables = [];
      if (navigator.userAgent) payload_serverVariables.push({
        "key": "User-Agent",
        "value": navigator.userAgent
      });
      if (document.referrer) payload_serverVariables.push({
        "key": "Referer",
        "value": document.referrer
      });
      if (document.location.protocol === "https:") payload_serverVariables.push({
        "key": "HTTPS",
        "value": 'on'
      });
      if (document.location.hostname) payload_serverVariables.push({
        "key": "Host",
        "value": document.location.hostname
      });
      payload.serverVariables = payload_serverVariables;
      return payload;
    }

    function confirmResponse(status, response) {
      if (settings.debug) {
        if (status === 'error') {
          console.log('%c \u2BC8 Error log: ' + '%c \u2715 Not created ', debugSettings.lightCSS, debugSettings.errorCSS);
        } else if (status === 'success') {
          console.log('%c \u2BC8 Error log: ' + '%c \u2714 ' + response + ' at ' + new Date().toLocaleString() + ' ', debugSettings.lightCSS, debugSettings.successCSS);
        } else {
          console.log('%c \u2BC8 Error log: ' + '%c \u2715 Not created. Title should not be undefined, null or empty ! ', debugSettings.lightCSS, debugSettings.errorCSS);
        }
      }
    }

    function stackGPS(error, xhr, jsonData) {
      var errorStack = error.toString().split("\n")[0];
      var gps = new StackTraceGPS();
      var promise = new Promise(function(resolve) {
        var stackframes = ErrorStackParser.parse(error);
        resolve(Promise.all(stackframes.map(function(sf) {
          return new Promise(function(resolve) {
            function resolveOriginal() {
              resolve(sf);
            }
            gps.pinpoint(sf).then(resolve, resolveOriginal)['catch'](resolveOriginal);
          });
        })));
      }, function(reject) {
        console.log('pula');
      });
      promise.then(function(newFrames) {
        newFrames.forEach(function(stackFrame, i) {
          if (stackFrame.functionName) {
            var fn = stackFrame.functionName + ' ';
          } else {
            var fn = '';
          }
          var stackString = '    at ' + fn + '(' + stackFrame.fileName + ':' + stackFrame.lineNumber + ':' + stackFrame.columnNumber + ')';
          newFrames[i] = stackString;
        });
        newFrames.unshift(errorStack);
        jsonData.detail = newFrames.join("\n");
        xhr.send(JSON.stringify(jsonData));
      });
    }
    var sendPayload = function(apiKey, logId, callback, errorLog) {
      var api_key = apiKey,
        log_id = logId,
        error = errorLog,
        send = 1,
        queryParams = getSearchParameters(),
        stack = error.error ? ErrorStackParser.parse(error.error) : '';
      if ((api_key !== null && log_id !== null) || (paramsLength === 2)) {
        if (params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
          api_key = params['apiKey'];
          log_id = params['logId'];
        }
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.elmah.io/v3/messages/" + log_id + "?api_key=" + api_key, true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onload = function(e) {
          if (xhr.readyState === 4) {
            if (xhr.status === 201) {
              callback('success', xhr.statusText);
            }
          }
        };
        xhr.onerror = function(e) {
          callback('error', xhr.statusText);
          publicAPIs.emit('error', xhr.status, xhr.statusText);
        }
        var jsonData = {
          "detail": error.error ? error.error.stack : null,
          "title": error.message || 'Unspecified error',
          "source": stack && stack.length > 0 ? stack[0].fileName : null,
          "severity": "Error",
          "type": error.error ? error.error.name : null,
          "queryString": JSON.parse(JSON.stringify(queryParams))
        };
        jsonData = merge_objects(jsonData, getPayload());
        if (settings.filter !== null) {
          if (settings.filter(jsonData)) {
            send = 0;
          }
        }
        if (send === 1) {
          publicAPIs.emit('message', jsonData);
          if (error.error && typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1) {
            stackGPS(error.error, xhr, jsonData);
          } else {
            xhr.send(JSON.stringify(jsonData));
          }
        }
      } else {
        return console.log('Login api error');
      }
    };
    var sendManualPayload = function(apiKey, logId, callback, logType, messageLog, errorLog) {
      var api_key = apiKey,
        log_id = logId,
        type = logType,
        error = errorLog,
        message = messageLog,
        send = 1,
        queryParams = getSearchParameters();
      if ((api_key !== null && log_id !== null) || (paramsLength === 2)) {
        if (params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
          api_key = params['apiKey'];
          log_id = params['logId'];
        }
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "https://api.elmah.io/v3/messages/" + log_id + "?api_key=" + api_key, true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.onload = function(e) {
          if (xhr.readyState === 4) {
            if (xhr.status === 201) {
              callback('success', xhr.statusText);
            }
          }
        };
        xhr.onerror = function(e) {
          callback('error', xhr.statusText);
          publicAPIs.emit('error', xhr.status, xhr.statusText);
        }
        if (type !== "Log") {
          var stack = error ? ErrorStackParser.parse(error) : null;
          var jsonData = {
            "title": message,
            "source": stack && stack.length > 0 ? stack[0].fileName : null,
            "detail": error ? error.stack : null,
            "severity": type,
            "type": error ? error.name : null,
            "queryString": JSON.parse(JSON.stringify(queryParams))
          };
          jsonData = merge_objects(jsonData, getPayload());
        } else {
          jsonData = error;
        }
        if (settings.filter !== null) {
          if (settings.filter(jsonData)) {
            send = 0;
          }
        }
        if (send === 1) {
          if (jsonData.title) {
            publicAPIs.emit('message', jsonData);
            if (error && type !== "Log" && typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1) {
              stackGPS(error, xhr, jsonData);
            } else {
              xhr.send(JSON.stringify(jsonData));
            }
          } else {
            callback('missing-title', xhr.statusText);
          }
        }
      } else {
        return console.log('Login api error');
      }
    };
    publicAPIs.error = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Error', msg);
    };
    publicAPIs.error = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Error', msg, error);
    };
    publicAPIs.verbose = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Verbose', msg);
    };
    publicAPIs.verbose = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Verbose', msg, error);
    };
    publicAPIs.debug = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Debug', msg);
    };
    publicAPIs.debug = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Debug', msg, error);
    };
    publicAPIs.information = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Information', msg);
    };
    publicAPIs.information = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Information', msg, error);
    };
    publicAPIs.warning = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Warning', msg);
    };
    publicAPIs.warning = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Warning', msg, error);
    };
    publicAPIs.fatal = function(msg) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Fatal', msg);
    };
    publicAPIs.fatal = function(msg, error) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Fatal', msg, error);
    };
    publicAPIs.log = function(obj) {
      sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Log', null, obj);
    };
    publicAPIs.on = function(name, callback, ctx) {
      var e = this.e || (this.e = {});
      (e[name] || (e[name] = [])).push({
        fn: callback,
        ctx: ctx
      });
      return this;
    };
    publicAPIs.emit = function(name) {
      var data = [].slice.call(arguments, 1);
      var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
      var i = 0;
      var len = evtArr.length;
      for (i; i < len; i++) {
        evtArr[i].fn.apply(evtArr[i].ctx, data);
      }
      return this;
    };
    publicAPIs.init = function(options) {
      settings = extend(defaults, options || {});
      window.onerror = function(message, source, lineno, colno, error) {
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
    publicAPIs.init(options);
    if (settings.debug) {
      console.log('%c' + debugSettings.label, debugSettings.labelCSS);
    }
    return publicAPIs;
  };
  if (paramsLength && params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
    return new Constructor;
  } else {
    return Constructor;
  }
});
//# sourceMappingURL=elmahio.js.map
