/*!
 * elmah.io Javascript Logger - version 4.1.0
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
    // ==== STACKFRAME ====
    //

    var StackFrame = (function () {
        "use strict";
        function _isNumber(n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
        function _capitalize(str) {
            return str.charAt(0).toUpperCase() + str.substring(1);
        }
        function _getter(p) {
            return function () {
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
            getArgs: function () {
                return this.args;
            },
            setArgs: function (v) {
                if (Object.prototype.toString.call(v) !== "[object Array]") {
                    throw new TypeError("Args must be an Array");
                }
                this.args = v;
            },
            getEvalOrigin: function () {
                return this.evalOrigin;
            },
            setEvalOrigin: function (v) {
                if (v instanceof StackFrame) {
                    this.evalOrigin = v;
                } else if (v instanceof Object) {
                    this.evalOrigin = new StackFrame(v);
                } else {
                    throw new TypeError("Eval Origin must be an Object or StackFrame");
                }
            },
            toString: function () {
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
            StackFrame.prototype["set" + _capitalize(booleanProps[i])] = function (p) {
                return function (v) {
                    this[p] = Boolean(v);
                };
            }(booleanProps[i]);
        }
        for (var j = 0; j < numericProps.length; j++) {
            StackFrame.prototype["get" + _capitalize(numericProps[j])] = _getter(numericProps[j]);
            StackFrame.prototype["set" + _capitalize(numericProps[j])] = function (p) {
                return function (v) {
                    if (!_isNumber(v)) {
                        throw new TypeError(p + " must be a Number");
                    }
                    this[p] = Number(v);
                };
            }(numericProps[j]);
        }
        for (var k = 0; k < stringProps.length; k++) {
            StackFrame.prototype["get" + _capitalize(stringProps[k])] = _getter(stringProps[k]);
            StackFrame.prototype["set" + _capitalize(stringProps[k])] = function (p) {
                return function (v) {
                    this[p] = String(v);
                };
            }(stringProps[k]);
        }
        return StackFrame;
    })();

    //
    // ==== ERROR STACK PARSER ====
    //

    var ErrorStackParser = (function () {
        'use strict';
        var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+:\d+/;
        var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+:\d+|\(native\))/m;
        var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code])?$/;

        return {
            /**
             * Given an Error object, extract the most information from it.
             *
             * @param {Error} error object
             * @return {Array} of StackFrames
             */
            parse: function ErrorStackParser$$parse(error) {
                if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
                    return this.parseOpera(error);
                } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
                    return this.parseV8OrIE(error);
                } else if (error.stack) {
                    return this.parseFFOrSafari(error);
                } else {
                    throw new Error('Cannot parse given Error object');
                }
            },
            // Separate line and column numbers from a string of the form: (URI:Line:Column)
            extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
                // Fail-fast but return locations like "(native)"
                if (urlLike.indexOf(':') === -1) {
                    return [urlLike];
                }
                var regExp = /(.+?)(?::(\d+))?(?::(\d+))?$/;
                var parts = regExp.exec(urlLike.replace(/[()]/g, ''));
                return [parts[1], parts[2] || undefined, parts[3] || undefined];
            },
            parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
                var filtered = error.stack.split('\n').filter(function(line) {
                    return !!line.match(CHROME_IE_STACK_REGEXP);
                }, this);
                return filtered.map(function(line) {
                    if (line.indexOf('(eval ') > -1) {
                        // Throw away eval information until we implement stacktrace.js/stackframe#8
                        line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^()]*)|(,.*$)/g, '');
                    }
                    var sanitizedLine = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').replace(/^.*?\s+/, '');
                    // capture and preseve the parenthesized location "(/foo/my bar.js:12:87)" in
                    // case it has spaces in it, as the string is split on \s+ later on
                    var location = sanitizedLine.match(/ (\(.+\)$)/);
                    // remove the parenthesized location from the line, if it was matched
                    sanitizedLine = location ? sanitizedLine.replace(location[0], '') : sanitizedLine;
                    // if a location was matched, pass it to extractLocation() otherwise pass all sanitizedLine
                    // because this line doesn't have function name
                    var locationParts = this.extractLocation(location ? location[1] : sanitizedLine);
                    var functionName = location && sanitizedLine || undefined;
                    var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];
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
                var filtered = error.stack.split('\n').filter(function(line) {
                    return !line.match(SAFARI_NATIVE_CODE_REGEXP);
                }, this);
                return filtered.map(function(line) {
                    // Throw away eval information until we implement stacktrace.js/stackframe#8
                    if (line.indexOf(' > eval') > -1) {
                        line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval:\d+:\d+/g, ':$1');
                    }
                    if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
                        // Safari eval frames only have function names and nothing else
                        return new StackFrame({
                            functionName: line
                        });
                    } else {
                        var functionNameRegex = /((.*".+"[^@]*)?[^@]*)(?:@)/;
                        var matches = line.match(functionNameRegex);
                        var functionName = matches && matches[1] ? matches[1] : undefined;
                        var locationParts = this.extractLocation(line.replace(functionNameRegex, ''));
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
                var lines = e.stacktrace.split('\n');
                var result = [];
                for (var i = 0, len = lines.length; i < len; i += 2) {
                    var match = lineRE.exec(lines[i]);
                    if (match) {
                        result.push(
                            new StackFrame({
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
                var filtered = error.stack.split('\n').filter(function(line) {
                    return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
                }, this);
                return filtered.map(function(line) {
                    var tokens = line.split('@');
                    var locationParts = this.extractLocation(tokens.pop());
                    var functionCall = (tokens.shift() || '');
                    var functionName = functionCall
                        .replace(/<anonymous function(: (\w+))?>/, '$2')
                        .replace(/\([^)]*\)/g, '') || undefined;
                    var argsRaw;
                    if (functionCall.match(/\(([^)]*)\)/)) {
                        argsRaw = functionCall.replace(/^[^(]+\(([^)]*)\)$/, '$1');
                    }
                    var args = (argsRaw === undefined || argsRaw === '[arguments not available]') ?
                        undefined : argsRaw.split(',');

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

    //
    // ==== STACKTRACE-GPS ====
    //

    var SourceMap = function(e){var n={};function r(t){if(n[t])return n[t].exports;var o=n[t]={exports:{},id:t,loaded:!1};return e[t].call(o.exports,o,o.exports,r),o.loaded=!0,o.exports}return r.m=e,r.c=n,r.p="",r(0)}([function(e,n,r){var t=r(1),o=r(2),i=r(3).ArraySet,a=r(4),s=r(6).quickSort;function u(e){var n=e;return"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,""))),null!=n.sections?new c(n):new l(n)}function l(e){var n=e;"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,"")));var r=t.getArg(n,"version"),o=t.getArg(n,"sources"),a=t.getArg(n,"names",[]),s=t.getArg(n,"sourceRoot",null),u=t.getArg(n,"sourcesContent",null),l=t.getArg(n,"mappings"),g=t.getArg(n,"file",null);if(r!=this._version)throw new Error("Unsupported version: "+r);o=o.map(String).map(t.normalize).map(function(e){return s&&t.isAbsolute(s)&&t.isAbsolute(e)?t.relative(s,e):e}),this._names=i.fromArray(a.map(String),!0),this._sources=i.fromArray(o,!0),this.sourceRoot=s,this.sourcesContent=u,this._mappings=l,this.file=g}function g(){this.generatedLine=0,this.generatedColumn=0,this.source=null,this.originalLine=null,this.originalColumn=null,this.name=null}function c(e){var n=e;"string"==typeof e&&(n=JSON.parse(e.replace(/^\)\]\}'/,"")));var r=t.getArg(n,"version"),o=t.getArg(n,"sections");if(r!=this._version)throw new Error("Unsupported version: "+r);this._sources=new i,this._names=new i;var a={line:-1,column:0};this._sections=o.map(function(e){if(e.url)throw new Error("Support for url field in sections not implemented.");var n=t.getArg(e,"offset"),r=t.getArg(n,"line"),o=t.getArg(n,"column");if(r<a.line||r===a.line&&o<a.column)throw new Error("Section offsets must be ordered and non-overlapping.");return a=n,{generatedOffset:{generatedLine:r+1,generatedColumn:o+1},consumer:new u(t.getArg(e,"map"))}})}u.fromSourceMap=function(e){return l.fromSourceMap(e)},u.prototype._version=3,u.prototype.__generatedMappings=null,Object.defineProperty(u.prototype,"_generatedMappings",{get:function(){return this.__generatedMappings||this._parseMappings(this._mappings,this.sourceRoot),this.__generatedMappings}}),u.prototype.__originalMappings=null,Object.defineProperty(u.prototype,"_originalMappings",{get:function(){return this.__originalMappings||this._parseMappings(this._mappings,this.sourceRoot),this.__originalMappings}}),u.prototype._charIsMappingSeparator=function(e,n){var r=e.charAt(n);return";"===r||","===r},u.prototype._parseMappings=function(e,n){throw new Error("Subclasses must implement _parseMappings")},u.GENERATED_ORDER=1,u.ORIGINAL_ORDER=2,u.GREATEST_LOWER_BOUND=1,u.LEAST_UPPER_BOUND=2,u.prototype.eachMapping=function(e,n,r){var o,i=n||null;switch(r||u.GENERATED_ORDER){case u.GENERATED_ORDER:o=this._generatedMappings;break;case u.ORIGINAL_ORDER:o=this._originalMappings;break;default:throw new Error("Unknown order of iteration.")}var a=this.sourceRoot;o.map(function(e){var n=null===e.source?null:this._sources.at(e.source);return null!=n&&null!=a&&(n=t.join(a,n)),{source:n,generatedLine:e.generatedLine,generatedColumn:e.generatedColumn,originalLine:e.originalLine,originalColumn:e.originalColumn,name:null===e.name?null:this._names.at(e.name)}},this).forEach(e,i)},u.prototype.allGeneratedPositionsFor=function(e){var n=t.getArg(e,"line"),r={source:t.getArg(e,"source"),originalLine:n,originalColumn:t.getArg(e,"column",0)};if(null!=this.sourceRoot&&(r.source=t.relative(this.sourceRoot,r.source)),!this._sources.has(r.source))return[];r.source=this._sources.indexOf(r.source);var i=[],a=this._findMapping(r,this._originalMappings,"originalLine","originalColumn",t.compareByOriginalPositions,o.LEAST_UPPER_BOUND);if(a>=0){var s=this._originalMappings[a];if(void 0===e.column)for(var u=s.originalLine;s&&s.originalLine===u;)i.push({line:t.getArg(s,"generatedLine",null),column:t.getArg(s,"generatedColumn",null),lastColumn:t.getArg(s,"lastGeneratedColumn",null)}),s=this._originalMappings[++a];else for(var l=s.originalColumn;s&&s.originalLine===n&&s.originalColumn==l;)i.push({line:t.getArg(s,"generatedLine",null),column:t.getArg(s,"generatedColumn",null),lastColumn:t.getArg(s,"lastGeneratedColumn",null)}),s=this._originalMappings[++a]}return i},n.SourceMapConsumer=u,l.prototype=Object.create(u.prototype),l.prototype.consumer=u,l.fromSourceMap=function(e){var n=Object.create(l.prototype),r=n._names=i.fromArray(e._names.toArray(),!0),o=n._sources=i.fromArray(e._sources.toArray(),!0);n.sourceRoot=e._sourceRoot,n.sourcesContent=e._generateSourcesContent(n._sources.toArray(),n.sourceRoot),n.file=e._file;for(var a=e._mappings.toArray().slice(),u=n.__generatedMappings=[],c=n.__originalMappings=[],p=0,h=a.length;p<h;p++){var f=a[p],d=new g;d.generatedLine=f.generatedLine,d.generatedColumn=f.generatedColumn,f.source&&(d.source=o.indexOf(f.source),d.originalLine=f.originalLine,d.originalColumn=f.originalColumn,f.name&&(d.name=r.indexOf(f.name)),c.push(d)),u.push(d)}return s(n.__originalMappings,t.compareByOriginalPositions),n},l.prototype._version=3,Object.defineProperty(l.prototype,"sources",{get:function(){return this._sources.toArray().map(function(e){return null!=this.sourceRoot?t.join(this.sourceRoot,e):e},this)}}),l.prototype._parseMappings=function(e,n){for(var r,o,i,u,l,c=1,p=0,h=0,f=0,d=0,m=0,_=e.length,v=0,C={},A={},y=[],L=[];v<_;)if(";"===e.charAt(v))c++,v++,p=0;else if(","===e.charAt(v))v++;else{for((r=new g).generatedLine=c,u=v;u<_&&!this._charIsMappingSeparator(e,u);u++);if(i=C[o=e.slice(v,u)])v+=o.length;else{for(i=[];v<u;)a.decode(e,v,A),l=A.value,v=A.rest,i.push(l);if(2===i.length)throw new Error("Found a source, but no line and column");if(3===i.length)throw new Error("Found a source and line, but no column");C[o]=i}r.generatedColumn=p+i[0],p=r.generatedColumn,i.length>1&&(r.source=d+i[1],d+=i[1],r.originalLine=h+i[2],h=r.originalLine,r.originalLine+=1,r.originalColumn=f+i[3],f=r.originalColumn,i.length>4&&(r.name=m+i[4],m+=i[4])),L.push(r),"number"==typeof r.originalLine&&y.push(r)}s(L,t.compareByGeneratedPositionsDeflated),this.__generatedMappings=L,s(y,t.compareByOriginalPositions),this.__originalMappings=y},l.prototype._findMapping=function(e,n,r,t,i,a){if(e[r]<=0)throw new TypeError("Line must be greater than or equal to 1, got "+e[r]);if(e[t]<0)throw new TypeError("Column must be greater than or equal to 0, got "+e[t]);return o.search(e,n,i,a)},l.prototype.computeColumnSpans=function(){for(var e=0;e<this._generatedMappings.length;++e){var n=this._generatedMappings[e];if(e+1<this._generatedMappings.length){var r=this._generatedMappings[e+1];if(n.generatedLine===r.generatedLine){n.lastGeneratedColumn=r.generatedColumn-1;continue}}n.lastGeneratedColumn=1/0}},l.prototype.originalPositionFor=function(e){var n={generatedLine:t.getArg(e,"line"),generatedColumn:t.getArg(e,"column")},r=this._findMapping(n,this._generatedMappings,"generatedLine","generatedColumn",t.compareByGeneratedPositionsDeflated,t.getArg(e,"bias",u.GREATEST_LOWER_BOUND));if(r>=0){var o=this._generatedMappings[r];if(o.generatedLine===n.generatedLine){var i=t.getArg(o,"source",null);null!==i&&(i=this._sources.at(i),null!=this.sourceRoot&&(i=t.join(this.sourceRoot,i)));var a=t.getArg(o,"name",null);return null!==a&&(a=this._names.at(a)),{source:i,line:t.getArg(o,"originalLine",null),column:t.getArg(o,"originalColumn",null),name:a}}}return{source:null,line:null,column:null,name:null}},l.prototype.hasContentsOfAllSources=function(){return!!this.sourcesContent&&(this.sourcesContent.length>=this._sources.size()&&!this.sourcesContent.some(function(e){return null==e}))},l.prototype.sourceContentFor=function(e,n){if(!this.sourcesContent)return null;if(null!=this.sourceRoot&&(e=t.relative(this.sourceRoot,e)),this._sources.has(e))return this.sourcesContent[this._sources.indexOf(e)];var r;if(null!=this.sourceRoot&&(r=t.urlParse(this.sourceRoot))){var o=e.replace(/^file:\/\//,"");if("file"==r.scheme&&this._sources.has(o))return this.sourcesContent[this._sources.indexOf(o)];if((!r.path||"/"==r.path)&&this._sources.has("/"+e))return this.sourcesContent[this._sources.indexOf("/"+e)]}if(n)return null;throw new Error('"'+e+'" is not in the SourceMap.')},l.prototype.generatedPositionFor=function(e){var n=t.getArg(e,"source");if(null!=this.sourceRoot&&(n=t.relative(this.sourceRoot,n)),!this._sources.has(n))return{line:null,column:null,lastColumn:null};var r={source:n=this._sources.indexOf(n),originalLine:t.getArg(e,"line"),originalColumn:t.getArg(e,"column")},o=this._findMapping(r,this._originalMappings,"originalLine","originalColumn",t.compareByOriginalPositions,t.getArg(e,"bias",u.GREATEST_LOWER_BOUND));if(o>=0){var i=this._originalMappings[o];if(i.source===r.source)return{line:t.getArg(i,"generatedLine",null),column:t.getArg(i,"generatedColumn",null),lastColumn:t.getArg(i,"lastGeneratedColumn",null)}}return{line:null,column:null,lastColumn:null}},n.BasicSourceMapConsumer=l,c.prototype=Object.create(u.prototype),c.prototype.constructor=u,c.prototype._version=3,Object.defineProperty(c.prototype,"sources",{get:function(){for(var e=[],n=0;n<this._sections.length;n++)for(var r=0;r<this._sections[n].consumer.sources.length;r++)e.push(this._sections[n].consumer.sources[r]);return e}}),c.prototype.originalPositionFor=function(e){var n={generatedLine:t.getArg(e,"line"),generatedColumn:t.getArg(e,"column")},r=o.search(n,this._sections,function(e,n){var r=e.generatedLine-n.generatedOffset.generatedLine;return r||e.generatedColumn-n.generatedOffset.generatedColumn}),i=this._sections[r];return i?i.consumer.originalPositionFor({line:n.generatedLine-(i.generatedOffset.generatedLine-1),column:n.generatedColumn-(i.generatedOffset.generatedLine===n.generatedLine?i.generatedOffset.generatedColumn-1:0),bias:e.bias}):{source:null,line:null,column:null,name:null}},c.prototype.hasContentsOfAllSources=function(){return this._sections.every(function(e){return e.consumer.hasContentsOfAllSources()})},c.prototype.sourceContentFor=function(e,n){for(var r=0;r<this._sections.length;r++){var t=this._sections[r].consumer.sourceContentFor(e,!0);if(t)return t}if(n)return null;throw new Error('"'+e+'" is not in the SourceMap.')},c.prototype.generatedPositionFor=function(e){for(var n=0;n<this._sections.length;n++){var r=this._sections[n];if(-1!==r.consumer.sources.indexOf(t.getArg(e,"source"))){var o=r.consumer.generatedPositionFor(e);if(o)return{line:o.line+(r.generatedOffset.generatedLine-1),column:o.column+(r.generatedOffset.generatedLine===o.line?r.generatedOffset.generatedColumn-1:0)}}}return{line:null,column:null}},c.prototype._parseMappings=function(e,n){this.__generatedMappings=[],this.__originalMappings=[];for(var r=0;r<this._sections.length;r++)for(var o=this._sections[r],i=o.consumer._generatedMappings,a=0;a<i.length;a++){var u=i[a],l=o.consumer._sources.at(u.source);null!==o.consumer.sourceRoot&&(l=t.join(o.consumer.sourceRoot,l)),this._sources.add(l),l=this._sources.indexOf(l);var g=o.consumer._names.at(u.name);this._names.add(g),g=this._names.indexOf(g);var c={source:l,generatedLine:u.generatedLine+(o.generatedOffset.generatedLine-1),generatedColumn:u.generatedColumn+(o.generatedOffset.generatedLine===u.generatedLine?o.generatedOffset.generatedColumn-1:0),originalLine:u.originalLine,originalColumn:u.originalColumn,name:g};this.__generatedMappings.push(c),"number"==typeof c.originalLine&&this.__originalMappings.push(c)}s(this.__generatedMappings,t.compareByGeneratedPositionsDeflated),s(this.__originalMappings,t.compareByOriginalPositions)},n.IndexedSourceMapConsumer=c},function(e,n){n.getArg=function(e,n,r){if(n in e)return e[n];if(3===arguments.length)return r;throw new Error('"'+n+'" is a required argument.')};var r=/^(?:([\w+\-.]+):)?\/\/(?:(\w+:\w+)@)?([\w.]*)(?::(\d+))?(\S*)$/,t=/^data:.+\,.+$/;function o(e){var n=e.match(r);return n?{scheme:n[1],auth:n[2],host:n[3],port:n[4],path:n[5]}:null}function i(e){var n="";return e.scheme&&(n+=e.scheme+":"),n+="//",e.auth&&(n+=e.auth+"@"),e.host&&(n+=e.host),e.port&&(n+=":"+e.port),e.path&&(n+=e.path),n}function a(e){var r=e,t=o(e);if(t){if(!t.path)return e;r=t.path}for(var a,s=n.isAbsolute(r),u=r.split(/\/+/),l=0,g=u.length-1;g>=0;g--)"."===(a=u[g])?u.splice(g,1):".."===a?l++:l>0&&(""===a?(u.splice(g+1,l),l=0):(u.splice(g,2),l--));return""===(r=u.join("/"))&&(r=s?"/":"."),t?(t.path=r,i(t)):r}n.urlParse=o,n.urlGenerate=i,n.normalize=a,n.join=function(e,n){""===e&&(e="."),""===n&&(n=".");var r=o(n),s=o(e);if(s&&(e=s.path||"/"),r&&!r.scheme)return s&&(r.scheme=s.scheme),i(r);if(r||n.match(t))return n;if(s&&!s.host&&!s.path)return s.host=n,i(s);var u="/"===n.charAt(0)?n:a(e.replace(/\/+$/,"")+"/"+n);return s?(s.path=u,i(s)):u},n.isAbsolute=function(e){return"/"===e.charAt(0)||!!e.match(r)},n.relative=function(e,n){""===e&&(e="."),e=e.replace(/\/$/,"");for(var r=0;0!==n.indexOf(e+"/");){var t=e.lastIndexOf("/");if(t<0)return n;if((e=e.slice(0,t)).match(/^([^\/]+:\/)?\/*$/))return n;++r}return Array(r+1).join("../")+n.substr(e.length+1)};var s=!("__proto__"in Object.create(null));function u(e){return e}function l(e){if(!e)return!1;var n=e.length;if(n<9)return!1;if(95!==e.charCodeAt(n-1)||95!==e.charCodeAt(n-2)||111!==e.charCodeAt(n-3)||116!==e.charCodeAt(n-4)||111!==e.charCodeAt(n-5)||114!==e.charCodeAt(n-6)||112!==e.charCodeAt(n-7)||95!==e.charCodeAt(n-8)||95!==e.charCodeAt(n-9))return!1;for(var r=n-10;r>=0;r--)if(36!==e.charCodeAt(r))return!1;return!0}function g(e,n){return e===n?0:e>n?1:-1}n.toSetString=s?u:function(e){return l(e)?"$"+e:e},n.fromSetString=s?u:function(e){return l(e)?e.slice(1):e},n.compareByOriginalPositions=function(e,n,r){var t=e.source-n.source;return 0!==t?t:0!=(t=e.originalLine-n.originalLine)?t:0!=(t=e.originalColumn-n.originalColumn)||r?t:0!=(t=e.generatedColumn-n.generatedColumn)?t:0!=(t=e.generatedLine-n.generatedLine)?t:e.name-n.name},n.compareByGeneratedPositionsDeflated=function(e,n,r){var t=e.generatedLine-n.generatedLine;return 0!==t?t:0!=(t=e.generatedColumn-n.generatedColumn)||r?t:0!=(t=e.source-n.source)?t:0!=(t=e.originalLine-n.originalLine)?t:0!=(t=e.originalColumn-n.originalColumn)?t:e.name-n.name},n.compareByGeneratedPositionsInflated=function(e,n){var r=e.generatedLine-n.generatedLine;return 0!==r?r:0!=(r=e.generatedColumn-n.generatedColumn)?r:0!==(r=g(e.source,n.source))?r:0!=(r=e.originalLine-n.originalLine)?r:0!=(r=e.originalColumn-n.originalColumn)?r:g(e.name,n.name)}},function(e,n){n.GREATEST_LOWER_BOUND=1,n.LEAST_UPPER_BOUND=2,n.search=function(e,r,t,o){if(0===r.length)return-1;var i=function e(r,t,o,i,a,s){var u=Math.floor((t-r)/2)+r,l=a(o,i[u],!0);return 0===l?u:l>0?t-u>1?e(u,t,o,i,a,s):s==n.LEAST_UPPER_BOUND?t<i.length?t:-1:u:u-r>1?e(r,u,o,i,a,s):s==n.LEAST_UPPER_BOUND?u:r<0?-1:r}(-1,r.length,e,r,t,o||n.GREATEST_LOWER_BOUND);if(i<0)return-1;for(;i-1>=0&&0===t(r[i],r[i-1],!0);)--i;return i}},function(e,n,r){var t=r(1),o=Object.prototype.hasOwnProperty;function i(){this._array=[],this._set=Object.create(null)}i.fromArray=function(e,n){for(var r=new i,t=0,o=e.length;t<o;t++)r.add(e[t],n);return r},i.prototype.size=function(){return Object.getOwnPropertyNames(this._set).length},i.prototype.add=function(e,n){var r=t.toSetString(e),i=o.call(this._set,r),a=this._array.length;i&&!n||this._array.push(e),i||(this._set[r]=a)},i.prototype.has=function(e){var n=t.toSetString(e);return o.call(this._set,n)},i.prototype.indexOf=function(e){var n=t.toSetString(e);if(o.call(this._set,n))return this._set[n];throw new Error('"'+e+'" is not in the set.')},i.prototype.at=function(e){if(e>=0&&e<this._array.length)return this._array[e];throw new Error("No element indexed by "+e)},i.prototype.toArray=function(){return this._array.slice()},n.ArraySet=i},function(e,n,r){var t=r(5);n.encode=function(e){var n,r,o="",i=(r=e)<0?1+(-r<<1):0+(r<<1);do{n=31&i,(i>>>=5)>0&&(n|=32),o+=t.encode(n)}while(i>0);return o},n.decode=function(e,n,r){var o,i,a,s,u=e.length,l=0,g=0;do{if(n>=u)throw new Error("Expected more digits in base 64 VLQ value.");if(-1===(i=t.decode(e.charCodeAt(n++))))throw new Error("Invalid base64 digit: "+e.charAt(n-1));o=!!(32&i),l+=(i&=31)<<g,g+=5}while(o);r.value=(s=(a=l)>>1,1==(1&a)?-s:s),r.rest=n}},function(e,n){var r="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("");n.encode=function(e){if(0<=e&&e<r.length)return r[e];throw new TypeError("Must be between 0 and 63: "+e)},n.decode=function(e){return 65<=e&&e<=90?e-65:97<=e&&e<=122?e-97+26:48<=e&&e<=57?e-48+52:43==e?62:47==e?63:-1}},function(e,n){function r(e,n,r){var t=e[n];e[n]=e[r],e[r]=t}function t(e,n,o,i){if(o<i){var a=o-1;r(e,(g=o,c=i,Math.round(g+Math.random()*(c-g))),i);for(var s=e[i],u=o;u<i;u++)n(e[u],s)<=0&&r(e,a+=1,u);r(e,a+1,u);var l=a+1;t(e,n,o,l-1),t(e,n,l+1,i)}var g,c}n.quickSort=function(e,n){t(e,n,0,e.length-1)}}]);

    var StackTraceGPS = (function (SourceMap, StackFrame) {
        "use strict";
        /**
           * Make a X-Domain request to url and callback.
           *
           * @param {String} url
           * @returns {Promise} with response text if fulfilled
           */

        function _xdr(url) {
            return new Promise(function (resolve, reject) {
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
        /**
           * Convert a Base64-encoded string into its original representation.
           * Used for inline sourcemaps.
           *
           * @param {String} b64str Base-64 encoded string
           * @returns {String} original representation of the base64-encoded string.
           */
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
            var syntaxes = [ // {name} = function ({args}) TODO args capture
                /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*function\b/, // function {name}({args}) m[1]=name m[2]=args
                /function\s+([^('"`]*?)\s*\(([^)]*)\)/, // {name} = eval()
                /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*(?:eval|new Function)\b/, // fn_name() {
                /\b(?!(?:if|for|switch|while|with|catch)\b)(?:(?:static)\s+)?(\S+)\s*\(.*?\)\s*\{/, // {name} = () => {
                /['"]?([$_A-Za-z][$_A-Za-z0-9]*)['"]?\s*[:=]\s*\(.*?\)\s*=>/];
            var lines = source.split("\n");
            // Walk backwards in the source lines until we find the line which matches one of the patterns above
            var code = "";
            var maxLines = Math.min(lineNumber, 20);
            for (var i = 0; i < maxLines; ++i) {
                // lineNo is 1-based, source[] is 0-based
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
                // jshint ignore:line
                lastSourceMappingUrl = matchSourceMappingUrl[1];
            }
            if (lastSourceMappingUrl) {
                return lastSourceMappingUrl;
            } else {
                throw new Error("sourceMappingURL not found");
            }
        }
        function _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache) {
            return new Promise(function (resolve, reject) {
                var loc = sourceMapConsumer.originalPositionFor({
                    line: stackframe.lineNumber,
                    column: stackframe.columnNumber
                });
                if (loc.source) {
                    // cache mapped sources
                    var mappedSource = sourceMapConsumer.sourceContentFor(loc.source);
                    if (mappedSource) {
                        sourceCache[loc.source] = mappedSource;
                    }
                    resolve(// given stackframe and source location, update stackframe
                        new StackFrame({
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
        /**
           * @constructor
           * @param {Object} opts
           *      opts.sourceCache = {url: "Source String"} => preload source cache
           *      opts.sourceMapConsumerCache = {/path/file.js.map: SourceMapConsumer}
           *      opts.offline = True to prevent network requests.
           *              Best effort without sources or source maps.
           *      opts.ajax = Promise returning function to make X-Domain requests
           */
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
                return new Promise(function (resolve, reject) {
                    var isDataUrl = location.substr(0, 5) === "data:";
                    if (this.sourceCache[location]) {
                        resolve(this.sourceCache[location]);
                    } else if (opts.offline && !isDataUrl) {
                        reject(new Error("Cannot make network requests in offline mode"));
                    } else {
                        if (isDataUrl) {
                            // data URLs can have parameters.
                            // see http://tools.ietf.org/html/rfc2397
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
                            // Cache the Promise to prevent duplicate in-flight requests
                            this.sourceCache[location] = xhrPromise;
                            xhrPromise.then(resolve, reject);
                        }
                    }
                }.bind(this));
            };
            /**
                 * Creating SourceMapConsumers is expensive, so this wraps the creation of a
                 * SourceMapConsumer in a per-instance cache.
                 *
                 * @param {String} sourceMappingURL = URL to fetch source map from
                 * @param {String} defaultSourceRoot = Default source root for source map if undefined
                 * @returns {Promise} that resolves a SourceMapConsumer
                 */
            this._getSourceMapConsumer = function _getSourceMapConsumer(sourceMappingURL, defaultSourceRoot) {
                return new Promise(function (resolve, reject) {
                    if (this.sourceMapConsumerCache[sourceMappingURL]) {
                        resolve(this.sourceMapConsumerCache[sourceMappingURL]);
                    } else {
                        var sourceMapConsumerPromise = new Promise(function (resolve, reject) {
                            return this._get(sourceMappingURL).then(function (sourceMapSource) {
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
            /**
                 * Given a StackFrame, enhance function name and use source maps for a
                 * better StackFrame.
                 *
                 * @param {StackFrame} stackframe object
                 * @returns {Promise} that resolves with with source-mapped StackFrame
                 */
            this.pinpoint = function StackTraceGPS$$pinpoint(stackframe) {
                return new Promise(function (resolve, reject) {
                    this.getMappedLocation(stackframe).then(function (mappedStackFrame) {
                        function resolveMappedStackFrame() {
                            resolve(mappedStackFrame);
                        }
                        this.findFunctionName(mappedStackFrame).then(resolve, resolveMappedStackFrame)["catch"](resolveMappedStackFrame);
                    }.bind(this), reject);
                }.bind(this));
            };
            /**
                 * Given a StackFrame, guess function name from location information.
                 *
                 * @param {StackFrame} stackframe
                 * @returns {Promise} that resolves with enhanced StackFrame.
                 */
            this.findFunctionName = function StackTraceGPS$$findFunctionName(stackframe) {
                return new Promise(function (resolve, reject) {
                    _ensureStackFrameIsLegit(stackframe);
                    this._get(stackframe.fileName).then(function getSourceCallback(source) {
                        var lineNumber = stackframe.lineNumber;
                        var columnNumber = stackframe.columnNumber;
                        var guessedFunctionName = _findFunctionName(source, lineNumber, columnNumber);
                        // Only replace functionName if we found something
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
            /**
                 * Given a StackFrame, seek source-mapped location and return new enhanced StackFrame.
                 *
                 * @param {StackFrame} stackframe
                 * @returns {Promise} that resolves with enhanced StackFrame.
                 */
            this.getMappedLocation = function StackTraceGPS$$getMappedLocation(stackframe) {
                return new Promise(function (resolve, reject) {
                    _ensureSupportedEnvironment();
                    _ensureStackFrameIsLegit(stackframe);
                    var sourceCache = this.sourceCache;
                    var fileName = stackframe.fileName;
                    this._get(fileName).then(function (source) {
                        var sourceMappingURL = _findSourceMappingURL(source);
                        var isDataUrl = sourceMappingURL.substr(0, 5) === "data:";
                        var defaultSourceRoot = fileName.substring(0, fileName.lastIndexOf("/") + 1);
                        if (sourceMappingURL[0] !== "/" && !isDataUrl && !/^https?:\/\/|^\/\//i.test(sourceMappingURL)) {
                            sourceMappingURL = defaultSourceRoot + sourceMappingURL;
                        }
                        return this._getSourceMapConsumer(sourceMappingURL, defaultSourceRoot).then(function (sourceMapConsumer) {
                            return _extractLocationInfoFromSourceMapSource(stackframe, sourceMapConsumer, sourceCache).then(resolve)["catch"](function () {
                                resolve(stackframe);
                            });
                        });
                    }.bind(this), reject)["catch"](reject);
                }.bind(this));
            };
        };
    })(SourceMap, StackFrame);

    //
    // Shared Variables
    //

    var myScript = null;
    var scriptFile = document.getElementsByTagName('script');
    
    for (var i = 0; i < scriptFile.length; ++i) {
        if(isMe(scriptFile[i])) {
            myScript = scriptFile[i];
        }
    }

    var queryString = myScript != null ? myScript.src.replace(/^[^\?]+\??/, '') : null;
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
        filter: null,
        captureConsoleMinimumLevel: 'none',
        breadcrumbs: false,
        breadcrumbsNumber: 10
    };

    var breadcrumbsDelay = 100;

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

    function isMe(scriptElem){
        if(scriptElem.getAttribute('src') != null) {
            return scriptElem.getAttribute('src').indexOf('elmahio') != -1 && scriptElem.getAttribute('src').indexOf('apiKey') != -1 && scriptElem.getAttribute('src').indexOf('logId') != -1;
        }
    }

    function isInt(n){
        return Number(n) === n && n % 1 === 0;
    }

    function isFloat(n){
        return Number(n) === n && n % 1 !== 0;
    }

    function parseQuery(query) {
        var Params = new Object();
        if (!query) return Params; // return empty object
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
        var size = 0, key;
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

    function isString(what) {
        return Object.prototype.toString.call(what) === '[object String]';
    }

    function cssSelectorString(elem) {
        var MAX_TRAVERSE_HEIGHT = 5,
            MAX_OUTPUT_LEN = 80,
            out = [],
            height = 0,
            len = 0,
            separator = ' > ',
            sepLength = separator.length,
            nextStr;
        while (elem && height++ < MAX_TRAVERSE_HEIGHT) {
            nextStr = htmlElementAsString(elem);
            if (nextStr === 'html' || (height > 1 && len + out.length * sepLength + nextStr.length >= MAX_OUTPUT_LEN)) {
                break;
            }
            out.push(nextStr);
            len += nextStr.length;
            elem = elem.parentNode;
        }
        return out.reverse().join(separator);
    }
      
    function htmlElementAsString(elem) {
        var out = [], className, classes, key, attr, i;
        if (!elem || !elem.tagName) {
            return '';
        }
        out.push(elem.tagName.toLowerCase());
        if (elem.id) {
            out.push('#' + elem.id);
        }
        className = elem.className;
        if (className && isString(className)) {
            classes = className.split(/\s+/);
            for (i = 0; i < classes.length; i++) {
                out.push('.' + classes[i]);
            }
        }
        var attrWhitelist = ['type', 'name', 'title', 'alt'];
        for (i = 0; i < attrWhitelist.length; i++) {
            key = attrWhitelist[i];
            attr = elem.getAttribute(key);
            if (attr) {
                out.push('[' + key + '="' + attr + '"]');
            }
        }
        return out.join('');
    }

    var parseHash = function(url) {
        return url.split('#')[1] || '';
    };

    //
    // Constructor
    //

    var Constructor = function (options) {

        //
        // Variables
        //

        var publicAPIs = {};
        var settings;
        var breadcrumbs = [];
        var lastHref = window.location && window.location.href;

        function getPayload() {
            var payload = {
                "url": document.location.pathname || '/',
                "application": settings.application
            };

            var payload_data = [];

            if (document.documentMode) payload_data.push({ "key": "Document-Mode", "value": document.documentMode });
            if (window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth) payload_data.push({ "key": "Browser-Width", "value": window.innerWidth || document.documentElement.clientWidth || document.getElementsByTagName('body')[0].clientWidth });
            if (window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight) payload_data.push({ "key": "Browser-Height", "value": window.innerHeight || document.documentElement.clientHeight || document.getElementsByTagName('body')[0].clientHeight });
            if ((screen.msOrientation || (screen.orientation || screen.mozOrientation || {}).type) !== undefined) payload_data.push({ "key": "Screen-Orientation", "value": ((screen.msOrientation || (screen.orientation || screen.mozOrientation || {}).type).split("-"))[0] });
            if (screen.width) payload_data.push({ "key": "Screen-Width", "value": screen.width });
            if (screen.height) payload_data.push({ "key": "Screen-Height", "value": screen.height });
            if (screen.colorDepth) payload_data.push({ "key": "Color-Depth", "value": screen.colorDepth });
            payload_data.push({ "key": "X-ELMAHIO-SEARCH-isClientside", "value": "true" });

            payload.data = payload_data;

            var payload_serverVariables = [];
            if (navigator.language) payload_serverVariables.push({ "key": "User-Language", "value": navigator.language });
            if (navigator.userAgent) payload_serverVariables.push({ "key": "User-Agent", "value": navigator.userAgent });
            if (document.referrer) payload_serverVariables.push({ "key": "Referer", "value": document.referrer });
            if (document.location.protocol === "https:") payload_serverVariables.push({ "key": "HTTPS", "value": 'on' });
            if (document.location.hostname) payload_serverVariables.push({ "key": "Host", "value": document.location.hostname });

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

        function generateErrorObject(error) {
            return {
                error: error,
                type: error.name,
                message: error.message,
                inner: error.cause && typeof error.cause === "object" && error.cause instanceof Error ? generateErrorObject(error.cause) : []
            }
        }

        function getErrorTypeSource(error) {
            var object = generateErrorObject(error);
            var type = null;
            var source = null;

            function iterateObj(obj) {
                Object.keys(obj).forEach(function(key){
                    if (key === "error") {
                        if (objectLength(obj[key].stack) !== 0) {
                            var stack = obj[key] ? ErrorStackParser.parse(obj[key]) : null;
                            source = stack && stack.length > 0 ? stack[0].fileName : null;
                        }
                    }
                    if (key === "type") {
                        type = obj[key];
                    }
                    if (key === "inner" && obj[key].length !== 0) {
                        iterateObj(obj[key]);
                    }
                });
            }

            iterateObj(object);

            return { type: type, source: source };
        }

        function GenerateNewFrames(errorMessage, newFrames, cause, fileName) {
            var lastInnerFileName = null;

            newFrames.forEach(function(stackFrame, i) {
                if (stackFrame.functionName) {
                    var fn = stackFrame.functionName + ' ';
                } else {
                    var fn = '';
                }
                var stackString = '    at ' + fn + '(' + stackFrame.fileName + ':' + stackFrame.lineNumber + ':' + stackFrame.columnNumber + ')';
                newFrames[i] = stackString;
                if (i === 0) {
                    lastInnerFileName = stackFrame.fileName || null;
                }
            });
    
            if (!cause) {
                newFrames.unshift(errorMessage);
            } else {
                newFrames.unshift("\nCaused by: " + errorMessage);
            }

            if (fileName) {
                return {
                    newFrames: newFrames,
                    fileName: lastInnerFileName
                }
            }
    
            return newFrames;
        }

        function GPSPromise(stackframes) {
            if (stackframes) {
                var gps = new StackTraceGPS();

                return new Promise(function(resolve) {
                    resolve(Promise.all(stackframes.map(function(sf) {
                        return new Promise(function(resolve) {
                            function resolveOriginal() {
                                resolve(sf);
                            }
                            gps.pinpoint(sf).then(resolve, resolveOriginal)['catch'](resolveOriginal);
                        });
                    })));
                });
            }

            return new Promise(function(resolve) {
                return resolve([]);
            });
        }

        function stackGPS(error, xhr, jsonData) {
            var object = generateErrorObject(error);
            var messagesArr = [];
            var promiseArr = [];

            function iterateObj(obj) {
                Object.keys(obj).forEach(function(key){
                    if (key === "error") {
                        if (objectLength(obj[key].stack) !== 0) {
                            messagesArr.push(obj[key].toString().split("\n")[0]);
                            promiseArr.push(GPSPromise(ErrorStackParser.parse(obj[key])));
                        }
                    }
                    if (key === "inner" && obj[key].length !== 0) {
                        iterateObj(obj[key]);
                    }
                });
            }

            iterateObj(object);

            Promise.all(promiseArr).then((values) => {
                values.forEach(function(stackframe, index) {
                    if (index === 0) {
                        jsonData.detail = GenerateNewFrames(messagesArr[index], stackframe, false).join("\n");
                    } else {
                        jsonData.detail += GenerateNewFrames(messagesArr[index], stackframe, true).join("\n");
                    }
                });
            }).then(function() {
                xhr.send(JSON.stringify(jsonData));
            });
        }

        function stackString(error) {
        	var typeOF = typeof error.error;
        	var typeOFCapitalized = typeOF.charAt(0).toUpperCase() + typeOF.slice(1);

        	return typeOFCapitalized + ': ' + error.error + '\n' + '    at ' + '(' + error.source + ':' + error.lineno + ':' + error.colno + ')';
        }

        function manipulateStack (errorStack, severity, message) {
            var stack = [];
            for (var i = 0; i < errorStack.length; i++) {
                if(errorStack[i] === "Error") {
                    stack.push(severity + ": " + message);
                }
                if(!errorStack[i].match(/elmahio.js|elmahio.min.js/g) && errorStack[i] !== "Error") {
                    stack.push(errorStack[i]);
                }
            }
            return stack.join('\n');
        }

        function guid() {
            var s4 = function() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1).toUpperCase();
            }
            return s4() + s4();
        }

        function inspectorObj (error, fullError) {
            var obj = {};
            obj.Id = guid();

            if (typeof error === "object") {
                var stack = error && objectLength(error.stack) !== 0 && typeof error === "object" ? ErrorStackParser.parse(error) : '';
                obj.Type = error.name || null;
                obj.Message = error.message || null;
                obj.StackTrace = objectLength(error.stack) !== 0 ? ErrorStackParser.parse(error) : null;
                obj.Source = stack && stack.length > 0 ? stack[0].fileName : null;
                obj.Inners = error.cause && typeof error.cause === "object" && error.cause instanceof Error ? [inspectorObj(error.cause)] : [];

                if (error.cause && obj.Inners instanceof Array && obj.Inners.length === 0) {
                    if (typeof error.cause === "number" || typeof error.cause === "string" || typeof error.cause === "boolean") {
                        obj.ExceptionSpecific = [{ key: "cause", value: error.cause }];
                    }
                    if (typeof error.cause === "bigint") {
                        obj.ExceptionSpecific = [{ key: "cause", value: error.cause.toString() + "n" }];
                    }
                    if (typeof error.cause === "symbol") {
                        obj.ExceptionSpecific = [{ key: "cause", value: error.cause.toString() }];
                    }
                    if (typeof error.cause === "object") {
                        if (!(Object.keys(obj).length === 0 && obj.constructor === Object)) {
                            let objEntries = [];
                            for (const [key, value] of Object.entries(error.cause)) {
                                if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
                                    objEntries.push({ key: key, value: value });
                                }
                                if (typeof value === "bigint") {
                                    objEntries.push({ key: key, value: value.toString() + "n" });
                                }
                                if (typeof value === "symbol") {
                                    objEntries.push({ key: key, value: value.toString() });
                                }
                            }
                            obj.ExceptionSpecific = objEntries;
                        }
                    }
                }

            } else {
                obj.Type = typeof fullError.error || null;
                obj.Message = fullError.message || null;
                obj.StackTrace = stackString(fullError);
                obj.Source = fullError.source || null;
                obj.Inners = [];
            }

            return obj;
        }

        function inspectorGPS (error) {
            var inspectorObject = inspectorObj(error);
            var promiseArr = [];

            function iterateObj(obj, final) {
                Object.keys(obj).forEach(function(key){
                    if (key === "StackTrace") {
                        if (!final) {
                            obj[key] = GPSPromise(obj[key]);
                            promiseArr.push(obj[key]);
                        } else {
                            obj[key].then(result => {
                                var generateNewFrames = GenerateNewFrames(obj.Type + ': ' + obj.Message, result, false, true);
                                obj[key] = generateNewFrames.newFrames.join("\n");
                                obj['Source'] = generateNewFrames.fileName || null;
                            });
                        }
                    }
                    if (key === "Inners" && obj[key].length !== 0) {
                        iterateObj(obj[key][0], final);
                    }
                });
            }

            iterateObj(inspectorObject, false);

            return new Promise(function(resolve, reject) {
                Promise.all(promiseArr).then(function(values) {
                    iterateObj(inspectorObject, true);
                }).then(function() {
                    resolve(inspectorObject);
                });
            });
        }

        // Private methods

        var recordBreadcrumb = function(obj) {
            var crumb = merge_objects({'dateTime': new Date().toISOString()}, obj),
                breadcrumbs_number = 10;
  
            breadcrumbs.push(crumb);
  
            if(options.breadcrumbsNumber >= 0 && typeof options.breadcrumbsNumber === "number" ) {
                if(options.breadcrumbsNumber > 25) {
                    breadcrumbs_number = 25;
                } else if(options.breadcrumbsNumber <= 25) {
                    breadcrumbs_number = options.breadcrumbsNumber;
                }
            }
  
            if (breadcrumbs.length > breadcrumbs_number) {
                breadcrumbs.shift();
            }
        }

        var breadcrumbClickEventHandler = function(evt) {
            var target;
            try {
                target = cssSelectorString(evt.target);
            } catch (e) {
                target = "<unknown_target>";
            }

            recordBreadcrumb({
                "severity": "Information",
                "action": "Click",
                "message": target
            });
        }

        var breadcrumbFormSubmitEventHandler = function(evt) {
            var target;
            try {
                target = cssSelectorString(evt.target);
            } catch (e) {
                target = "<unknown_target>";
            }

            recordBreadcrumb({
                "severity": "Information",
                "action": "Form submit",
                "message": target
            });
        }

        var breadcrumbWindowEventHandler = function(evt) {
            var type = evt.type,
                message = null;

            switch (type) {
                case "load":
                    message = "Page loaded"; break;
                case "DOMContentLoaded":
                    message = "DOMContentLoaded"; break;
                case "pageshow":
                    message = "Page shown"; break;
                case "pagehide":
                    message = "Page hidden"; break;
                case "popstate":
                    message = "Navigated from: " + lastHref + " to: " + window.location.href; break;
            }

            recordBreadcrumb({
                "severity": "Information",
                "action": "Navigation",
                "message": message
            });
        }

        var breadcrumbHashChangeEventHandler = function(evt) {
            var oldURL = evt.oldURL,
                newURL = evt.newURL,
                from = null,
                to = null,
                message = null;

            if (oldURL && newURL) {
                from = parseHash(oldURL);
                to = parseHash(newURL);
                message = "from: '" + from + "' to: '" + to + "'";
            } else {
                to = location.hash;
                message = "to: '" + to + "'";
            }

            recordBreadcrumb({
                "severity": "Information",
                "action": "Navigation",
                "message": "Hash changed " + message
            });
        }

        var breadcrumbXHRHandler = function(evt, method, url) {
            var status = evt && evt.target ? evt.target.status : 0,
                severity = null,
                method = method.toUpperCase(),
                url = url,
                regex = /https:\/\/api.elmah.io/g;

            if(url.match(regex) == null) { 
                if (status > 0 && status < 400) {
                    severity = "Information";
                } else if (status > 399 && status < 500) {
                    severity = "Warning";
                } else if (status >= 500) {
                    severity = "Error";
                }

                var statusCode = status > 0 ? " (" + status + ")" : "";

                recordBreadcrumb({
                    "severity": severity,
                    "action": "Request",
                    "message": "[" + method + "] " + url + statusCode
                });
            }
        }

        var sendPayload = function (apiKey, logId, callback, errorLog) {
            var api_key = apiKey,
                log_id = logId,
                error = errorLog,
                send = 1,
                queryParams = getSearchParameters(),
                stack = error.error && objectLength(error.error.stack) !== 0 && typeof error.error === "object" ? ErrorStackParser.parse(error.error) : '';

            // Ignoring error from an external script
            if (error && error.colno === 0 && error.lineno === 0 && (!stack || stack === '') && error.message && (error.message === "Script error." || error.message === "Script error")) {
			    if (settings.debug) {
			        console.log('%c \u2BC8 Error log: ' + '%c \uD83D\uDEC8 Ignoring error from external script ', debugSettings.lightCSS, debugSettings.warningCSS);
			    }
			    return;
			}

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

                        if(xhr.status >= 400 && xhr.status <= 499) {
                            callback('error', xhr.statusText);

                            // on error event
                            publicAPIs.emit('error', xhr.status, xhr.statusText);
                        }
                    }
                };

                xhr.onerror = function (e) {
                    callback('error', xhr.statusText);

                    // on error event
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

                // Check if error sent is a string and not an object
                // Then create the articifial stacktrace and pass source & type of the error
                if(error.error && (objectLength(error.error.stack) === 0) && typeof jsonData.detail === "undefined") {
                	var typeOF = typeof errorLog.error;
        			var typeOFCapitalized = typeOF.charAt(0).toUpperCase() + typeOF.slice(1);

                	jsonData.detail = stackString(errorLog);
                	jsonData.source = errorLog.source;
                    jsonData.title = "Uncaught " + typeOFCapitalized + ": " + errorLog.error;
                }

                // Check if the error sent has a cause
                // Then change the type and source with the most inner error type
                if(error.error && error.error.cause && typeof error.error.cause === "object" && error.error.cause instanceof Error) {
                    var typeAndSource = getErrorTypeSource(error.error);
                    jsonData.type = typeAndSource.type;
                    jsonData.source = typeAndSource.source;
                }

                // Add payload to jsonData
                jsonData = merge_objects(jsonData, getPayload());

                // Add breadcrumbs to jsonData
                if(breadcrumbs.length > 0) {
                    jsonData.breadcrumbs = breadcrumbs;
                    breadcrumbs = [];
                }

                // filter callback
                if (settings.filter !== null) {
                    if (settings.filter(jsonData)) {
                        send = 0;
                    }
                }

                if (send === 1) {
                    // on message event
                    publicAPIs.emit('message', jsonData);

                    if (error.error && typeof error.error === "object" && objectLength(error.error.stack) !== 0 && typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1) {
                        // try to pinpoint stackframes from error object
                        inspectorGPS(error.error).then((result) => {
                            // Add inspector to jsonData
                            jsonData.data.push({ "key": "X-ELMAHIO-EXCEPTIONINSPECTOR", "value": JSON.stringify(result) });
                            // send message trying to pinpoint stackframes
                            stackGPS(error.error, xhr, jsonData);
                        });
	                } else {
                        // Add inspector to jsonData
                        jsonData.data.push({ "key": "X-ELMAHIO-EXCEPTIONINSPECTOR", "value": JSON.stringify(inspectorObj(error.error, errorLog)) });
	                	// send message
                    	xhr.send(JSON.stringify(jsonData));
	                }
                }

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
                send = 1,
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

                        if(xhr.status >= 400 && xhr.status <= 499) {
                            callback('error', xhr.statusText);

                            // on error event
                            publicAPIs.emit('error', xhr.status, xhr.statusText);
                        }
                    }
                };

                xhr.onerror = function (e) {
                    callback('error', xhr.statusText);

                    // on error event
                    publicAPIs.emit('error', xhr.status, xhr.statusText);
                }

                if (type !== "Log") {

                    var stack = error && error instanceof Error && objectLength(error.stack) !== 0 ? ErrorStackParser.parse(error) : null;

                    var jsonData = {
                        "title": message,
                        "source": stack && stack.length > 0 ? stack[0].fileName : null,
                        "detail": error ? error.stack : null,
                        "severity": type,
                        "type": error ? error.name : null,
                        "queryString": JSON.parse(JSON.stringify(queryParams))
                    };

                    // Check if the error sent has a cause
                    // Then change the type and source with the most inner error type
                    if(error && error.cause && typeof error.cause === "object" && error.cause instanceof Error) {
                        var typeAndSource = getErrorTypeSource(error);
                        jsonData.type = typeAndSource.type;
                        jsonData.source = typeAndSource.source;
                    }

                    // Add payload to jsonData
                    jsonData = merge_objects(jsonData, getPayload());

                } else {

                    var jsonData = error;
                    
                }

                // filter callback
                if (settings.filter !== null) {
                    if (settings.filter(jsonData)) {
                        send = 0;
                    }
                }

                if (send === 1) {
                    if (jsonData.title) {

                        // Add breadcrumbs to jsonData
                        if(breadcrumbs.length > 0) {
                            // If message contains breadcrumbs
                            if(jsonData.breadcrumbs && jsonData.breadcrumbs.length > 0) {
                                breadcrumbs = breadcrumbs.reverse();
                                for (var i = 0; i < breadcrumbs.length; i++) {
                                    // Add breadcrumbs to jsonData object
                                    jsonData.breadcrumbs.unshift(breadcrumbs[i]);
                                }
                            } else {
                                jsonData.breadcrumbs = breadcrumbs;
                            }
                            
                            // Reset breadcrumbs
                            breadcrumbs = [];
                        }

                        // on message event
                        publicAPIs.emit('message', jsonData);

                        if (error && error instanceof Error && type !== "Log" && typeof Promise !== "undefined" && Promise.toString().indexOf("[native code]") !== -1) {
                            // try to pinpoint stackframes from error object
                            inspectorGPS(error).then((result) => {
                                // Add inspector to jsonData
                                jsonData.data.push({ "key": "X-ELMAHIO-EXCEPTIONINSPECTOR", "value": JSON.stringify(result) });
                                // send message trying to pinpoint stackframes
                                stackGPS(error, xhr, jsonData);
                            });
                        } else {
                            // send message
                            if(jsonData.errorObject && jsonData.errorObject instanceof Error) {
                                error = jsonData.errorObject;
                                delete jsonData.errorObject;
                                // try to pinpoint stackframes from error object
                                inspectorGPS(error).then((result) => {
                                    // Add inspector to jsonData
                                    jsonData.data.push({ "key": "X-ELMAHIO-EXCEPTIONINSPECTOR", "value": JSON.stringify(result) });
                                    // send message trying to pinpoint stackframes
                                    stackGPS(error, xhr, jsonData);
                                });
                            } else {
                                delete jsonData.errorObject;
                                xhr.send(JSON.stringify(jsonData));
                            }
                        }

                    } else {
                        callback('missing-title', xhr.statusText);
                    }
                }

            } else {
                return console.log('Login api error');
            }
        };

        var sendPayloadFromConsole = function (apiKey, logId, callback, logType, errorLog) {
            var api_key = apiKey,
                log_id = logId,
                message = errorLog.message,
                messageTemplate = errorLog.message,
                type = logType,
                args = Object.values(errorLog.arguments),
                send = 1,
                queryParams = getSearchParameters();

            function format(f, args) {
                var formatRegExp = /%[sdif]/g;
                var str = f;

                if(args.length > 1) {
                    // If message has placeholders (%s, %d, %i, %f), check for arguments and replace them
                    if(String(f).match(/%[sdif]/g)) {
                        var i = 0;
                        str = String(f).replace(formatRegExp, function(x) {
                            switch (x) {
                                case '%s': i++; return args[i] ? String(args[i]) : '%s';
                                case '%d': i++; return args[i] ? (isInt(args[i]) || isFloat(args[i])) ? parseInt(args[i]) : 'NaN' : '%d';
                                case '%i': i++; return args[i] ? (isInt(args[i]) || isFloat(args[i])) ? parseInt(args[i]) : 'NaN' : '%i';
                                case '%f': i++; return args[i] ? (isInt(args[i]) || isFloat(args[i])) ? parseFloat(args[i]) : 'NaN' : '%f';
                                default: return x;
                            }
                        });

                        for (var len = args.length, x = args[++i]; i < len; x = args[++i]) {
                            if (x === null || typeof x !== 'object') {
                                str += ' ' + x;
                            } else {
                                str += ' ' + String(Object.prototype.toString.call(x));
                            }
                        }
                    } else {
                        str = args.join(' ');
                    }
                }

                return str;
            }

            message = format(message, args);

            if(typeof message !== "string" && message !== undefined){
                message = message.toString();
            }

            if(typeof messageTemplate !== "string" && messageTemplate !== undefined) {
                messageTemplate = messageTemplate.toString();
            }

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

                        if(xhr.status >= 400 && xhr.status <= 499) {
                            callback('error', xhr.statusText);

                            // on error event
                            publicAPIs.emit('error', xhr.status, xhr.statusText);
                        }
                    }
                };

                xhr.onerror = function (e) {
                    callback('error', xhr.statusText);
                    // on error event
                    publicAPIs.emit('error', xhr.status, xhr.statusText);
                }

                var jsonData = {
                    "title": message,
                    "titleTemplate": messageTemplate,
                    "detail": manipulateStack(new Error().stack.split('\n'), type, message),
                    "severity": type,
                    "type": null,
                    "queryString": JSON.parse(JSON.stringify(queryParams))
                };

                // Add payload to jsonData
                jsonData = merge_objects(jsonData, getPayload());

                // Add breadcrumbs to jsonData
                if(breadcrumbs.length > 0) {
                    jsonData.breadcrumbs = breadcrumbs;
                    breadcrumbs = [];
                }

                // filter callback
                if (settings.filter !== null) {
                    if (settings.filter(jsonData)) {
                        send = 0;
                    }
                }

                if (send === 1) {
                    if (jsonData.title) {
                        // on message event
                        publicAPIs.emit('message', jsonData);
                        // send message
                        xhr.send(JSON.stringify(jsonData));
                    } else {
                        callback('missing-title', xhr.statusText);
                    }
                }

            } else {
                return console.log('Login api error');
            }
        };

        var sendPrefilledLogMessage = function(errorLog) {
            // without error object
            if(!errorLog) return getPayload();

            // with error object
            var error = errorLog;
            var stack = error && objectLength(error.stack) !== 0 ? ErrorStackParser.parse(error) : null;
            var jsonData = {
                "title": error.message,
                "source": stack && stack.length > 0 ? stack[0].fileName : null,
                "detail": error ? error.stack : null,
                "severity": "Error",
                "type": error ? error.name : null,
                "errorObject": error
            };

            // Check if the error sent has a cause
            // Then change the type and source with the most inner error type
            if(error && error.cause && typeof error.cause === "object" && error.cause instanceof Error) {
                var typeAndSource = getErrorTypeSource(error);
                jsonData.type = typeAndSource.type;
                jsonData.source = typeAndSource.source;
            }

            jsonData = merge_objects(jsonData, getPayload());
            
            return jsonData;
        };

        // Some public methods

        publicAPIs.error = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Error', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.verbose = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Verbose', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.debug = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Debug', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.information = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Information', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.warning = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Warning', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.fatal = function (msg, error) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Fatal', msg, error); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.log = function (obj) {
            setTimeout(function() { sendManualPayload(settings.apiKey, settings.logId, confirmResponse, 'Log', null, obj); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
        };
        publicAPIs.message = function(error) {
            return sendPrefilledLogMessage(error);
        };
        publicAPIs.addBreadcrumb = function(msg, severity, evt) {
            recordBreadcrumb({
                "severity": (severity != undefined && isString(severity)) ? severity : "Information",
                "action": (evt != undefined && isString(evt)) ? evt : "Log",
                "message": (msg != undefined && isString(msg)) ? msg : "This is just a test message."
            });
        };

        publicAPIs.on = function (name, callback, ctx) {
            var e = this.e || (this.e = {});

            (e[name] || (e[name] = [])).push({
                fn: callback,
                ctx: ctx
            });

            return this;
        };

        publicAPIs.emit = function (name) {
            var data = [].slice.call(arguments, 1);
            var evtArr = ((this.e || (this.e = {}))[name] || []).slice();
            var i = 0;
            var len = evtArr.length;

            for (i; i < len; i++) {
                evtArr[i].fn.apply(evtArr[i].ctx, data);
            }

            return this;
        };

        publicAPIs.init = function (options) {

            // -- Merge options into defaults
            settings = extend(defaults, options || {});

            // -- Breadcrumbs
            if (settings.breadcrumbs) {
                // Breadcrumbs - Click & Submit form
                if (document.addEventListener) {
                    document.addEventListener('click', breadcrumbClickEventHandler, false);
                    document.addEventListener('submit', breadcrumbFormSubmitEventHandler, false);
                } else if (document.attachEvent) {
                    document.attachEvent('click', breadcrumbClickEventHandler, false);
                    document.attachEvent('submit', breadcrumbFormSubmitEventHandler, false);
                }

                // Breadcrumbs - Navigation
                if (window.addEventListener) {
                    window.addEventListener('load', breadcrumbWindowEventHandler, false);
                    window.addEventListener('DOMContentLoaded', breadcrumbWindowEventHandler, false);
                    window.addEventListener('pageshow', breadcrumbWindowEventHandler, false);
                    window.addEventListener('pagehide', breadcrumbWindowEventHandler, false);
                    window.addEventListener('hashchange', breadcrumbHashChangeEventHandler, false);
                } else if (window.attachEvent) {
                    window.attachEvent('load', breadcrumbWindowEventHandler, false);
                    window.attachEvent('DOMContentLoaded', breadcrumbWindowEventHandler, false);
                    window.attachEvent('pageshow', breadcrumbWindowEventHandler, false);
                    window.attachEvent('pagehide', breadcrumbWindowEventHandler, false);
                    window.attachEvent('hashchange', breadcrumbHashChangeEventHandler, false);
                }

                if(window.history && window.history.pushState && window.history.replaceState) {
                    var old_onpopstate = window.onpopstate;
                    window.onpopstate = function(evt) {
                        breadcrumbWindowEventHandler(evt);
                        if (old_onpopstate) {
                            return old_onpopstate.apply(this, arguments);
                        }
                    };
                }

                // Breadcrumbs - XHR
                if(window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
                    // Store a reference to the native method
                    var open = XMLHttpRequest.prototype.open;
                    
                    // Overwrite the native method
                    XMLHttpRequest.prototype.open = function(method, url) {
                        // Assign an event listener
                        this.addEventListener("loadend", function(event) { breadcrumbXHRHandler(event, method, url); }, false);
                        // Call the stored reference to the native method
                        open.apply(this, arguments);
                    };
                }
            }

            // -- Log on window error
            window.onerror = function (message, source, lineno, colno, error) {
                var errorLog = {
                    'message': message,
                    'source': source,
                    'lineno': lineno,
                    'colno': colno,
                    'error': error
                };
                
                setTimeout(function() { sendPayload(settings.apiKey, settings.logId, confirmResponse, errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);

                return false;
            }

            // -- Log on window unhandled rejection
            window.onunhandledrejection = function (event) {
                var errorLog = {
                    'message': event.reason.message,
                    'error': event.reason.message && event.reason.stack ? event.reason : undefined
                };

                setTimeout(function() { sendPayload(settings.apiKey, settings.logId, confirmResponse, errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);

                return false;
            }

            // -- Overriding console methods
            // -- Then log messages into the app.elmah.io
            if(options && options.captureConsoleMinimumLevel !== "none") {

                // If captureConsoleMinimumLevel: info or debug is set (error, warn)
                if(options.captureConsoleMinimumLevel === "info" || options.captureConsoleMinimumLevel === "warn" || options.captureConsoleMinimumLevel === "error" || options.captureConsoleMinimumLevel === "debug") {
                    // Log console errors
                    var _error = console.error;
                    console.error = function(errMessage){
                        var errorLog = {
                    		'message': errMessage,
                    		'arguments': arguments
                    	}
                        setTimeout(function() { sendPayloadFromConsole(settings.apiKey, settings.logId, confirmResponse, 'Error', errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
                        _error.apply(console, arguments);
                    };
                    if(options.captureConsoleMinimumLevel !== "error") {
                        // Log console warnings
                        var _warning = console.warn;
                        console.warn = function(warnMessage){
                            var errorLog = {
                                'message': warnMessage,
                                'arguments': arguments
                            }
                            setTimeout(function() { sendPayloadFromConsole(settings.apiKey, settings.logId, confirmResponse, 'Warning', errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
                            _warning.apply(console, arguments);
                        };
                    }
                }
                if(options.captureConsoleMinimumLevel === "info" || options.captureConsoleMinimumLevel === "debug") {
                    // Log console info
                    var _info = console.info;
                    console.info = function(infoMessage){
                        var errorLog = {
                    		'message': infoMessage,
                    		'arguments': arguments
                    	}
                        setTimeout(function() { sendPayloadFromConsole(settings.apiKey, settings.logId, confirmResponse, 'Information', errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
                        _info.apply(console, arguments);
                    };
                }
                if(options.captureConsoleMinimumLevel === "debug") {
                    // Log console debug
                    var _debug = console.debug;
                    console.debug = function(debugMessage){
                        var errorLog = {
                    		'message': debugMessage,
                    		'arguments': arguments
                    	}
                        setTimeout(function() { sendPayloadFromConsole(settings.apiKey, settings.logId, confirmResponse, 'Debug', errorLog); }, settings.breadcrumbs ? breadcrumbsDelay : 0);
                        _debug.apply(console, arguments);
                    };
                }
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

    if (paramsLength && params.hasOwnProperty('apiKey') && params.hasOwnProperty('logId')) {
        // Immediately-Invoked Function Expression (IIFE)
        return new Constructor;
    } else {
        // UMD Constructor
        return Constructor;
    }

});