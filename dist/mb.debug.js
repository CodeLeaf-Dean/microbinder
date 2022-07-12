class ObjectHandler {
    constructor(mb) {
        this.mb = mb;
        this._handler = this;
        this._childProxies = {};
        this._subscribers = {};
        this.parentProxy = null;
    }

    _subscribe(prop, eventFunc, triggerFunc, bindingId){
        if(prop == "constructor")return null;
        if(this._subscribers[prop] == null)this._subscribers[prop] = [];
        var propSubscribers = this._subscribers[prop];
        if(!Array.isArray(propSubscribers))return null;
        var sub = {
            _eventFunc:eventFunc,
            _subscription:()=>this._subscribers[prop],
            _triggerFunc:triggerFunc,
            _bindingId:bindingId
        };
        propSubscribers.push(sub);
        return sub;
    }

    _notifySubscribers(prop, oldValue, newValue, startIndex, deleteCount, pushCount){
        if(this._subscribers[prop] != null){
            for (var i = this._subscribers[prop].length - 1; i >= 0; i--) {
                this._subscribers[prop][i]._eventFunc(newValue, oldValue, startIndex, deleteCount, pushCount);
            }
        }
    }

    get(obj, prop, proxy) {
        if(prop === "_proxyHandler") return this;
        if(prop === "_parentProxy") return this.parentProxy;
        if(prop === "_isProxy") return true;
        if(prop === "_proxyObject") return obj;
        if(prop === "_subscribe") return this._subscribe.bind(this);
        var val = Reflect.get(obj, prop, proxy);
        
        if(this.mb._calculatingDependancies){
            if(!this.mb._calculatedDependancies.find(element => element.handler == this && element.prop == prop)){
                this.mb._calculatedDependancies.push({handler: this, prop: prop});
            }
        }

        if(this.mb._settingValue){
            this.mb._setStack.push((v)=>proxy[prop]=v);
        }

        if (val != null && typeof val === 'object') {
            if(this._childProxies[prop] == null){
                var newProxy = this.mb.wrap(val);
                newProxy._proxyHandler.parentProxy = proxy;
                newProxy._proxyHandler.parentProp = prop;
                this._childProxies[prop] = newProxy;
            }
            return this._childProxies[prop];
        }

        return val;
    }

    set(obj, prop, val, proxy) {
        // Dont ever set a property to be a proxy. Unwrap it first.
        var newValIsProxy = false;
        if(val!=null&&val['_isProxy']){
            this._childProxies[prop] = val;
            val = val._proxyObject;
            newValIsProxy = true;
        }

        var oldVal = obj[prop];
        var result = Reflect.set(obj, prop, val, proxy);
        
        // If we are setting an unwrapped object property, clear out the existing childProxy
        if (typeof val === 'object' && !newValIsProxy) {
            var currentProxy = this._childProxies[prop];
            delete this._childProxies[prop];

            // If we are replacing an entire array, treat it as emptying the current array, then filling the new one
            if (Array.isArray(val)) {
                var newProxy = proxy[prop];
                if(currentProxy){
                    currentProxy.length = 0;
                    newProxy._proxyHandler._bindElements = currentProxy._proxyHandler._bindElements;
                }
                newProxy._proxyHandler._handleSplice(0,0,val.length, newProxy);
            }
        }
        
        // Notify subscribers of the change
        this._notifySubscribers(prop, oldVal, val);

        return result;
    }
}

class DateHandler extends ObjectHandler {
    constructor(mb) {
        super(mb);
    }
    get(obj, prop, proxy) {
        var val = super.get(obj, prop, proxy);
        if (typeof val === 'function') {
            return function (el) {
                var original = new Date(obj.valueOf());
                var result = val.apply(obj, arguments);
                if(obj != original){
                    this.parentProxy._proxyHandler._notifySubscribers(this.parentProp, original, obj);
                }
                return result;
            }.bind(this);
        }
        return val;
    }
    set(obj, prop, val, proxy) {
        var originalSettingValue = this.mb._settingValue;
        this.mb._settingValue = false;
        var result = super.set(obj, prop, val, proxy);
        this.mb._settingValue = originalSettingValue;
        return result;
    }
}

class BindingContext{
    constructor(mb, data, index, parentContext) {
        this.mb = mb;
        this.$data = data;
        this.$parentContext = parentContext;
        this._proxy = new Proxy({$index:index}, new ObjectHandler(mb));
        this.bindings = [];
    }

    get $parent() {
        return this.$parentContext.$data;
    }

    get $index() {
        if(this.mb._calculatingDependancies) this.mb._calculatedDependancies.push({handler: this._proxy.proxyHandler, prop: '$index'});
        return this._proxy.$index;    }
    set $index(value) {
        this._proxy.$index = value;
    }

    bind(readFunc, writeFunc, bindingContext, oldValue, startIndex, deleteCount, pushCount){
        var binding = this.mb.bind(readFunc, writeFunc, bindingContext, oldValue, startIndex, deleteCount, pushCount);
        this.bindings.push(binding);
        return binding;
    }

    createSiblingContext(){
        return new BindingContext(this.mb, this.$data, this.$index, this.$parentContext);
    }

    createChildContext(data, index){
        return new BindingContext(this.mb, data, index, this);
    }

    getPreviousElement(e){
        if(e.getPreviousSibling){
            var prev = e.getPreviousSibling();

            if(prev && prev.getPreviousSibling){
                if(!prev.bindArray || prev.bindArray.length == 0 || prev.bindArray[prev.bindArray.length-1].length == 0){
                    return this.getPreviousElement(prev);
                } else {
                    var arr = prev.bindArray[prev.bindArray.length-1];
                    return arr[arr.length-1];
                }
            } else {
                return prev;
            }

        }
    }

    commitElement(){
        if(this.element.getPreviousSibling){
            var previous = this.getPreviousElement(this.element);
            if(previous == undefined){
                for (let i = this.element.children.length-1; i >= 0; i--) {
                    this.element.parent.insertAdjacentElement('afterbegin', this.element.children[i]);
                }
            } else {
                previous.after(this.element);
            }
        }
    }

    clearElement(index){
        if(this.element instanceof DocumentFragment){
            var toRemove = this.element.bindArray[index];
            this.clearBindArray(toRemove);
        } else {
            this.element.innerHTML = "";
        }
    }

    clearBindArray(toRemove){
        for (let i = 0; i < toRemove.length; i++) {
            if(toRemove[i] instanceof DocumentFragment){
                toRemove[i].$context.clearBindings();
                var br = toRemove[i].bindArray;
                for (let j = 0; j < br.length; j++) {
                    this.clearBindArray(br[j]);
                }
            } else {
                toRemove[i].remove();
            }
        }
        toRemove.length = 0;
    }

    clearBindings(){
        this.bindings.forEach(binding =>{
            binding.unbind();
        });
        this.bindings = [];
    }
}

class ArrayHandler extends ObjectHandler {
    constructor(mb, prop, proxy) {
        super(mb);
        this._childProxies = [];
        this._childContexts = [];
        this._bindElements = [];
    }
    
    _handleSplice(startIndex, deleteCount, pushCount, proxy){
        var newArgs = [];
        newArgs[0] = startIndex;
        newArgs[1] = deleteCount;
        for(let na=0;na<pushCount;na++)newArgs[na+2] = null;
        Array.prototype.splice.apply(this._childProxies, newArgs);

        this.parentProxy._proxyHandler._notifySubscribers(this.parentProp, this.parentProxy, this.parentProxy, startIndex, deleteCount, pushCount);
    }

    get(obj, prop, proxy) {
        var val = super.get(obj, prop, proxy);

        if(prop === "childContexts") return this._childContexts;

        if (typeof val === 'function') {
            if(prop === 'splice'){
                return function (el) {
                    var startIndex = arguments[0];
                    if(startIndex > obj.length)startIndex = obj.length;
                    if(startIndex < -obj.length)startIndex = 0;
                    if(startIndex<0)startIndex = obj.length + startIndex + 1;
                    var deleteCount = arguments.length == 1 ? obj.length - startIndex : arguments[1];
                    if(deleteCount > obj.length - startIndex)deleteCount = obj.length - startIndex;
                    var result = Array.prototype.splice.apply(obj, arguments);
                    this._handleSplice(startIndex, deleteCount, arguments.length - 2, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'push'){
                return function (el) {
                    var prePushLength = obj.length;
                    var result = Array.prototype.push.apply(obj, arguments);
                    this._handleSplice(prePushLength, 0, arguments.length, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'pop') {
                return function () {
                    if(obj.length == 0) return undefined;
                    var prePopLength = obj.length;
                    var result = Array.prototype.pop.apply(obj, arguments);
                    this._handleSplice(prePopLength-1, 1, 0, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'shift') {
                return function () {
                    if(obj.length == 0) return undefined;
                    var result = Array.prototype.shift.apply(obj, arguments);
                    this._handleSplice(0, 1, 0, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'unshift') {
                return function (el) {
                    var result = Array.prototype.unshift.apply(obj, arguments);
                    this._handleSplice(0, 0, 1, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'reverse' || prop == 'sort') {
                return function (el) {
                    var result = Array.prototype[prop].apply(obj, arguments);
                    this._handleSplice(0,obj.length,obj.length, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'fill') {
                return function (el) {
                    var start = arguments[1] || 0;
                    var end = arguments[2] || obj.length;
                    if(start<0)start = ob.length + start;
                    if(end<0)end = ob.length + end;
                    var result = Array.prototype.fill.apply(obj, arguments);
                    this._handleSplice(start, end, end-start, proxy);
                    return result;
                }.bind(this);
            }
            if(prop === 'indexOf') {
                return function (el) {
                    arguments[0] = this.mb.unwrap(arguments[0]);
                    var result = Array.prototype.indexOf.apply(obj, arguments);
                    return result;
                }.bind(this);
            }
    
            return val.bind(proxy);
        }

        return val;
    }

    set(obj, prop, val, proxy) {
        var originalLength = obj.length;
        var result = Reflect.set(obj, prop, val, proxy);
        if(prop === "length"){
            if(originalLength > val){
                this._handleSplice(val, originalLength - val);
            }
        } else {
            if(obj.length === originalLength){
                this._handleSplice(parseInt(prop), 1, 1, obj);
            } else {
                this._handleSplice(parseInt(prop), 0, 1, obj);
            }
        }
        return result;
    }
}

class MicroBinderCore {
    constructor() {
        this._nextBindingId = 1;
        this._bindings = {};
        this._calculatingDependancies = false;
        this._calculatedDependancies = [];
        this.bindObjects = [];
        this.bindObjectCount = -1;
    }

    wrap(model){
        if(model._isProxy)
            return model;

        if(model.___proxy != null)
            return model.___proxy;

        var handler = Object.prototype.toString.call(model) === '[object Date]' ? new DateHandler(this) : Array.isArray(model) ? new ArrayHandler(this,null,model) : new ObjectHandler(this);
        var newProxy = new Proxy(model, handler);

        model.___proxy = newProxy;

        return newProxy;
    }

    unwrap(model){
        if(!model._isProxy)
            return model;

        return model._proxyObject;
    }

    bind(readFunc, writeFunc, bindingContext, oldValue, startIndex, deleteCount, pushCount, existingBindingId){
        this._calculatingDependancies = true;
        this._calculatedDependancies = [];
        var newValue = readFunc.call(bindingContext == null ? null : bindingContext.$data);
        this._calculatingDependancies = false;

        var bindingId = existingBindingId;
        if(this._calculatedDependancies.length > 0){
            if(existingBindingId == null){
                bindingId = this._nextBindingId++;
            }
            this._bindings[bindingId] = [];
            this._calculatedDependancies.forEach(x=>{
                if(x.handler){
                    var sub = x.handler._subscribe(x.prop, (n,o,startIndex, deleteCount, pushCount)=>{
                        this._bindings[bindingId].forEach(y=>y._subscription().splice(y._subscription().indexOf(y),1));
                        delete this._bindings[bindingId];
                        this.bind(readFunc, writeFunc, bindingContext, o, startIndex, deleteCount, pushCount, bindingId);
                    }, readFunc, bindingId);
                    if(sub) this._bindings[bindingId].push(sub);
                }
            });
        }

        writeFunc(newValue, oldValue, startIndex, deleteCount, pushCount);

        return { 
            unbind: ()=> {
                if(this._calculatedDependancies.length > 0){
                    if(this._bindings[bindingId]){
                        this._bindings[bindingId].forEach(y=>y._subscription().splice(y._subscription().indexOf(y),1));
                        delete this._bindings[bindingId]; 
                    }
                }
            }
        };
    }

    computed(func, thisContext){
        var mb = this;
        var wrappedThis = mb.wrap(thisContext);
        var temp = mb.wrap({value:undefined});
        var returnFunc = function(){
            return temp.value;
        };

        mb.bind(
            (func).bind(wrappedThis), 
            (function(v){
                if(temp.value != v){
                    temp.value = v;
                }
            }).bind(wrappedThis)
        );

        return returnFunc;
    }
}

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

const intToCharMap = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split(
    ""
  );
  
  /**
   * Encode an integer in the range of 0 to 63 to a single base 64 digit.
   */
  function encode(number) {
    if (0 <= number && number < intToCharMap.length) {
      return intToCharMap[number];
    }
    throw new TypeError("Must be between 0 and 63: " + number);
  }

/* -*- Mode: js; js-indent-level: 2; -*- */
//const base64 = require("./base64");

// A single base 64 digit can contain 6 bits of data. For the base 64 variable
// length quantities we use in the source map spec, the first bit is the sign,
// the next four bits are the actual value, and the 6th bit is the
// continuation bit. The continuation bit tells us whether there are more
// digits in this value following this digit.
//
//   Continuation
//   |    Sign
//   |    |
//   V    V
//   101011

const VLQ_BASE_SHIFT = 5;

// binary: 100000
const VLQ_BASE = 1 << VLQ_BASE_SHIFT;

// binary: 011111
const VLQ_BASE_MASK = VLQ_BASE - 1;

// binary: 100000
const VLQ_CONTINUATION_BIT = VLQ_BASE;

/**
 * Converts from a two-complement value to a value where the sign bit is
 * placed in the least significant bit.  For example, as decimals:
 *   1 becomes 2 (10 binary), -1 becomes 3 (11 binary)
 *   2 becomes 4 (100 binary), -2 becomes 5 (101 binary)
 */
function toVLQSigned(aValue) {
  return aValue < 0 ? (-aValue << 1) + 1 : (aValue << 1) + 0;
}

/**
 * Returns the base 64 VLQ encoded value.
 */
function encode$1(aValue) {
  let encoded = "";
  let digit;

  let vlq = toVLQSigned(aValue);

  do {
    digit = vlq & VLQ_BASE_MASK;
    vlq >>>= VLQ_BASE_SHIFT;
    if (vlq > 0) {
      // There are still more digits in this value, so we must make sure the
      // continuation bit is marked.
      digit |= VLQ_CONTINUATION_BIT;
    }
    encoded += encode(digit);
  } while (vlq > 0);

  return encoded;
}

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

//import URL from './url.js'
//const URL = require("./url");
var exports$1 = {};

/**
 * This is a helper function for getting values from parameter/options
 * objects.
 *
 * @param args The object we are extracting values from
 * @param name The name of the property we are getting.
 * @param defaultValue An optional value to return if the property is missing
 * from the object. If this is not specified and the property is missing, an
 * error will be thrown.
 */
function getArg(aArgs, aName, aDefaultValue) {
  if (aName in aArgs) {
    return aArgs[aName];
  } else if (arguments.length === 3) {
    return aDefaultValue;
  }
  throw new Error('"' + aName + '" is a required argument.');
}
exports$1.getArg = getArg;

const supportsNullProto = (function() {
  const obj = Object.create(null);
  return !("__proto__" in obj);
})();

function identity(s) {
  return s;
}

/**
 * Because behavior goes wacky when you set `__proto__` on objects, we
 * have to prefix all the strings in our set with an arbitrary character.
 *
 * See https://github.com/mozilla/source-map/pull/31 and
 * https://github.com/mozilla/source-map/issues/30
 *
 * @param String aStr
 */
function toSetString(aStr) {
  if (isProtoString(aStr)) {
    return "$" + aStr;
  }

  return aStr;
}
exports$1.toSetString = supportsNullProto ? identity : toSetString;

function fromSetString(aStr) {
  if (isProtoString(aStr)) {
    return aStr.slice(1);
  }

  return aStr;
}
exports$1.fromSetString = supportsNullProto ? identity : fromSetString;

function isProtoString(s) {
  if (!s) {
    return false;
  }

  const length = s.length;

  if (length < 9 /* "__proto__".length */) {
    return false;
  }

  /* eslint-disable no-multi-spaces */
  if (
    s.charCodeAt(length - 1) !== 95 /* '_' */ ||
    s.charCodeAt(length - 2) !== 95 /* '_' */ ||
    s.charCodeAt(length - 3) !== 111 /* 'o' */ ||
    s.charCodeAt(length - 4) !== 116 /* 't' */ ||
    s.charCodeAt(length - 5) !== 111 /* 'o' */ ||
    s.charCodeAt(length - 6) !== 114 /* 'r' */ ||
    s.charCodeAt(length - 7) !== 112 /* 'p' */ ||
    s.charCodeAt(length - 8) !== 95 /* '_' */ ||
    s.charCodeAt(length - 9) !== 95 /* '_' */
  ) {
    return false;
  }
  /* eslint-enable no-multi-spaces */

  for (let i = length - 10; i >= 0; i--) {
    if (s.charCodeAt(i) !== 36 /* '$' */) {
      return false;
    }
  }

  return true;
}

function strcmp(aStr1, aStr2) {
  if (aStr1 === aStr2) {
    return 0;
  }

  if (aStr1 === null) {
    return 1; // aStr2 !== null
  }

  if (aStr2 === null) {
    return -1; // aStr1 !== null
  }

  if (aStr1 > aStr2) {
    return 1;
  }

  return -1;
}

/**
 * Comparator between two mappings with inflated source and name strings where
 * the generated positions are compared.
 */
function compareByGeneratedPositionsInflated(mappingA, mappingB) {
  let cmp = mappingA.generatedLine - mappingB.generatedLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.generatedColumn - mappingB.generatedColumn;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = strcmp(mappingA.source, mappingB.source);
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalLine - mappingB.originalLine;
  if (cmp !== 0) {
    return cmp;
  }

  cmp = mappingA.originalColumn - mappingB.originalColumn;
  if (cmp !== 0) {
    return cmp;
  }

  return strcmp(mappingA.name, mappingB.name);
}
exports$1.compareByGeneratedPositionsInflated = compareByGeneratedPositionsInflated;

/**
 * Strip any JSON XSSI avoidance prefix from the string (as documented
 * in the source maps specification), and then parse the string as
 * JSON.
 */
function parseSourceMapInput(str) {
  return JSON.parse(str.replace(/^\)]}'[^\n]*\n/, ""));
}
exports$1.parseSourceMapInput = parseSourceMapInput;

// We use 'http' as the base here because we want URLs processed relative
// to the safe base to be treated as "special" URLs during parsing using
// the WHATWG URL parsing. This ensures that backslash normalization
// applies to the path and such.
const PROTOCOL = "http:";
const PROTOCOL_AND_HOST = `${PROTOCOL}//host`;

/**
 * Make it easy to create small utilities that tweak a URL's path.
 */
function createSafeHandler(cb) {
  return input => {
    const type = getURLType(input);
    const base = buildSafeBase(input);
    const url = new URL(input, base);

    cb(url);

    const result = url.toString();

    if (type === "absolute") {
      return result;
    } else if (type === "scheme-relative") {
      return result.slice(PROTOCOL.length);
    } else if (type === "path-absolute") {
      return result.slice(PROTOCOL_AND_HOST.length);
    }

    // This assumes that the callback will only change
    // the path, search and hash values.
    return computeRelativeURL(base, result);
  };
}

function withBase(url, base) {
  return new URL(url, base).toString();
}

function buildUniqueSegment(prefix, str) {
  let id = 0;
  do {
    const ident = prefix + id++;
    if (str.indexOf(ident) === -1) return ident;
  } while (true);
}

function buildSafeBase(str) {
  const maxDotParts = str.split("..").length - 1;

  // If we used a segment that also existed in `str`, then we would be unable
  // to compute relative paths. For example, if `segment` were just "a":
  //
  //   const url = "../../a/"
  //   const base = buildSafeBase(url); // http://host/a/a/
  //   const joined = "http://host/a/";
  //   const result = relative(base, joined);
  //
  // Expected: "../../a/";
  // Actual: "a/"
  //
  const segment = buildUniqueSegment("p", str);

  let base = `${PROTOCOL_AND_HOST}/`;
  for (let i = 0; i < maxDotParts; i++) {
    base += `${segment}/`;
  }
  return base;
}

const ABSOLUTE_SCHEME = /^[A-Za-z0-9\+\-\.]+:/;
function getURLType(url) {
  if (url[0] === "/") {
    if (url[1] === "/") return "scheme-relative";
    return "path-absolute";
  }

  return ABSOLUTE_SCHEME.test(url) ? "absolute" : "path-relative";
}

/**
 * Given two URLs that are assumed to be on the same
 * protocol/host/user/password build a relative URL from the
 * path, params, and hash values.
 *
 * @param rootURL The root URL that the target will be relative to.
 * @param targetURL The target that the relative URL points to.
 * @return A rootURL-relative, normalized URL value.
 */
function computeRelativeURL(rootURL, targetURL) {
  if (typeof rootURL === "string") rootURL = new URL(rootURL);
  if (typeof targetURL === "string") targetURL = new URL(targetURL);

  const targetParts = targetURL.pathname.split("/");
  const rootParts = rootURL.pathname.split("/");

  // If we've got a URL path ending with a "/", we remove it since we'd
  // otherwise be relative to the wrong location.
  if (rootParts.length > 0 && !rootParts[rootParts.length - 1]) {
    rootParts.pop();
  }

  while (
    targetParts.length > 0 &&
    rootParts.length > 0 &&
    targetParts[0] === rootParts[0]
  ) {
    targetParts.shift();
    rootParts.shift();
  }

  const relativePath = rootParts
    .map(() => "..")
    .concat(targetParts)
    .join("/");

  return relativePath + targetURL.search + targetURL.hash;
}

/**
 * Given a URL, ensure that it is treated as a directory URL.
 *
 * @param url
 * @return A normalized URL value.
 */
const ensureDirectory = createSafeHandler(url => {
  url.pathname = url.pathname.replace(/\/?$/, "/");
});

/**
 * Given a URL, strip off any filename if one is present.
 *
 * @param url
 * @return A normalized URL value.
 */
const trimFilename = createSafeHandler(url => {
  url.href = new URL(".", url.toString()).toString();
});

/**
 * Normalize a given URL.
 * * Convert backslashes.
 * * Remove any ".." and "." segments.
 *
 * @param url
 * @return A normalized URL value.
 */
const normalize = createSafeHandler(url => {});
exports$1.normalize = normalize;

/**
 * Joins two paths/URLs.
 *
 * All returned URLs will be normalized.
 *
 * @param aRoot The root path or URL. Assumed to reference a directory.
 * @param aPath The path or URL to be joined with the root.
 * @return A joined and normalized URL value.
 */
function join(aRoot, aPath) {
  const pathType = getURLType(aPath);
  const rootType = getURLType(aRoot);

  aRoot = ensureDirectory(aRoot);

  if (pathType === "absolute") {
    return withBase(aPath, undefined);
  }
  if (rootType === "absolute") {
    return withBase(aPath, aRoot);
  }

  if (pathType === "scheme-relative") {
    return normalize(aPath);
  }
  if (rootType === "scheme-relative") {
    return withBase(aPath, withBase(aRoot, PROTOCOL_AND_HOST)).slice(
      PROTOCOL.length
    );
  }

  if (pathType === "path-absolute") {
    return normalize(aPath);
  }
  if (rootType === "path-absolute") {
    return withBase(aPath, withBase(aRoot, PROTOCOL_AND_HOST)).slice(
      PROTOCOL_AND_HOST.length
    );
  }

  const base = buildSafeBase(aPath + aRoot);
  const newPath = withBase(aPath, withBase(aRoot, base));
  return computeRelativeURL(base, newPath);
}
exports$1.join = join;

/**
 * Make a path relative to a URL or another path. If returning a
 * relative URL is not possible, the original target will be returned.
 * All returned URLs will be normalized.
 *
 * @param aRoot The root path or URL.
 * @param aPath The path or URL to be made relative to aRoot.
 * @return A rootURL-relative (if possible), normalized URL value.
 */
function relative(rootURL, targetURL) {
  const result = relativeIfPossible(rootURL, targetURL);

  return typeof result === "string" ? result : normalize(targetURL);
}
exports$1.relative = relative;

function relativeIfPossible(rootURL, targetURL) {
  const urlType = getURLType(rootURL);
  if (urlType !== getURLType(targetURL)) {
    return null;
  }

  const base = buildSafeBase(rootURL + targetURL);
  const root = new URL(rootURL, base);
  const target = new URL(targetURL, base);

  try {
    new URL("", target.toString());
  } catch (err) {
    // Bail if the URL doesn't support things being relative to it,
    // For example, data: and blob: URLs.
    return null;
  }

  if (
    target.protocol !== root.protocol ||
    target.user !== root.user ||
    target.password !== root.password ||
    target.hostname !== root.hostname ||
    target.port !== root.port
  ) {
    return null;
  }

  return computeRelativeURL(root, target);
}

/**
 * Compute the URL of a source given the the source root, the source's
 * URL, and the source map's URL.
 */
function computeSourceURL(sourceRoot, sourceURL, sourceMapURL) {
  // The source map spec states that "sourceRoot" and "sources" entries are to be appended. While
  // that is a little vague, implementations have generally interpreted that as joining the
  // URLs with a `/` between then, assuming the "sourceRoot" doesn't already end with one.
  // For example,
  //
  //   sourceRoot: "some-dir",
  //   sources: ["/some-path.js"]
  //
  // and
  //
  //   sourceRoot: "some-dir/",
  //   sources: ["/some-path.js"]
  //
  // must behave as "some-dir/some-path.js".
  //
  // With this library's the transition to a more URL-focused implementation, that behavior is
  // preserved here. To acheive that, we trim the "/" from absolute-path when a sourceRoot value
  // is present in order to make the sources entries behave as if they are relative to the
  // "sourceRoot", as they would have if the two strings were simply concated.
  if (sourceRoot && getURLType(sourceURL) === "path-absolute") {
    sourceURL = sourceURL.replace(/^\//, "");
  }

  let url = normalize(sourceURL || "");

  // Parsing URLs can be expensive, so we only perform these joins when needed.
  if (sourceRoot) url = join(sourceRoot, url);
  if (sourceMapURL) url = join(trimFilename(sourceMapURL), url);
  return url;
}
exports$1.computeSourceURL = computeSourceURL;

/* -*- Mode: js; js-indent-level: 2; -*- */
/*
 * Copyright 2011 Mozilla Foundation and contributors
 * Licensed under the New BSD license. See LICENSE or:
 * http://opensource.org/licenses/BSD-3-Clause
 */

/**
 * A data structure which is a combination of an array and a set. Adding a new
 * member is O(1), testing for membership is O(1), and finding the index of an
 * element is O(1). Removing elements from the set is not supported. Only
 * strings are supported for membership.
 */
 class ArraySet {
    constructor() {
      this._array = [];
      this._set = new Map();
    }
  
    /**
     * Static method for creating ArraySet instances from an existing array.
     */
    static fromArray(aArray, aAllowDuplicates) {
      const set = new ArraySet();
      for (let i = 0, len = aArray.length; i < len; i++) {
        set.add(aArray[i], aAllowDuplicates);
      }
      return set;
    }
  
    /**
     * Return how many unique items are in this ArraySet. If duplicates have been
     * added, than those do not count towards the size.
     *
     * @returns Number
     */
    size() {
      return this._set.size;
    }
  
    /**
     * Add the given string to this set.
     *
     * @param String aStr
     */
    add(aStr, aAllowDuplicates) {
      const isDuplicate = this.has(aStr);
      const idx = this._array.length;
      if (!isDuplicate || aAllowDuplicates) {
        this._array.push(aStr);
      }
      if (!isDuplicate) {
        this._set.set(aStr, idx);
      }
    }
  
    /**
     * Is the given string a member of this set?
     *
     * @param String aStr
     */
    has(aStr) {
      return this._set.has(aStr);
    }
  
    /**
     * What is the index of the given string in the array?
     *
     * @param String aStr
     */
    indexOf(aStr) {
      const idx = this._set.get(aStr);
      if (idx >= 0) {
        return idx;
      }
      throw new Error('"' + aStr + '" is not in the set.');
    }
  
    /**
     * What is the element at the given index?
     *
     * @param Number aIdx
     */
    at(aIdx) {
      if (aIdx >= 0 && aIdx < this._array.length) {
        return this._array[aIdx];
      }
      throw new Error("No element indexed by " + aIdx);
    }
  
    /**
     * Returns the array representation of this set (which has the proper indices
     * indicated by indexOf). Note that this is a copy of the internal array used
     * for storing the members so that no one can mess with internal state.
     */
    toArray() {
      return this._array.slice();
    }
  }

/* -*- Mode: js; js-indent-level: 2; -*- */
//const util = require("./util");

/**
 * Determine whether mappingB is after mappingA with respect to generated
 * position.
 */
function generatedPositionAfter(mappingA, mappingB) {
  // Optimized for most common case
  const lineA = mappingA.generatedLine;
  const lineB = mappingB.generatedLine;
  const columnA = mappingA.generatedColumn;
  const columnB = mappingB.generatedColumn;
  return (
    lineB > lineA ||
    (lineB == lineA && columnB >= columnA) ||
    exports$1.compareByGeneratedPositionsInflated(mappingA, mappingB) <= 0
  );
}

/**
 * A data structure to provide a sorted view of accumulated mappings in a
 * performance conscious manner. It trades a negligible overhead in general
 * case for a large speedup in case of mappings being added in order.
 */
class MappingList {
  constructor() {
    this._array = [];
    this._sorted = true;
    // Serves as infimum
    this._last = { generatedLine: -1, generatedColumn: 0 };
  }

  /**
   * Iterate through internal items. This method takes the same arguments that
   * `Array.prototype.forEach` takes.
   *
   * NOTE: The order of the mappings is NOT guaranteed.
   */
  unsortedForEach(aCallback, aThisArg) {
    this._array.forEach(aCallback, aThisArg);
  }

  /**
   * Add the given source mapping.
   *
   * @param Object aMapping
   */
  add(aMapping) {
    if (generatedPositionAfter(this._last, aMapping)) {
      this._last = aMapping;
      this._array.push(aMapping);
    } else {
      this._sorted = false;
      this._array.push(aMapping);
    }
  }

  /**
   * Returns the flat, sorted array of mappings. The mappings are sorted by
   * generated position.
   *
   * WARNING: This method returns internal data without copying, for
   * performance. The return value must NOT be mutated, and should be treated as
   * an immutable borrow. If you want to take ownership, you must make your own
   * copy.
   */
  toArray() {
    if (!this._sorted) {
      this._array.sort(exports$1.compareByGeneratedPositionsInflated);
      this._sorted = true;
    }
    return this._array;
  }
}

/* -*- Mode: js; js-indent-level: 2; -*- */

// const base64VLQ = require("./base64-vlq");
// const util = require("./util");
// const ArraySet = require("./array-set").ArraySet;
// const MappingList = require("./mapping-list").MappingList;

/**
 * An instance of the SourceMapGenerator represents a source map which is
 * being built incrementally. You may pass an object with the following
 * properties:
 *
 *   - file: The filename of the generated source.
 *   - sourceRoot: A root for all relative URLs in this source map.
 */
class SourceMapGenerator {
  constructor(aArgs) {
    if (!aArgs) {
      aArgs = {};
    }
    this._file = exports$1.getArg(aArgs, "file", null);
    this._sourceRoot = exports$1.getArg(aArgs, "sourceRoot", null);
    this._skipValidation = exports$1.getArg(aArgs, "skipValidation", false);
    this._sources = new ArraySet();
    this._names = new ArraySet();
    this._mappings = new MappingList();
    this._sourcesContents = null;
  }

  /**
   * Add a single mapping from original source line and column to the generated
   * source's line and column for this source map being created. The mapping
   * object should have the following properties:
   *
   *   - generated: An object with the generated line and column positions.
   *   - original: An object with the original line and column positions.
   *   - source: The original source file (relative to the sourceRoot).
   *   - name: An optional original token name for this mapping.
   */
  addMapping(aArgs) {
    const generated = exports$1.getArg(aArgs, "generated");
    const original = exports$1.getArg(aArgs, "original", null);
    let source = exports$1.getArg(aArgs, "source", null);
    let name = exports$1.getArg(aArgs, "name", null);

    if (!this._skipValidation) {
      this._validateMapping(generated, original, source, name);
    }

    if (source != null) {
      source = String(source);
      if (!this._sources.has(source)) {
        this._sources.add(source);
      }
    }

    if (name != null) {
      name = String(name);
      if (!this._names.has(name)) {
        this._names.add(name);
      }
    }

    this._mappings.add({
      generatedLine: generated.line,
      generatedColumn: generated.column,
      originalLine: original && original.line,
      originalColumn: original && original.column,
      source,
      name
    });
  }

  /**
   * Set the source content for a source file.
   */
  setSourceContent(aSourceFile, aSourceContent) {
    let source = aSourceFile;
    if (this._sourceRoot != null) {
      source = exports$1.relative(this._sourceRoot, source);
    }

    if (aSourceContent != null) {
      // Add the source content to the _sourcesContents map.
      // Create a new _sourcesContents map if the property is null.
      if (!this._sourcesContents) {
        this._sourcesContents = Object.create(null);
      }
      this._sourcesContents[exports$1.toSetString(source)] = aSourceContent;
    } else if (this._sourcesContents) {
      // Remove the source file from the _sourcesContents map.
      // If the _sourcesContents map is empty, set the property to null.
      delete this._sourcesContents[exports$1.toSetString(source)];
      if (Object.keys(this._sourcesContents).length === 0) {
        this._sourcesContents = null;
      }
    }
  }

  /**
   * A mapping can have one of the three levels of data:
   *
   *   1. Just the generated position.
   *   2. The Generated position, original position, and original source.
   *   3. Generated and original position, original source, as well as a name
   *      token.
   *
   * To maintain consistency, we validate that any new mapping being added falls
   * in to one of these categories.
   */
  _validateMapping(aGenerated, aOriginal, aSource, aName) {
    // When aOriginal is truthy but has empty values for .line and .column,
    // it is most likely a programmer error. In this case we throw a very
    // specific error message to try to guide them the right way.
    // For example: https://github.com/Polymer/polymer-bundler/pull/519
    if (
      aOriginal &&
      typeof aOriginal.line !== "number" &&
      typeof aOriginal.column !== "number"
    ) {
      throw new Error(
        "original.line and original.column are not numbers -- you probably meant to omit " +
          "the original mapping entirely and only map the generated position. If so, pass " +
          "null for the original mapping instead of an object with empty or null values."
      );
    }

    if (
      aGenerated &&
      "line" in aGenerated &&
      "column" in aGenerated &&
      aGenerated.line > 0 &&
      aGenerated.column >= 0 &&
      !aOriginal &&
      !aSource &&
      !aName
    ) ; else if (
      aGenerated &&
      "line" in aGenerated &&
      "column" in aGenerated &&
      aOriginal &&
      "line" in aOriginal &&
      "column" in aOriginal &&
      aGenerated.line > 0 &&
      aGenerated.column >= 0 &&
      aOriginal.line > 0 &&
      aOriginal.column >= 0 &&
      aSource
    ) ; else {
      throw new Error(
        "Invalid mapping: " +
          JSON.stringify({
            generated: aGenerated,
            source: aSource,
            original: aOriginal,
            name: aName
          })
      );
    }
  }

  /**
   * Serialize the accumulated mappings in to the stream of base 64 VLQs
   * specified by the source map format.
   */
  _serializeMappings() {
    let previousGeneratedColumn = 0;
    let previousGeneratedLine = 1;
    let previousOriginalColumn = 0;
    let previousOriginalLine = 0;
    let previousName = 0;
    let previousSource = 0;
    let result = "";
    let next;
    let mapping;
    let nameIdx;
    let sourceIdx;

    const mappings = this._mappings.toArray();
    for (let i = 0, len = mappings.length; i < len; i++) {
      mapping = mappings[i];
      next = "";

      if (mapping.generatedLine !== previousGeneratedLine) {
        previousGeneratedColumn = 0;
        while (mapping.generatedLine !== previousGeneratedLine) {
          next += ";";
          previousGeneratedLine++;
        }
      } else if (i > 0) {
        if (
          !exports$1.compareByGeneratedPositionsInflated(mapping, mappings[i - 1])
        ) {
          continue;
        }
        next += ",";
      }

      next += encode$1(
        mapping.generatedColumn - previousGeneratedColumn
      );
      previousGeneratedColumn = mapping.generatedColumn;

      if (mapping.source != null) {
        sourceIdx = this._sources.indexOf(mapping.source);
        next += encode$1(sourceIdx - previousSource);
        previousSource = sourceIdx;

        // lines are stored 0-based in SourceMap spec version 3
        next += encode$1(
          mapping.originalLine - 1 - previousOriginalLine
        );
        previousOriginalLine = mapping.originalLine - 1;

        next += encode$1(
          mapping.originalColumn - previousOriginalColumn
        );
        previousOriginalColumn = mapping.originalColumn;

        if (mapping.name != null) {
          nameIdx = this._names.indexOf(mapping.name);
          next += encode$1(nameIdx - previousName);
          previousName = nameIdx;
        }
      }

      result += next;
    }

    return result;
  }

  _generateSourcesContent(aSources, aSourceRoot) {
    return aSources.map(function(source) {
      if (!this._sourcesContents) {
        return null;
      }
      if (aSourceRoot != null) {
        source = exports$1.relative(aSourceRoot, source);
      }
      const key = exports$1.toSetString(source);
      return Object.prototype.hasOwnProperty.call(this._sourcesContents, key)
        ? this._sourcesContents[key]
        : null;
    }, this);
  }

  /**
   * Externalize the source map.
   */
  toJSON() {
    const map = {
      version: this._version,
      sources: this._sources.toArray(),
      names: this._names.toArray(),
      mappings: this._serializeMappings()
    };
    if (this._file != null) {
      map.file = this._file;
    }
    if (this._sourceRoot != null) {
      map.sourceRoot = this._sourceRoot;
    }
    if (this._sourcesContents) {
      map.sourcesContent = this._generateSourcesContent(
        map.sources,
        map.sourceRoot
      );
    }

    return map;
  }

  /**
   * Render the source map being generated to a string.
   */
  toString() {
    return JSON.stringify(this.toJSON());
  }
}

SourceMapGenerator.prototype._version = 3;

class FuncGenerator  {
    constructor(mb) {
        this.defaultBinders = [
            {match:"input[type=text]",binder:"textInput"},
            {match:"ul",binder:"foreach"},
            {match:"button",binder:"click"}
        ];
        this.mb = mb;
    }
    
    generateRootInsertFunc(template){
        return new Promise((resolve, reject) => {
            var tempElement = null;
            var templateName = "unnamed-template";
            if(typeof template === "string"){
                var temp = document.getElementById(template);
                if(temp != null){
                    if(temp.nodeName == 'LINK'){
                        templateName = temp.href;
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET",temp.href);
                        xhr.onreadystatechange = (function () {
                            if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                                resolve(this.buildInsertFuncWithSourceMap(xhr.responseText, templateName));
                            }
                        }).bind(this);
                        xhr.send();
                        return;
                    } else {
                        templateName = template;
                        tempElement = temp.content ? temp.content.cloneNode(true) : document.createRange().createContextualFragment(temp.innerHTML);
                    }
                } else {
                    var frag = document.createElement('template');
                    frag.innerHTML = template;
                    tempElement = frag.content;
                }
            } else {
                tempElement = template;
            }

            if(tempElement == null){
                resolve(this.buildInsertFuncWithSourceMap(document.body.childNodes, templateName, true));
            } else {
                resolve(this.buildInsertFuncWithSourceMap(tempElement, templateName));
            }
        });
    }

    buildInsertFuncWithSourceMap(e, sourceName, nodesExistAlready){
        var source;
        var mapObj = {root:[],offset:[],maps:[]};
        if(e.toString() === '[object NodeList]'){
            source = Array.prototype.reduce.call(e, function(html, node) {
                return html + ( node.outerHTML || node.nodeValue );
            }, "");
        }
        else if(typeof e == "string"){
            var frag = document.createElement('template');
            frag.innerHTML = e;
            e = frag.content;
            source = frag.innerHTML;
        }
        else {
            var temp = document.createElement('div');
            temp.appendChild( e.cloneNode(true) );
            source = temp.innerHTML.replace(/&amp;/g, "&");
        }
        
        var arr = [];
        var bindObjectArr = [];
        
        this.mb.bindObjectCount ++;
        this.buildInsertFuncBody(arr, bindObjectArr, e, 0, source, mapObj, nodesExistAlready);

        var map = new SourceMapGenerator({
            file: sourceName + ".template.map"
        });
        
        map.setSourceContent(sourceName + ".template.map", source);

        for (let i = 0; i < mapObj.maps.length; i++) {
            var m = mapObj.maps[i];
            map.addMapping({
                generated: {
                    line: m.newLine,
                    column: m.newColumn
                },
                source: sourceName + ".template.map",
                original: {
                    line: m.originalLine,
                    column: m.originalColumn
                },
                name: m.name
            });
        }

        arr.push("\n");
        arr.push("//# sourceMappingURL=data:text/plain;base64,");
        arr.push(btoa(map.toString()));
        arr.push("\n");

        arr.push("//# sourceURL=" + sourceName + ".template.js");
        arr.push("\n");
        

        var f = new Function('$context,n0,$funcElement', arr.join(''));
        //console.log(f);
        return f;
    }

    buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset, nodesExistAlready){
        arr.maxDepth = 0;
        arr.push("\nvar $mb = $context.mb;\n");
        arr.push("\nvar t = null;\n"); //, $index = null, $parent = null,$data = null;\n");
        arr.push("\nvar prev = null;\n"); 
        arr.push("\nvar $bindingContext = null;\n"); 
        arr.push("var renderedElements = [];\n");

        if(e.toString() === '[object NodeList]'){
            if(nodesExistAlready)
                e.forEach(n => this.executeBindingsFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
            else
                e.forEach(n => this.buildInsertFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
        }
        else {
            if(nodesExistAlready)
                this.executeBindingsFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
            else
                this.buildInsertFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
        }
        arr.push("if($funcElement){\n");
        arr.push("    if(!$funcElement.bindArray)$funcElement.bindArray=[];\n");
        arr.push("    $funcElement.bindArray[$context.$index || 0] = renderedElements;\n");
        arr.push("}\n");
        return arr;
    }

    executeBindingsFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        if(e.nodeType == 1){
            var bind = e.getAttribute("bind");
        }
    }

    buildInsertFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        var stop = false;
        if(e.nodeType == 1){
            if(e.nodeName == 'VIRTUAL'){
                arr.push("prev = ", "n", depth ,";\n");
                arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createDocumentFragment();\n");
                arr.push("n", depth ,".prev = prev;\n");
                arr.push("n", depth ,".parent = ", "n", depth -1, ";\n");
                arr.push("n", depth ,".getPreviousSibling = function(){return this.prev};\n");
            } else {
                arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createElement('", e.nodeName ,"');\n");
            }
            if(depth > arr.maxDepth)arr.maxDepth = depth;

            //arr.push("$context.$element = n", depth ,";\n");

            if (e.hasAttributes()) {
                var attrs = e.attributes;
                for(let i = attrs.length - 1; i >= 0; i--) {
                    const a = attrs[i].name;
                    var v = attrs[i].value;
                    if(a == 'bind'){
                        // If the bind attribute does not contain a colon then it is a single property accessor that uses the default binder
                        if(v.indexOf(":") == -1){
                            var defaultBinder = this.getDefaultBinder(e);
                            v = "{" + defaultBinder + ":" + v + "}";
                        }
                        if(!v.startsWith("{")) v = "{" + v + "}";
                        // Wrap all bind attribute object propeties with functions
                        var fakeContext = {$data:new FunctionTester(),$index: ()=>0};
                        var bindObject = new Function("$context", "with($context){with($data){ return " + v + "}}").call(fakeContext.$data, fakeContext);
                        for (const key in bindObject) {
                            v = v.replace(new RegExp(key + "\s*:"), key + ": ()=> ");
                        }

                        // check if the bind object has a binder that controls its children
                        stop = Object.keys(bindObject).some(r=> Object.keys(this.mb.subBinders).indexOf(r) >= 0);
                        var bindObjectIndex = funcIndex;
                        if(stop){
                            this.mb.bindObjectCount++;
                            bindObjectIndex = this.mb.bindObjectCount;
                            arr.push("$mb.bindObjects[" + bindObjectIndex + "] = (function anonymous($context,n0,$funcElement) {");
                            this.buildInsertFuncBody(arr, bindObjectArr, e.childNodes, bindObjectIndex, source, mapObj, offset);
                            arr.push("})\n");
                            arr.push("// ========================");
                            arr.push("\n");
                        }
                        arr.push("{");

                        var debugMapping = "";
                        if(source){
                            var eOuterHTML = e.outerHTML.replace(/&amp;/g, "&");
                            for (const key in bindObject) {
                                var newMatch = v.match(new RegExp(key + "\s*:"));
  
                                var newLine = 0;
                                var newColumn = 8 + newMatch.index + key.length + 6;
                                var originalLine = 0;
                                var orignalColumn = 0;

                                // Get the line number for this element
                                var contentBefore = source.substr(0, source.indexOf(eOuterHTML));
                                originalLine = (contentBefore.match(/\n/g)||[]).length + 1;

                                newLine = arr.join('').match(/\n/g).length + 5;// TODO: Perf

                                var contentOnLineBeforeElementStart = contentBefore.split('\n').slice(-1)[0].length;
                                var indexInElementTag = eOuterHTML.indexOf("bind=") + 6;
                                orignalColumn = contentOnLineBeforeElementStart + indexInElementTag;

                                var orignalMatch = eOuterHTML.match(new RegExp(key + "\s*:"));
                                if(orignalMatch){
                                    orignalColumn = contentOnLineBeforeElementStart + orignalMatch.index + key.length + 1;
                                }

                                mapObj.maps.push({newLine: newLine, newColumn: newColumn, originalLine: originalLine, originalColumn: orignalColumn, name: key});
                                debugMapping = debugMapping + "line: " + newLine + ", column: " + newColumn + ", originalline: " + originalLine + ", orignalColumn: " + orignalColumn;
                            }
                        }

                        arr.push("$bindingContext = $context.createSiblingContext();\n");
                        arr.push("$mb.executeBinding(n", depth, ", $bindingContext, (function(){with($bindingContext){with($data??{}){\nreturn ",v,"// " + debugMapping,"\n}}}).call($bindingContext.$data), ", bindObjectIndex, ");\n");
                        if(e.nodeName == 'VIRTUAL');
                        arr.push('}\n');
                    } else if(a == 'class'){
                        arr.push("n", depth, ".classList.add('", v, "');\n");
                    } else {
                        arr.push("n", depth, ".setAttribute('", a, "', '", v, "');\n");
                    }
                }
            }

            // if(e.nodeName == 'VIRTUAL'){
            //     if(depth-1==0)arr.push("renderedElements.push.apply(renderedElements, Array.from(n", depth, ".childNodes));\n\n");
            //     arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
            // } else {
                arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
                if(depth-1==0)arr.push("renderedElements.push(n", depth, ");\n\n");
            //}
        }
        else if(e.nodeType == 3){
            arr.push("t = document.createTextNode(`", e.nodeValue.replace(/\\/g, "\\\\"), "`);\n");
            arr.push("n", depth-1 ,".appendChild(t);\n\n");
            if(depth-1==0)arr.push("renderedElements.push(t);\n\n");
        }
        if(!stop)e.childNodes.forEach(n => this.buildInsertFuncVisit(n, arr, bindObjectArr, depth+1, funcIndex, source, mapObj, offset));
    }

    getDefaultBinder(e){
        for (let i = 0; i < this.defaultBinders.length; i++) {
            const d = this.defaultBinders[i];
            if(e.matches(d.match)) return d.binder;
        }
        return "text";
    }
}

/// This class is used to create a js object from the binding string so that we can get a list of its used properties. 
function FunctionTester() {
    this.has = function(obj, prop) {
        return true;
    };
    this.get = function(obj, prop, proxy) {
        if(prop == Symbol.unscopables) 
            return {};
        if(prop == Symbol.toPrimitive || prop == "toString")
            return ()=>"";
        return new FunctionTester();
    };
    this.set = function(obj, prop, val, proxy) {};
    this.apply = function(obj, thisArg, argumentsList) {
        return new FunctionTester();
    };

    return new Proxy(function() {}, this);
}

function ForBinder(context, readFunc)
{ 
    context.bind(readFunc, (v,o) => {
        var element = context.element;
        var frag = document.createDocumentFragment();
        var diff = v - (o || 0);
        if(diff > 0){
            for (let index = 0; index < diff; index++) {
                context.insertFunc.call(this, context.createChildContext(context.$data,index + (o||0)), frag, element);
            }

            if(o == null){
                element.appendChild(frag);
            } else {
                var insertAfterElements = element.bindArray[o-1];
                var insertAfterElement = insertAfterElements[insertAfterElements.length-1];
                insertAfterElement.after(frag);
            }
        }
        if(diff < 0){
            for (let i = o-1; i >= v; i--) {
                context.clearElement(i);
            }
        }
    }, context);
}

function ForEachBinder(context, readFunc)
{ 
    //var arr = readFunc.call(context.$data);
    //context.element.$array = arr;
    //context.element.bindArray = [];
    //arr._proxyHandler._bindElements.push(context.element);
    // var frag = document.createDocumentFragment();
    // for (let index = 0; index < arr.length; index++) {
    //     const item = arr[index];
    //     if(arr.childContexts[index] == null){
    //         arr.childContexts[index] = context.createChildContext(item,index);
    //     }
    //     context.insertFunc.call(item, arr.childContexts[index], frag, context.element);
    // }
    // context.element.appendChild(frag);

    context.bind(readFunc, (newValue, oldValue, startIndex, deleteCount, pushCount) => {
        var element = context.element;

        if(oldValue == null){
            var frag = document.createDocumentFragment();
            for (let index = 0; index < newValue.length; index++) {
                const item = newValue[index];
                context.insertFunc.call(this, context.createChildContext(item,index), frag, element);
            }
            element.appendChild(frag);
            context.commitElement();
        }
        
        if(deleteCount > 0){
            for (let index = 0; index < deleteCount; index++) {
                context.clearElement(startIndex + index);
            }
            var newArgs = [];
            newArgs[0] = startIndex;
            newArgs[1] = deleteCount;
            for(let na=0;na<pushCount;na++)newArgs[na+2] = [];
            Array.prototype.splice.apply(element.bindArray, newArgs);
        }
           
        if(pushCount > 0){
            var frag = document.createDocumentFragment();
            for (let index = 0; index < pushCount; index++) {
                const item = newValue[startIndex + index];
                context.insertFunc.call(this, context.createChildContext(item,startIndex + index), frag, element);
            }

            var insertAfterElements = element.bindArray[startIndex-1];
            var insertAfterElement = insertAfterElements[insertAfterElements.length-1];
            insertAfterElement.after(frag);
        }
    }, context);
}

function ComponentBinder(e, c, js, boi)
{ 
    var jsobj = js();
    var component = c.mb.components[jsobj.name];

    e.$context = c;

    // insertFuncs for components may be using templates from external files which may not be loaded at the point this is called.
    // Use a Promise so the component will render when the template is loaded
    //Promise.resolve(component.insertFunc).then(function(insertFunc) {
        e.insertFunc = component.insertFunc; //insertFunc || 
        var frag = document.createDocumentFragment();
        var model = component.viewModel == null ? c.$data : new component.viewModel(c.mb, jsobj.params);

        model = c.mb.wrap(model);

        var childContext = new BindingContext(c.mb,model,0,c);
        e.insertFunc.call(model, childContext, frag, e);
        e.appendChild(frag);
    //});
}

function IfBinder(context, readFunc)
{ 
    context._if = false;
    context.bind(readFunc, (v,o) => {
        if(v && !context._if){
            var frag = document.createDocumentFragment();
            context.insertFunc.call(context.$data, context, frag, context.element);
            context.element.appendChild(frag);
            context.commitElement();
            context._if = true;
        } else if(!v && context._if) {
            context.clearElement(0);
            context._if = false;
        }
    });
}

class MicroBinder extends MicroBinderCore {

    constructor() {
        super();
        var self = this;
        this.components = {
            register:function(name, componentDescriptor){
                this[name] = componentDescriptor;
                this[name].insertFunc = self.build(componentDescriptor.template).then(insertFunc => {
                    this[name].insertFunc = insertFunc;
                });
                return this[name].insertFunc;
            }
        };
        this.funcGen = new FuncGenerator(this);
        this.binders = {
            text:(e, c, js)=>this.bind(js, (v,o) => e.innerText = v, c),
            html:(e, c, js)=>this.bind(js, (v,o) => e.innerHTML = v, c),
            value:(e, c, js)=>{
                this.bind(js, (v,o) => e.value = v||'', c);
                e.addEventListener("change", (event) => this.setValue(c, js, event.target.value));
            },
            textInput:(e, c, js)=>{
                this.bind(js, (v,o) => e.value = v||'', c);
                e.addEventListener("input", (event) => this.setValue(c, js, event.target.value));
            },
            checked:(e, c, js)=>{
                this.bind(js, (v,o) => {
                    if(v)e.setAttribute("checked","");
                    else e.removeAttribute("checked","");
                }, c);
                e.addEventListener("change", (event) => this.setValue(c, js, event.target.checked));
            },
            hasFocus:(e, c, js)=>{
                this.bind(js, (v,o) => v ? e.focus() : e.blur(), c);
                e.addEventListener("focus", (event) => this.setValue(c, js, true));
                e.addEventListener("blur", (event) => this.setValue(c, js, false));
            },
            class:(e,c,js)=>{
                var jsobj = js();
                this.bind(js, (v,o) => {
                    if(typeof o == "string"){
                        o.split(' ').forEach(x=>{
                            if(x != "")
                                e.classList.remove(x);
                        });
                    }
                    v.split(' ').forEach(x=>{
                        if(x != "")
                            e.classList.add(x);
                    });
                }, c);
            },
            css:(e,c,js)=>{
                // Add a binding for each css class
                var jsobj = js();
                if(typeof jsobj == "string"){
                    this.bind(js, (v,o) => {
                        if(typeof o == "string"){
                            o.split(' ').forEach(x=>{
                                if(x != "")
                                    e.classList.remove(x);
                            });
                        }
                        v.split(' ').forEach(x=>{
                            if(x != "")
                                e.classList.add(x);
                        });
                    }, c);
                } else {
                    for (const key in jsobj) {
                        this.bind(jsobj[key], (v,o) => v?e.classList.add(key):e.classList.remove(key), c);
                    }
                }
            },
            attr:(e,c,js)=>{
                // Add a binding for each attribute
                var jsobj = js();
                for (const key in jsobj) {
                    this.bind(jsobj[key], (v,o) => e.setAttribute(key, v), c);
                }
            },
            prop:(e,c,js)=>{
                // Add a binding for each property
                var jsobj = js();
                var settingValue = false;
                for (const key in jsobj) {
                    this.bind(jsobj[key], (v,o) => {
                        if(e.proxy[key] != v){
                            settingValue = true;
                            e.proxy[key] = v;
                            settingValue = false;
                        }
                    }, c);
                }
                e.addEventListener("propchange", (event) => {
                    if(js()[event.name] != null && settingValue == false){
                        this.setValue(c, jsobj[event.name], event.newValue);
                    }
                });
            },
            props:(e,c,js)=>{
                // Add a binding for the entire object changing
                var settingValue = false;
                this.bind(js, (o,obj) => {
                    // Add a binding for each property
                    for (const key in obj) {
                        this.bind(obj, ()=>obj[key], (v,o) => {
                            if(e.proxy[key] != v){
                                settingValue = true;
                                e.proxy[key] = v;
                                settingValue = false;
                            }
                        });
                    }
                }, c);
                e.addEventListener("propchange", (event) => {
                    var obj = js();
                    if(obj[event.name] != null && settingValue == false){
                        this.setValue(obj, ()=>obj[event.name], event.newValue);
                    }
                });
            },
            style:(e,c,js)=>{
                // Add a binding for each style
                var jsobj = js();
                for (const key in jsobj){
                    this.bind(jsobj[key], (v,o) => e.style[key]=v, c);
                }
            },
            visible: (e, c, js)=> this.bind(js, (v,o) => e.style.display = v ? null : "none", c),
            click: (e, c, js)=> e.addEventListener("click", (event) => js().call(c.$data, c.$data, event)),
            enter:(e, c, js)=>{e.addEventListener("keypress", (event) => {if(event.keyCode === 13){js()(c.$data, event);}});},
            submit: (e, c, js)=> e.addEventListener("submit", (event) => js()(c.$data, event)),
            if: IfBinder,
            with: (e, c, js, boi) => {
                e.insertFunc = this.funcGen.bindObjects[boi];
                e.$context = c;
                this.bind(js, (v,o) => {
                    e.innerHTML = "";
                    var frag = document.createDocumentFragment();
                    //e.insertFunc.call(v, v, 0, frag, e, null, v.$parent);
                    e.insertFunc.call(v, new BindingContext(this,v,0,c), frag, e);
                    e.appendChild(frag);
                }, c);
            },
            for: ForBinder,
            foreach: ForEachBinder,
            component: ComponentBinder,
            selectedOptions:(e,c,js)=>{
                this.bind(js, (v,o) => {
                    var vs = v.map(s=>s.toString());
                    Array.from(e.options).forEach(o=>o.selected = vs.indexOf(o.value)>-1);
                }, c);
                e.addEventListener("change", (event) => {
                    var selectedOptions = Array.from(event.target.selectedOptions).map((x)=>x.value);
                    this.setValue(c, js, selectedOptions);
                });
            },
            event:(e,c,js)=>{
                // Add a binding for each event
                var jsobj = js();
                for (const key in jsobj) {
                    const element = jsobj[key];
                    e.addEventListener(key, (event) => element.call(c.$data, e, event));
                }
            },
            enable:(e,c,js)=>{
                this.bind(js, (v,o) => !v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'), c);      
            },
            disable:(e,c,js)=>{
                this.bind(js, (v,o) => v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'), c);      
            }
        };
        this.subBinders = {if:1,with:1,foreach:1,for:1};
        this.bindObjects = [];
        this.bindObjectCount = -1;
    }

    applyBindings(model,rootElement, template){
        return this.build(template).then(insertFunc => {
            return this.run(model, rootElement || document.body, insertFunc);
       });
    }

    build(template){
        return new Promise((resolve, reject) => {
            this.funcGen.generateRootInsertFunc(template).then(insertFunc => {
                resolve(insertFunc);
            }).catch(err => reject(err));
        });
    }

    run(model, target, insertFunc){
        var modelProxy = this.wrap(model);
        var rootContext = new BindingContext(this, modelProxy);
        insertFunc.call(this, rootContext, target);
        return modelProxy;
    }

    executeBinding(e, $context, o, boi){
        e.$context = $context;
        $context.element = e;
        $context.insertFunc = this.bindObjects[boi];
        var stopBindingChildren = false;
        for (var p in o) {
            if(p == "foreach" || p == "for" || p == "if"){
                stopBindingChildren = this.binders[p]($context, o[p]) | stopBindingChildren;
            } else {
                stopBindingChildren = this.binders[p](e, $context, o[p], boi) | stopBindingChildren;
            }
        }
    
        return stopBindingChildren;
    }

    setValue($context, triggerFunc, value){
        this._settingValue = true;
        this._setStack = [];
        var val = triggerFunc.call($context.$data);
        this._settingValue = false;
        if(this._setStack.length > 0){
            this._setStack.pop()(value);
        }
    }
}

//export default new MicroBinder();

export default MicroBinder;
