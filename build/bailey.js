!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.bailey=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process,global){
/* @preserve
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Petka Antonov
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:</p>
 * 
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 * 
 */
/**
 * bluebird build version 2.9.24
 * Features enabled: core, race, call_get, generators, map, nodeify, promisify, props, reduce, settle, some, cancel, using, filter, any, each, timers
*/
!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Promise=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof _dereq_=="function"&&_dereq_;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof _dereq_=="function"&&_dereq_;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var SomePromiseArray = Promise._SomePromiseArray;
function any(promises) {
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(1);
    ret.setUnwrap();
    ret.init();
    return promise;
}

Promise.any = function (promises) {
    return any(promises);
};

Promise.prototype.any = function () {
    return any(this);
};

};

},{}],2:[function(_dereq_,module,exports){
"use strict";
var firstLineError;
try {throw new Error(); } catch (e) {firstLineError = e;}
var schedule = _dereq_("./schedule.js");
var Queue = _dereq_("./queue.js");
var util = _dereq_("./util.js");

function Async() {
    this._isTickUsed = false;
    this._lateQueue = new Queue(16);
    this._normalQueue = new Queue(16);
    this._trampolineEnabled = true;
    var self = this;
    this.drainQueues = function () {
        self._drainQueues();
    };
    this._schedule =
        schedule.isStatic ? schedule(this.drainQueues) : schedule;
}

Async.prototype.disableTrampolineIfNecessary = function() {
    if (util.hasDevTools) {
        this._trampolineEnabled = false;
    }
};

Async.prototype.enableTrampoline = function() {
    if (!this._trampolineEnabled) {
        this._trampolineEnabled = true;
        this._schedule = function(fn) {
            setTimeout(fn, 0);
        };
    }
};

Async.prototype.haveItemsQueued = function () {
    return this._normalQueue.length() > 0;
};

Async.prototype.throwLater = function(fn, arg) {
    if (arguments.length === 1) {
        arg = fn;
        fn = function () { throw arg; };
    }
    var domain = this._getDomain();
    if (domain !== undefined) fn = domain.bind(fn);
    if (typeof setTimeout !== "undefined") {
        setTimeout(function() {
            fn(arg);
        }, 0);
    } else try {
        this._schedule(function() {
            fn(arg);
        });
    } catch (e) {
        throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
    }
};

Async.prototype._getDomain = function() {};

if (util.isNode) {
    var EventsModule = _dereq_("events");

    var domainGetter = function() {
        var domain = process.domain;
        if (domain === null) return undefined;
        return domain;
    };

    if (EventsModule.usingDomains) {
        Async.prototype._getDomain = domainGetter;
    } else {
        var descriptor =
            Object.getOwnPropertyDescriptor(EventsModule, "usingDomains");

        if (!descriptor.configurable) {
            process.on("domainsActivated", function() {
                Async.prototype._getDomain = domainGetter;
            });
        } else {
            var usingDomains = false;
            Object.defineProperty(EventsModule, "usingDomains", {
                configurable: false,
                enumerable: true,
                get: function() {
                    return usingDomains;
                },
                set: function(value) {
                    if (usingDomains || !value) return;
                    usingDomains = true;
                    Async.prototype._getDomain = domainGetter;
                    util.toFastProperties(process);
                    process.emit("domainsActivated");
                }
            });
        }


    }
}

function AsyncInvokeLater(fn, receiver, arg) {
    var domain = this._getDomain();
    if (domain !== undefined) fn = domain.bind(fn);
    this._lateQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncInvoke(fn, receiver, arg) {
    var domain = this._getDomain();
    if (domain !== undefined) fn = domain.bind(fn);
    this._normalQueue.push(fn, receiver, arg);
    this._queueTick();
}

function AsyncSettlePromises(promise) {
    var domain = this._getDomain();
    if (domain !== undefined) {
        var fn = domain.bind(promise._settlePromises);
        this._normalQueue.push(fn, promise, undefined);
    } else {
        this._normalQueue._pushOne(promise);
    }
    this._queueTick();
}

if (!util.hasDevTools) {
    Async.prototype.invokeLater = AsyncInvokeLater;
    Async.prototype.invoke = AsyncInvoke;
    Async.prototype.settlePromises = AsyncSettlePromises;
} else {
    Async.prototype.invokeLater = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvokeLater.call(this, fn, receiver, arg);
        } else {
            setTimeout(function() {
                fn.call(receiver, arg);
            }, 100);
        }
    };

    Async.prototype.invoke = function (fn, receiver, arg) {
        if (this._trampolineEnabled) {
            AsyncInvoke.call(this, fn, receiver, arg);
        } else {
            setTimeout(function() {
                fn.call(receiver, arg);
            }, 0);
        }
    };

    Async.prototype.settlePromises = function(promise) {
        if (this._trampolineEnabled) {
            AsyncSettlePromises.call(this, promise);
        } else {
            setTimeout(function() {
                promise._settlePromises();
            }, 0);
        }
    };
}

Async.prototype.invokeFirst = function (fn, receiver, arg) {
    var domain = this._getDomain();
    if (domain !== undefined) fn = domain.bind(fn);
    this._normalQueue.unshift(fn, receiver, arg);
    this._queueTick();
};

Async.prototype._drainQueue = function(queue) {
    while (queue.length() > 0) {
        var fn = queue.shift();
        if (typeof fn !== "function") {
            fn._settlePromises();
            continue;
        }
        var receiver = queue.shift();
        var arg = queue.shift();
        fn.call(receiver, arg);
    }
};

Async.prototype._drainQueues = function () {
    this._drainQueue(this._normalQueue);
    this._reset();
    this._drainQueue(this._lateQueue);
};

Async.prototype._queueTick = function () {
    if (!this._isTickUsed) {
        this._isTickUsed = true;
        this._schedule(this.drainQueues);
    }
};

Async.prototype._reset = function () {
    this._isTickUsed = false;
};

module.exports = new Async();
module.exports.firstLineError = firstLineError;

},{"./queue.js":28,"./schedule.js":31,"./util.js":38,"events":39}],3:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise) {
var rejectThis = function(_, e) {
    this._reject(e);
};

var targetRejected = function(e, context) {
    context.promiseRejectionQueued = true;
    context.bindingPromise._then(rejectThis, rejectThis, null, this, e);
};

var bindingResolved = function(thisArg, context) {
    this._setBoundTo(thisArg);
    if (this._isPending()) {
        this._resolveCallback(context.target);
    }
};

var bindingRejected = function(e, context) {
    if (!context.promiseRejectionQueued) this._reject(e);
};

Promise.prototype.bind = function (thisArg) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);
    ret._propagateFrom(this, 1);
    var target = this._target();
    if (maybePromise instanceof Promise) {
        var context = {
            promiseRejectionQueued: false,
            promise: ret,
            target: target,
            bindingPromise: maybePromise
        };
        target._then(INTERNAL, targetRejected, ret._progress, ret, context);
        maybePromise._then(
            bindingResolved, bindingRejected, ret._progress, ret, context);
    } else {
        ret._setBoundTo(thisArg);
        ret._resolveCallback(target);
    }
    return ret;
};

Promise.prototype._setBoundTo = function (obj) {
    if (obj !== undefined) {
        this._bitField = this._bitField | 131072;
        this._boundTo = obj;
    } else {
        this._bitField = this._bitField & (~131072);
    }
};

Promise.prototype._isBound = function () {
    return (this._bitField & 131072) === 131072;
};

Promise.bind = function (thisArg, value) {
    var maybePromise = tryConvertToPromise(thisArg);
    var ret = new Promise(INTERNAL);

    if (maybePromise instanceof Promise) {
        maybePromise._then(function(thisArg) {
            ret._setBoundTo(thisArg);
            ret._resolveCallback(value);
        }, ret._reject, ret._progress, ret, null);
    } else {
        ret._setBoundTo(thisArg);
        ret._resolveCallback(value);
    }
    return ret;
};
};

},{}],4:[function(_dereq_,module,exports){
"use strict";
var old;
if (typeof Promise !== "undefined") old = Promise;
function noConflict() {
    try { if (Promise === bluebird) Promise = old; }
    catch (e) {}
    return bluebird;
}
var bluebird = _dereq_("./promise.js")();
bluebird.noConflict = noConflict;
module.exports = bluebird;

},{"./promise.js":23}],5:[function(_dereq_,module,exports){
"use strict";
var cr = Object.create;
if (cr) {
    var callerCache = cr(null);
    var getterCache = cr(null);
    callerCache[" size"] = getterCache[" size"] = 0;
}

module.exports = function(Promise) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var isIdentifier = util.isIdentifier;

var getMethodCaller;
var getGetter;
if (!true) {
var makeMethodCaller = function (methodName) {
    return new Function("ensureMethod", "                                    \n\
        return function(obj) {                                               \n\
            'use strict'                                                     \n\
            var len = this.length;                                           \n\
            ensureMethod(obj, 'methodName');                                 \n\
            switch(len) {                                                    \n\
                case 1: return obj.methodName(this[0]);                      \n\
                case 2: return obj.methodName(this[0], this[1]);             \n\
                case 3: return obj.methodName(this[0], this[1], this[2]);    \n\
                case 0: return obj.methodName();                             \n\
                default:                                                     \n\
                    return obj.methodName.apply(obj, this);                  \n\
            }                                                                \n\
        };                                                                   \n\
        ".replace(/methodName/g, methodName))(ensureMethod);
};

var makeGetter = function (propertyName) {
    return new Function("obj", "                                             \n\
        'use strict';                                                        \n\
        return obj.propertyName;                                             \n\
        ".replace("propertyName", propertyName));
};

var getCompiled = function(name, compiler, cache) {
    var ret = cache[name];
    if (typeof ret !== "function") {
        if (!isIdentifier(name)) {
            return null;
        }
        ret = compiler(name);
        cache[name] = ret;
        cache[" size"]++;
        if (cache[" size"] > 512) {
            var keys = Object.keys(cache);
            for (var i = 0; i < 256; ++i) delete cache[keys[i]];
            cache[" size"] = keys.length - 256;
        }
    }
    return ret;
};

getMethodCaller = function(name) {
    return getCompiled(name, makeMethodCaller, callerCache);
};

getGetter = function(name) {
    return getCompiled(name, makeGetter, getterCache);
};
}

function ensureMethod(obj, methodName) {
    var fn;
    if (obj != null) fn = obj[methodName];
    if (typeof fn !== "function") {
        var message = "Object " + util.classString(obj) + " has no method '" +
            util.toString(methodName) + "'";
        throw new Promise.TypeError(message);
    }
    return fn;
}

function caller(obj) {
    var methodName = this.pop();
    var fn = ensureMethod(obj, methodName);
    return fn.apply(obj, this);
}
Promise.prototype.call = function (methodName) {
    var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
    if (!true) {
        if (canEvaluate) {
            var maybeCaller = getMethodCaller(methodName);
            if (maybeCaller !== null) {
                return this._then(
                    maybeCaller, undefined, undefined, args, undefined);
            }
        }
    }
    args.push(methodName);
    return this._then(caller, undefined, undefined, args, undefined);
};

function namedGetter(obj) {
    return obj[this];
}
function indexedGetter(obj) {
    var index = +this;
    if (index < 0) index = Math.max(0, index + obj.length);
    return obj[index];
}
Promise.prototype.get = function (propertyName) {
    var isIndex = (typeof propertyName === "number");
    var getter;
    if (!isIndex) {
        if (canEvaluate) {
            var maybeGetter = getGetter(propertyName);
            getter = maybeGetter !== null ? maybeGetter : namedGetter;
        } else {
            getter = namedGetter;
        }
    } else {
        getter = indexedGetter;
    }
    return this._then(getter, undefined, undefined, propertyName, undefined);
};
};

},{"./util.js":38}],6:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var errors = _dereq_("./errors.js");
var async = _dereq_("./async.js");
var CancellationError = errors.CancellationError;

Promise.prototype._cancel = function (reason) {
    if (!this.isCancellable()) return this;
    var parent;
    var promiseToReject = this;
    while ((parent = promiseToReject._cancellationParent) !== undefined &&
        parent.isCancellable()) {
        promiseToReject = parent;
    }
    this._unsetCancellable();
    promiseToReject._target()._rejectCallback(reason, false, true);
};

Promise.prototype.cancel = function (reason) {
    if (!this.isCancellable()) return this;
    if (reason === undefined) reason = new CancellationError();
    async.invokeLater(this._cancel, this, reason);
    return this;
};

Promise.prototype.cancellable = function () {
    if (this._cancellable()) return this;
    async.enableTrampoline();
    this._setCancellable();
    this._cancellationParent = undefined;
    return this;
};

Promise.prototype.uncancellable = function () {
    var ret = this.then();
    ret._unsetCancellable();
    return ret;
};

Promise.prototype.fork = function (didFulfill, didReject, didProgress) {
    var ret = this._then(didFulfill, didReject, didProgress,
                         undefined, undefined);

    ret._setCancellable();
    ret._cancellationParent = undefined;
    return ret;
};
};

},{"./async.js":2,"./errors.js":13}],7:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var bluebirdFramePattern =
    /[\\\/]bluebird[\\\/]js[\\\/](main|debug|zalgo|instrumented)/;
var stackFramePattern = null;
var formatStack = null;
var indentStackFrames = false;
var warn;

function CapturedTrace(parent) {
    this._parent = parent;
    var length = this._length = 1 + (parent === undefined ? 0 : parent._length);
    captureStackTrace(this, CapturedTrace);
    if (length > 32) this.uncycle();
}
util.inherits(CapturedTrace, Error);

CapturedTrace.prototype.uncycle = function() {
    var length = this._length;
    if (length < 2) return;
    var nodes = [];
    var stackToIndex = {};

    for (var i = 0, node = this; node !== undefined; ++i) {
        nodes.push(node);
        node = node._parent;
    }
    length = this._length = i;
    for (var i = length - 1; i >= 0; --i) {
        var stack = nodes[i].stack;
        if (stackToIndex[stack] === undefined) {
            stackToIndex[stack] = i;
        }
    }
    for (var i = 0; i < length; ++i) {
        var currentStack = nodes[i].stack;
        var index = stackToIndex[currentStack];
        if (index !== undefined && index !== i) {
            if (index > 0) {
                nodes[index - 1]._parent = undefined;
                nodes[index - 1]._length = 1;
            }
            nodes[i]._parent = undefined;
            nodes[i]._length = 1;
            var cycleEdgeNode = i > 0 ? nodes[i - 1] : this;

            if (index < length - 1) {
                cycleEdgeNode._parent = nodes[index + 1];
                cycleEdgeNode._parent.uncycle();
                cycleEdgeNode._length =
                    cycleEdgeNode._parent._length + 1;
            } else {
                cycleEdgeNode._parent = undefined;
                cycleEdgeNode._length = 1;
            }
            var currentChildLength = cycleEdgeNode._length + 1;
            for (var j = i - 2; j >= 0; --j) {
                nodes[j]._length = currentChildLength;
                currentChildLength++;
            }
            return;
        }
    }
};

CapturedTrace.prototype.parent = function() {
    return this._parent;
};

CapturedTrace.prototype.hasParent = function() {
    return this._parent !== undefined;
};

CapturedTrace.prototype.attachExtraTrace = function(error) {
    if (error.__stackCleaned__) return;
    this.uncycle();
    var parsed = CapturedTrace.parseStackAndMessage(error);
    var message = parsed.message;
    var stacks = [parsed.stack];

    var trace = this;
    while (trace !== undefined) {
        stacks.push(cleanStack(trace.stack.split("\n")));
        trace = trace._parent;
    }
    removeCommonRoots(stacks);
    removeDuplicateOrEmptyJumps(stacks);
    util.notEnumerableProp(error, "stack", reconstructStack(message, stacks));
    util.notEnumerableProp(error, "__stackCleaned__", true);
};

function reconstructStack(message, stacks) {
    for (var i = 0; i < stacks.length - 1; ++i) {
        stacks[i].push("From previous event:");
        stacks[i] = stacks[i].join("\n");
    }
    if (i < stacks.length) {
        stacks[i] = stacks[i].join("\n");
    }
    return message + "\n" + stacks.join("\n");
}

function removeDuplicateOrEmptyJumps(stacks) {
    for (var i = 0; i < stacks.length; ++i) {
        if (stacks[i].length === 0 ||
            ((i + 1 < stacks.length) && stacks[i][0] === stacks[i+1][0])) {
            stacks.splice(i, 1);
            i--;
        }
    }
}

function removeCommonRoots(stacks) {
    var current = stacks[0];
    for (var i = 1; i < stacks.length; ++i) {
        var prev = stacks[i];
        var currentLastIndex = current.length - 1;
        var currentLastLine = current[currentLastIndex];
        var commonRootMeetPoint = -1;

        for (var j = prev.length - 1; j >= 0; --j) {
            if (prev[j] === currentLastLine) {
                commonRootMeetPoint = j;
                break;
            }
        }

        for (var j = commonRootMeetPoint; j >= 0; --j) {
            var line = prev[j];
            if (current[currentLastIndex] === line) {
                current.pop();
                currentLastIndex--;
            } else {
                break;
            }
        }
        current = prev;
    }
}

function cleanStack(stack) {
    var ret = [];
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        var isTraceLine = stackFramePattern.test(line) ||
            "    (No stack trace)" === line;
        var isInternalFrame = isTraceLine && shouldIgnore(line);
        if (isTraceLine && !isInternalFrame) {
            if (indentStackFrames && line.charAt(0) !== " ") {
                line = "    " + line;
            }
            ret.push(line);
        }
    }
    return ret;
}

function stackFramesAsArray(error) {
    var stack = error.stack.replace(/\s+$/g, "").split("\n");
    for (var i = 0; i < stack.length; ++i) {
        var line = stack[i];
        if ("    (No stack trace)" === line || stackFramePattern.test(line)) {
            break;
        }
    }
    if (i > 0) {
        stack = stack.slice(i);
    }
    return stack;
}

CapturedTrace.parseStackAndMessage = function(error) {
    var stack = error.stack;
    var message = error.toString();
    stack = typeof stack === "string" && stack.length > 0
                ? stackFramesAsArray(error) : ["    (No stack trace)"];
    return {
        message: message,
        stack: cleanStack(stack)
    };
};

CapturedTrace.formatAndLogError = function(error, title) {
    if (typeof console !== "undefined") {
        var message;
        if (typeof error === "object" || typeof error === "function") {
            var stack = error.stack;
            message = title + formatStack(stack, error);
        } else {
            message = title + String(error);
        }
        if (typeof warn === "function") {
            warn(message);
        } else if (typeof console.log === "function" ||
            typeof console.log === "object") {
            console.log(message);
        }
    }
};

CapturedTrace.unhandledRejection = function (reason) {
    CapturedTrace.formatAndLogError(reason, "^--- With additional stack trace: ");
};

CapturedTrace.isSupported = function () {
    return typeof captureStackTrace === "function";
};

CapturedTrace.fireRejectionEvent =
function(name, localHandler, reason, promise) {
    var localEventFired = false;
    try {
        if (typeof localHandler === "function") {
            localEventFired = true;
            if (name === "rejectionHandled") {
                localHandler(promise);
            } else {
                localHandler(reason, promise);
            }
        }
    } catch (e) {
        async.throwLater(e);
    }

    var globalEventFired = false;
    try {
        globalEventFired = fireGlobalEvent(name, reason, promise);
    } catch (e) {
        globalEventFired = true;
        async.throwLater(e);
    }

    var domEventFired = false;
    if (fireDomEvent) {
        try {
            domEventFired = fireDomEvent(name.toLowerCase(), {
                reason: reason,
                promise: promise
            });
        } catch (e) {
            domEventFired = true;
            async.throwLater(e);
        }
    }

    if (!globalEventFired && !localEventFired && !domEventFired &&
        name === "unhandledRejection") {
        CapturedTrace.formatAndLogError(reason, "Unhandled rejection ");
    }
};

function formatNonError(obj) {
    var str;
    if (typeof obj === "function") {
        str = "[function " +
            (obj.name || "anonymous") +
            "]";
    } else {
        str = obj.toString();
        var ruselessToString = /\[object [a-zA-Z0-9$_]+\]/;
        if (ruselessToString.test(str)) {
            try {
                var newStr = JSON.stringify(obj);
                str = newStr;
            }
            catch(e) {

            }
        }
        if (str.length === 0) {
            str = "(empty array)";
        }
    }
    return ("(<" + snip(str) + ">, no stack trace)");
}

function snip(str) {
    var maxChars = 41;
    if (str.length < maxChars) {
        return str;
    }
    return str.substr(0, maxChars - 3) + "...";
}

var shouldIgnore = function() { return false; };
var parseLineInfoRegex = /[\/<\(]([^:\/]+):(\d+):(?:\d+)\)?\s*$/;
function parseLineInfo(line) {
    var matches = line.match(parseLineInfoRegex);
    if (matches) {
        return {
            fileName: matches[1],
            line: parseInt(matches[2], 10)
        };
    }
}
CapturedTrace.setBounds = function(firstLineError, lastLineError) {
    if (!CapturedTrace.isSupported()) return;
    var firstStackLines = firstLineError.stack.split("\n");
    var lastStackLines = lastLineError.stack.split("\n");
    var firstIndex = -1;
    var lastIndex = -1;
    var firstFileName;
    var lastFileName;
    for (var i = 0; i < firstStackLines.length; ++i) {
        var result = parseLineInfo(firstStackLines[i]);
        if (result) {
            firstFileName = result.fileName;
            firstIndex = result.line;
            break;
        }
    }
    for (var i = 0; i < lastStackLines.length; ++i) {
        var result = parseLineInfo(lastStackLines[i]);
        if (result) {
            lastFileName = result.fileName;
            lastIndex = result.line;
            break;
        }
    }
    if (firstIndex < 0 || lastIndex < 0 || !firstFileName || !lastFileName ||
        firstFileName !== lastFileName || firstIndex >= lastIndex) {
        return;
    }

    shouldIgnore = function(line) {
        if (bluebirdFramePattern.test(line)) return true;
        var info = parseLineInfo(line);
        if (info) {
            if (info.fileName === firstFileName &&
                (firstIndex <= info.line && info.line <= lastIndex)) {
                return true;
            }
        }
        return false;
    };
};

var captureStackTrace = (function stackDetection() {
    var v8stackFramePattern = /^\s*at\s*/;
    var v8stackFormatter = function(stack, error) {
        if (typeof stack === "string") return stack;

        if (error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    if (typeof Error.stackTraceLimit === "number" &&
        typeof Error.captureStackTrace === "function") {
        Error.stackTraceLimit = Error.stackTraceLimit + 6;
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        var captureStackTrace = Error.captureStackTrace;

        shouldIgnore = function(line) {
            return bluebirdFramePattern.test(line);
        };
        return function(receiver, ignoreUntil) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            captureStackTrace(receiver, ignoreUntil);
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }
    var err = new Error();

    if (typeof err.stack === "string" &&
        err.stack.split("\n")[0].indexOf("stackDetection@") >= 0) {
        stackFramePattern = /@/;
        formatStack = v8stackFormatter;
        indentStackFrames = true;
        return function captureStackTrace(o) {
            o.stack = new Error().stack;
        };
    }

    var hasStackAfterThrow;
    try { throw new Error(); }
    catch(e) {
        hasStackAfterThrow = ("stack" in e);
    }
    if (!("stack" in err) && hasStackAfterThrow) {
        stackFramePattern = v8stackFramePattern;
        formatStack = v8stackFormatter;
        return function captureStackTrace(o) {
            Error.stackTraceLimit = Error.stackTraceLimit + 6;
            try { throw new Error(); }
            catch(e) { o.stack = e.stack; }
            Error.stackTraceLimit = Error.stackTraceLimit - 6;
        };
    }

    formatStack = function(stack, error) {
        if (typeof stack === "string") return stack;

        if ((typeof error === "object" ||
            typeof error === "function") &&
            error.name !== undefined &&
            error.message !== undefined) {
            return error.toString();
        }
        return formatNonError(error);
    };

    return null;

})([]);

var fireDomEvent;
var fireGlobalEvent = (function() {
    if (util.isNode) {
        return function(name, reason, promise) {
            if (name === "rejectionHandled") {
                return process.emit(name, promise);
            } else {
                return process.emit(name, reason, promise);
            }
        };
    } else {
        var customEventWorks = false;
        var anyEventWorks = true;
        try {
            var ev = new self.CustomEvent("test");
            customEventWorks = ev instanceof CustomEvent;
        } catch (e) {}
        if (!customEventWorks) {
            try {
                var event = document.createEvent("CustomEvent");
                event.initCustomEvent("testingtheevent", false, true, {});
                self.dispatchEvent(event);
            } catch (e) {
                anyEventWorks = false;
            }
        }
        if (anyEventWorks) {
            fireDomEvent = function(type, detail) {
                var event;
                if (customEventWorks) {
                    event = new self.CustomEvent(type, {
                        detail: detail,
                        bubbles: false,
                        cancelable: true
                    });
                } else if (self.dispatchEvent) {
                    event = document.createEvent("CustomEvent");
                    event.initCustomEvent(type, false, true, detail);
                }

                return event ? !self.dispatchEvent(event) : false;
            };
        }

        var toWindowMethodNameMap = {};
        toWindowMethodNameMap["unhandledRejection"] = ("on" +
            "unhandledRejection").toLowerCase();
        toWindowMethodNameMap["rejectionHandled"] = ("on" +
            "rejectionHandled").toLowerCase();

        return function(name, reason, promise) {
            var methodName = toWindowMethodNameMap[name];
            var method = self[methodName];
            if (!method) return false;
            if (name === "rejectionHandled") {
                method.call(self, promise);
            } else {
                method.call(self, reason, promise);
            }
            return true;
        };
    }
})();

if (typeof console !== "undefined" && typeof console.warn !== "undefined") {
    warn = function (message) {
        console.warn(message);
    };
    if (util.isNode && process.stderr.isTTY) {
        warn = function(message) {
            process.stderr.write("\u001b[31m" + message + "\u001b[39m\n");
        };
    } else if (!util.isNode && typeof (new Error().stack) === "string") {
        warn = function(message) {
            console.warn("%c" + message, "color: red");
        };
    }
}

return CapturedTrace;
};

},{"./async.js":2,"./util.js":38}],8:[function(_dereq_,module,exports){
"use strict";
module.exports = function(NEXT_FILTER) {
var util = _dereq_("./util.js");
var errors = _dereq_("./errors.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var keys = _dereq_("./es5.js").keys;
var TypeError = errors.TypeError;

function CatchFilter(instances, callback, promise) {
    this._instances = instances;
    this._callback = callback;
    this._promise = promise;
}

function safePredicate(predicate, e) {
    var safeObject = {};
    var retfilter = tryCatch(predicate).call(safeObject, e);

    if (retfilter === errorObj) return retfilter;

    var safeKeys = keys(safeObject);
    if (safeKeys.length) {
        errorObj.e = new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a");
        return errorObj;
    }
    return retfilter;
}

CatchFilter.prototype.doFilter = function (e) {
    var cb = this._callback;
    var promise = this._promise;
    var boundTo = promise._boundTo;
    for (var i = 0, len = this._instances.length; i < len; ++i) {
        var item = this._instances[i];
        var itemIsErrorType = item === Error ||
            (item != null && item.prototype instanceof Error);

        if (itemIsErrorType && e instanceof item) {
            var ret = tryCatch(cb).call(boundTo, e);
            if (ret === errorObj) {
                NEXT_FILTER.e = ret.e;
                return NEXT_FILTER;
            }
            return ret;
        } else if (typeof item === "function" && !itemIsErrorType) {
            var shouldHandle = safePredicate(item, e);
            if (shouldHandle === errorObj) {
                e = errorObj.e;
                break;
            } else if (shouldHandle) {
                var ret = tryCatch(cb).call(boundTo, e);
                if (ret === errorObj) {
                    NEXT_FILTER.e = ret.e;
                    return NEXT_FILTER;
                }
                return ret;
            }
        }
    }
    NEXT_FILTER.e = e;
    return NEXT_FILTER;
};

return CatchFilter;
};

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],9:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace, isDebugging) {
var contextStack = [];
function Context() {
    this._trace = new CapturedTrace(peekContext());
}
Context.prototype._pushContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.push(this._trace);
    }
};

Context.prototype._popContext = function () {
    if (!isDebugging()) return;
    if (this._trace !== undefined) {
        contextStack.pop();
    }
};

function createContext() {
    if (isDebugging()) return new Context();
}

function peekContext() {
    var lastIndex = contextStack.length - 1;
    if (lastIndex >= 0) {
        return contextStack[lastIndex];
    }
    return undefined;
}

Promise.prototype._peekContext = peekContext;
Promise.prototype._pushContext = Context.prototype._pushContext;
Promise.prototype._popContext = Context.prototype._popContext;

return createContext;
};

},{}],10:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, CapturedTrace) {
var async = _dereq_("./async.js");
var Warning = _dereq_("./errors.js").Warning;
var util = _dereq_("./util.js");
var canAttachTrace = util.canAttachTrace;
var unhandledRejectionHandled;
var possiblyUnhandledRejection;
var debugging = false || (util.isNode &&
                    (!!process.env["BLUEBIRD_DEBUG"] ||
                     process.env["NODE_ENV"] === "development"));

if (debugging) {
    async.disableTrampolineIfNecessary();
}

Promise.prototype._ensurePossibleRejectionHandled = function () {
    this._setRejectionIsUnhandled();
    async.invokeLater(this._notifyUnhandledRejection, this, undefined);
};

Promise.prototype._notifyUnhandledRejectionIsHandled = function () {
    CapturedTrace.fireRejectionEvent("rejectionHandled",
                                  unhandledRejectionHandled, undefined, this);
};

Promise.prototype._notifyUnhandledRejection = function () {
    if (this._isRejectionUnhandled()) {
        var reason = this._getCarriedStackTrace() || this._settledValue;
        this._setUnhandledRejectionIsNotified();
        CapturedTrace.fireRejectionEvent("unhandledRejection",
                                      possiblyUnhandledRejection, reason, this);
    }
};

Promise.prototype._setUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField | 524288;
};

Promise.prototype._unsetUnhandledRejectionIsNotified = function () {
    this._bitField = this._bitField & (~524288);
};

Promise.prototype._isUnhandledRejectionNotified = function () {
    return (this._bitField & 524288) > 0;
};

Promise.prototype._setRejectionIsUnhandled = function () {
    this._bitField = this._bitField | 2097152;
};

Promise.prototype._unsetRejectionIsUnhandled = function () {
    this._bitField = this._bitField & (~2097152);
    if (this._isUnhandledRejectionNotified()) {
        this._unsetUnhandledRejectionIsNotified();
        this._notifyUnhandledRejectionIsHandled();
    }
};

Promise.prototype._isRejectionUnhandled = function () {
    return (this._bitField & 2097152) > 0;
};

Promise.prototype._setCarriedStackTrace = function (capturedTrace) {
    this._bitField = this._bitField | 1048576;
    this._fulfillmentHandler0 = capturedTrace;
};

Promise.prototype._isCarryingStackTrace = function () {
    return (this._bitField & 1048576) > 0;
};

Promise.prototype._getCarriedStackTrace = function () {
    return this._isCarryingStackTrace()
        ? this._fulfillmentHandler0
        : undefined;
};

Promise.prototype._captureStackTrace = function () {
    if (debugging) {
        this._trace = new CapturedTrace(this._peekContext());
    }
    return this;
};

Promise.prototype._attachExtraTrace = function (error, ignoreSelf) {
    if (debugging && canAttachTrace(error)) {
        var trace = this._trace;
        if (trace !== undefined) {
            if (ignoreSelf) trace = trace._parent;
        }
        if (trace !== undefined) {
            trace.attachExtraTrace(error);
        } else if (!error.__stackCleaned__) {
            var parsed = CapturedTrace.parseStackAndMessage(error);
            util.notEnumerableProp(error, "stack",
                parsed.message + "\n" + parsed.stack.join("\n"));
            util.notEnumerableProp(error, "__stackCleaned__", true);
        }
    }
};

Promise.prototype._warn = function(message) {
    var warning = new Warning(message);
    var ctx = this._peekContext();
    if (ctx) {
        ctx.attachExtraTrace(warning);
    } else {
        var parsed = CapturedTrace.parseStackAndMessage(warning);
        warning.stack = parsed.message + "\n" + parsed.stack.join("\n");
    }
    CapturedTrace.formatAndLogError(warning, "");
};

Promise.onPossiblyUnhandledRejection = function (fn) {
    possiblyUnhandledRejection = typeof fn === "function" ? fn : undefined;
};

Promise.onUnhandledRejectionHandled = function (fn) {
    unhandledRejectionHandled = typeof fn === "function" ? fn : undefined;
};

Promise.longStackTraces = function () {
    if (async.haveItemsQueued() &&
        debugging === false
   ) {
        throw new Error("cannot enable long stack traces after promises have been created\u000a\u000a    See http://goo.gl/DT1qyG\u000a");
    }
    debugging = CapturedTrace.isSupported();
    if (debugging) {
        async.disableTrampolineIfNecessary();
    }
};

Promise.hasLongStackTraces = function () {
    return debugging && CapturedTrace.isSupported();
};

if (!CapturedTrace.isSupported()) {
    Promise.longStackTraces = function(){};
    debugging = false;
}

return function() {
    return debugging;
};
};

},{"./async.js":2,"./errors.js":13,"./util.js":38}],11:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var isPrimitive = util.isPrimitive;
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;

module.exports = function(Promise) {
var returner = function () {
    return this;
};
var thrower = function () {
    throw this;
};

var wrapper = function (value, action) {
    if (action === 1) {
        return function () {
            throw value;
        };
    } else if (action === 2) {
        return function () {
            return value;
        };
    }
};


Promise.prototype["return"] =
Promise.prototype.thenReturn = function (value) {
    if (wrapsPrimitiveReceiver && isPrimitive(value)) {
        return this._then(
            wrapper(value, 2),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(returner, undefined, undefined, value, undefined);
};

Promise.prototype["throw"] =
Promise.prototype.thenThrow = function (reason) {
    if (wrapsPrimitiveReceiver && isPrimitive(reason)) {
        return this._then(
            wrapper(reason, 1),
            undefined,
            undefined,
            undefined,
            undefined
       );
    }
    return this._then(thrower, undefined, undefined, reason, undefined);
};
};

},{"./util.js":38}],12:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseReduce = Promise.reduce;

Promise.prototype.each = function (fn) {
    return PromiseReduce(this, fn, null, INTERNAL);
};

Promise.each = function (promises, fn) {
    return PromiseReduce(promises, fn, null, INTERNAL);
};
};

},{}],13:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var Objectfreeze = es5.freeze;
var util = _dereq_("./util.js");
var inherits = util.inherits;
var notEnumerableProp = util.notEnumerableProp;

function subError(nameProperty, defaultMessage) {
    function SubError(message) {
        if (!(this instanceof SubError)) return new SubError(message);
        notEnumerableProp(this, "message",
            typeof message === "string" ? message : defaultMessage);
        notEnumerableProp(this, "name", nameProperty);
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        } else {
            Error.call(this);
        }
    }
    inherits(SubError, Error);
    return SubError;
}

var _TypeError, _RangeError;
var Warning = subError("Warning", "warning");
var CancellationError = subError("CancellationError", "cancellation error");
var TimeoutError = subError("TimeoutError", "timeout error");
var AggregateError = subError("AggregateError", "aggregate error");
try {
    _TypeError = TypeError;
    _RangeError = RangeError;
} catch(e) {
    _TypeError = subError("TypeError", "type error");
    _RangeError = subError("RangeError", "range error");
}

var methods = ("join pop push shift unshift slice filter forEach some " +
    "every map indexOf lastIndexOf reduce reduceRight sort reverse").split(" ");

for (var i = 0; i < methods.length; ++i) {
    if (typeof Array.prototype[methods[i]] === "function") {
        AggregateError.prototype[methods[i]] = Array.prototype[methods[i]];
    }
}

es5.defineProperty(AggregateError.prototype, "length", {
    value: 0,
    configurable: false,
    writable: true,
    enumerable: true
});
AggregateError.prototype["isOperational"] = true;
var level = 0;
AggregateError.prototype.toString = function() {
    var indent = Array(level * 4 + 1).join(" ");
    var ret = "\n" + indent + "AggregateError of:" + "\n";
    level++;
    indent = Array(level * 4 + 1).join(" ");
    for (var i = 0; i < this.length; ++i) {
        var str = this[i] === this ? "[Circular AggregateError]" : this[i] + "";
        var lines = str.split("\n");
        for (var j = 0; j < lines.length; ++j) {
            lines[j] = indent + lines[j];
        }
        str = lines.join("\n");
        ret += str + "\n";
    }
    level--;
    return ret;
};

function OperationalError(message) {
    if (!(this instanceof OperationalError))
        return new OperationalError(message);
    notEnumerableProp(this, "name", "OperationalError");
    notEnumerableProp(this, "message", message);
    this.cause = message;
    this["isOperational"] = true;

    if (message instanceof Error) {
        notEnumerableProp(this, "message", message.message);
        notEnumerableProp(this, "stack", message.stack);
    } else if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    }

}
inherits(OperationalError, Error);

var errorTypes = Error["__BluebirdErrorTypes__"];
if (!errorTypes) {
    errorTypes = Objectfreeze({
        CancellationError: CancellationError,
        TimeoutError: TimeoutError,
        OperationalError: OperationalError,
        RejectionError: OperationalError,
        AggregateError: AggregateError
    });
    notEnumerableProp(Error, "__BluebirdErrorTypes__", errorTypes);
}

module.exports = {
    Error: Error,
    TypeError: _TypeError,
    RangeError: _RangeError,
    CancellationError: errorTypes.CancellationError,
    OperationalError: errorTypes.OperationalError,
    TimeoutError: errorTypes.TimeoutError,
    AggregateError: errorTypes.AggregateError,
    Warning: Warning
};

},{"./es5.js":14,"./util.js":38}],14:[function(_dereq_,module,exports){
var isES5 = (function(){
    "use strict";
    return this === undefined;
})();

if (isES5) {
    module.exports = {
        freeze: Object.freeze,
        defineProperty: Object.defineProperty,
        getDescriptor: Object.getOwnPropertyDescriptor,
        keys: Object.keys,
        names: Object.getOwnPropertyNames,
        getPrototypeOf: Object.getPrototypeOf,
        isArray: Array.isArray,
        isES5: isES5,
        propertyIsWritable: function(obj, prop) {
            var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
            return !!(!descriptor || descriptor.writable || descriptor.set);
        }
    };
} else {
    var has = {}.hasOwnProperty;
    var str = {}.toString;
    var proto = {}.constructor.prototype;

    var ObjectKeys = function (o) {
        var ret = [];
        for (var key in o) {
            if (has.call(o, key)) {
                ret.push(key);
            }
        }
        return ret;
    };

    var ObjectGetDescriptor = function(o, key) {
        return {value: o[key]};
    };

    var ObjectDefineProperty = function (o, key, desc) {
        o[key] = desc.value;
        return o;
    };

    var ObjectFreeze = function (obj) {
        return obj;
    };

    var ObjectGetPrototypeOf = function (obj) {
        try {
            return Object(obj).constructor.prototype;
        }
        catch (e) {
            return proto;
        }
    };

    var ArrayIsArray = function (obj) {
        try {
            return str.call(obj) === "[object Array]";
        }
        catch(e) {
            return false;
        }
    };

    module.exports = {
        isArray: ArrayIsArray,
        keys: ObjectKeys,
        names: ObjectKeys,
        defineProperty: ObjectDefineProperty,
        getDescriptor: ObjectGetDescriptor,
        freeze: ObjectFreeze,
        getPrototypeOf: ObjectGetPrototypeOf,
        isES5: isES5,
        propertyIsWritable: function() {
            return true;
        }
    };
}

},{}],15:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var PromiseMap = Promise.map;

Promise.prototype.filter = function (fn, options) {
    return PromiseMap(this, fn, options, INTERNAL);
};

Promise.filter = function (promises, fn, options) {
    return PromiseMap(promises, fn, options, INTERNAL);
};
};

},{}],16:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, NEXT_FILTER, tryConvertToPromise) {
var util = _dereq_("./util.js");
var wrapsPrimitiveReceiver = util.wrapsPrimitiveReceiver;
var isPrimitive = util.isPrimitive;
var thrower = util.thrower;

function returnThis() {
    return this;
}
function throwThis() {
    throw this;
}
function return$(r) {
    return function() {
        return r;
    };
}
function throw$(r) {
    return function() {
        throw r;
    };
}
function promisedFinally(ret, reasonOrValue, isFulfilled) {
    var then;
    if (wrapsPrimitiveReceiver && isPrimitive(reasonOrValue)) {
        then = isFulfilled ? return$(reasonOrValue) : throw$(reasonOrValue);
    } else {
        then = isFulfilled ? returnThis : throwThis;
    }
    return ret._then(then, thrower, undefined, reasonOrValue, undefined);
}

function finallyHandler(reasonOrValue) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo)
                    : handler();

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, reasonOrValue,
                                    promise.isFulfilled());
        }
    }

    if (promise.isRejected()) {
        NEXT_FILTER.e = reasonOrValue;
        return NEXT_FILTER;
    } else {
        return reasonOrValue;
    }
}

function tapHandler(value) {
    var promise = this.promise;
    var handler = this.handler;

    var ret = promise._isBound()
                    ? handler.call(promise._boundTo, value)
                    : handler(value);

    if (ret !== undefined) {
        var maybePromise = tryConvertToPromise(ret, promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            return promisedFinally(maybePromise, value, true);
        }
    }
    return value;
}

Promise.prototype._passThroughHandler = function (handler, isFinally) {
    if (typeof handler !== "function") return this.then();

    var promiseAndHandler = {
        promise: this,
        handler: handler
    };

    return this._then(
            isFinally ? finallyHandler : tapHandler,
            isFinally ? finallyHandler : undefined, undefined,
            promiseAndHandler, undefined);
};

Promise.prototype.lastly =
Promise.prototype["finally"] = function (handler) {
    return this._passThroughHandler(handler, true);
};

Promise.prototype.tap = function (handler) {
    return this._passThroughHandler(handler, false);
};
};

},{"./util.js":38}],17:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          apiRejection,
                          INTERNAL,
                          tryConvertToPromise) {
var errors = _dereq_("./errors.js");
var TypeError = errors.TypeError;
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
var yieldHandlers = [];

function promiseFromYieldHandler(value, yieldHandlers, traceParent) {
    for (var i = 0; i < yieldHandlers.length; ++i) {
        traceParent._pushContext();
        var result = tryCatch(yieldHandlers[i])(value);
        traceParent._popContext();
        if (result === errorObj) {
            traceParent._pushContext();
            var ret = Promise.reject(errorObj.e);
            traceParent._popContext();
            return ret;
        }
        var maybePromise = tryConvertToPromise(result, traceParent);
        if (maybePromise instanceof Promise) return maybePromise;
    }
    return null;
}

function PromiseSpawn(generatorFunction, receiver, yieldHandler, stack) {
    var promise = this._promise = new Promise(INTERNAL);
    promise._captureStackTrace();
    this._stack = stack;
    this._generatorFunction = generatorFunction;
    this._receiver = receiver;
    this._generator = undefined;
    this._yieldHandlers = typeof yieldHandler === "function"
        ? [yieldHandler].concat(yieldHandlers)
        : yieldHandlers;
}

PromiseSpawn.prototype.promise = function () {
    return this._promise;
};

PromiseSpawn.prototype._run = function () {
    this._generator = this._generatorFunction.call(this._receiver);
    this._receiver =
        this._generatorFunction = undefined;
    this._next(undefined);
};

PromiseSpawn.prototype._continue = function (result) {
    if (result === errorObj) {
        return this._promise._rejectCallback(result.e, false, true);
    }

    var value = result.value;
    if (result.done === true) {
        this._promise._resolveCallback(value);
    } else {
        var maybePromise = tryConvertToPromise(value, this._promise);
        if (!(maybePromise instanceof Promise)) {
            maybePromise =
                promiseFromYieldHandler(maybePromise,
                                        this._yieldHandlers,
                                        this._promise);
            if (maybePromise === null) {
                this._throw(
                    new TypeError(
                        "A value %s was yielded that could not be treated as a promise\u000a\u000a    See http://goo.gl/4Y4pDk\u000a\u000a".replace("%s", value) +
                        "From coroutine:\u000a" +
                        this._stack.split("\n").slice(1, -7).join("\n")
                    )
                );
                return;
            }
        }
        maybePromise._then(
            this._next,
            this._throw,
            undefined,
            this,
            null
       );
    }
};

PromiseSpawn.prototype._throw = function (reason) {
    this._promise._attachExtraTrace(reason);
    this._promise._pushContext();
    var result = tryCatch(this._generator["throw"])
        .call(this._generator, reason);
    this._promise._popContext();
    this._continue(result);
};

PromiseSpawn.prototype._next = function (value) {
    this._promise._pushContext();
    var result = tryCatch(this._generator.next).call(this._generator, value);
    this._promise._popContext();
    this._continue(result);
};

Promise.coroutine = function (generatorFunction, options) {
    if (typeof generatorFunction !== "function") {
        throw new TypeError("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var yieldHandler = Object(options).yieldHandler;
    var PromiseSpawn$ = PromiseSpawn;
    var stack = new Error().stack;
    return function () {
        var generator = generatorFunction.apply(this, arguments);
        var spawn = new PromiseSpawn$(undefined, undefined, yieldHandler,
                                      stack);
        spawn._generator = generator;
        spawn._next(undefined);
        return spawn.promise();
    };
};

Promise.coroutine.addYieldHandler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    yieldHandlers.push(fn);
};

Promise.spawn = function (generatorFunction) {
    if (typeof generatorFunction !== "function") {
        return apiRejection("generatorFunction must be a function\u000a\u000a    See http://goo.gl/6Vqhm0\u000a");
    }
    var spawn = new PromiseSpawn(generatorFunction, this);
    var ret = spawn.promise();
    spawn._run(Promise.spawn);
    return ret;
};
};

},{"./errors.js":13,"./util.js":38}],18:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, tryConvertToPromise, INTERNAL) {
var util = _dereq_("./util.js");
var canEvaluate = util.canEvaluate;
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var reject;

if (!true) {
if (canEvaluate) {
    var thenCallback = function(i) {
        return new Function("value", "holder", "                             \n\
            'use strict';                                                    \n\
            holder.pIndex = value;                                           \n\
            holder.checkFulfillment(this);                                   \n\
            ".replace(/Index/g, i));
    };

    var caller = function(count) {
        var values = [];
        for (var i = 1; i <= count; ++i) values.push("holder.p" + i);
        return new Function("holder", "                                      \n\
            'use strict';                                                    \n\
            var callback = holder.fn;                                        \n\
            return callback(values);                                         \n\
            ".replace(/values/g, values.join(", ")));
    };
    var thenCallbacks = [];
    var callers = [undefined];
    for (var i = 1; i <= 5; ++i) {
        thenCallbacks.push(thenCallback(i));
        callers.push(caller(i));
    }

    var Holder = function(total, fn) {
        this.p1 = this.p2 = this.p3 = this.p4 = this.p5 = null;
        this.fn = fn;
        this.total = total;
        this.now = 0;
    };

    Holder.prototype.callers = callers;
    Holder.prototype.checkFulfillment = function(promise) {
        var now = this.now;
        now++;
        var total = this.total;
        if (now >= total) {
            var handler = this.callers[total];
            promise._pushContext();
            var ret = tryCatch(handler)(this);
            promise._popContext();
            if (ret === errorObj) {
                promise._rejectCallback(ret.e, false, true);
            } else {
                promise._resolveCallback(ret);
            }
        } else {
            this.now = now;
        }
    };

    var reject = function (reason) {
        this._reject(reason);
    };
}
}

Promise.join = function () {
    var last = arguments.length - 1;
    var fn;
    if (last > 0 && typeof arguments[last] === "function") {
        fn = arguments[last];
        if (!true) {
            if (last < 6 && canEvaluate) {
                var ret = new Promise(INTERNAL);
                ret._captureStackTrace();
                var holder = new Holder(last, fn);
                var callbacks = thenCallbacks;
                for (var i = 0; i < last; ++i) {
                    var maybePromise = tryConvertToPromise(arguments[i], ret);
                    if (maybePromise instanceof Promise) {
                        maybePromise = maybePromise._target();
                        if (maybePromise._isPending()) {
                            maybePromise._then(callbacks[i], reject,
                                               undefined, ret, holder);
                        } else if (maybePromise._isFulfilled()) {
                            callbacks[i].call(ret,
                                              maybePromise._value(), holder);
                        } else {
                            ret._reject(maybePromise._reason());
                        }
                    } else {
                        callbacks[i].call(ret, maybePromise, holder);
                    }
                }
                return ret;
            }
        }
    }
    var $_len = arguments.length;var args = new Array($_len); for(var $_i = 0; $_i < $_len; ++$_i) {args[$_i] = arguments[$_i];}
    if (fn) args.pop();
    var ret = new PromiseArray(args).promise();
    return fn !== undefined ? ret.spread(fn) : ret;
};

};

},{"./util.js":38}],19:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
var PENDING = {};
var EMPTY_ARRAY = [];

function MappingPromiseArray(promises, fn, limit, _filter) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._callback = fn;
    this._preservedValues = _filter === INTERNAL
        ? new Array(this.length())
        : null;
    this._limit = limit;
    this._inFlight = 0;
    this._queue = limit >= 1 ? [] : EMPTY_ARRAY;
    async.invoke(init, this, undefined);
}
util.inherits(MappingPromiseArray, PromiseArray);
function init() {this._init$(undefined, -2);}

MappingPromiseArray.prototype._init = function () {};

MappingPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var limit = this._limit;
    if (values[index] === PENDING) {
        values[index] = value;
        if (limit >= 1) {
            this._inFlight--;
            this._drainQueue();
            if (this._isResolved()) return;
        }
    } else {
        if (limit >= 1 && this._inFlight >= limit) {
            values[index] = value;
            this._queue.push(index);
            return;
        }
        if (preservedValues !== null) preservedValues[index] = value;

        var callback = this._callback;
        var receiver = this._promise._boundTo;
        this._promise._pushContext();
        var ret = tryCatch(callback).call(receiver, value, index, length);
        this._promise._popContext();
        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                if (limit >= 1) this._inFlight++;
                values[index] = PENDING;
                return maybePromise._proxyPromiseArray(this, index);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }
        values[index] = ret;
    }
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= length) {
        if (preservedValues !== null) {
            this._filter(values, preservedValues);
        } else {
            this._resolve(values);
        }

    }
};

MappingPromiseArray.prototype._drainQueue = function () {
    var queue = this._queue;
    var limit = this._limit;
    var values = this._values;
    while (queue.length > 0 && this._inFlight < limit) {
        if (this._isResolved()) return;
        var index = queue.pop();
        this._promiseFulfilled(values[index], index);
    }
};

MappingPromiseArray.prototype._filter = function (booleans, values) {
    var len = values.length;
    var ret = new Array(len);
    var j = 0;
    for (var i = 0; i < len; ++i) {
        if (booleans[i]) ret[j++] = values[i];
    }
    ret.length = j;
    this._resolve(ret);
};

MappingPromiseArray.prototype.preservedValues = function () {
    return this._preservedValues;
};

function map(promises, fn, options, _filter) {
    var limit = typeof options === "object" && options !== null
        ? options.concurrency
        : 0;
    limit = typeof limit === "number" &&
        isFinite(limit) && limit >= 1 ? limit : 0;
    return new MappingPromiseArray(promises, fn, limit, _filter);
}

Promise.prototype.map = function (fn, options) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");

    return map(this, fn, options, null).promise();
};

Promise.map = function (promises, fn, options, _filter) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    return map(promises, fn, options, _filter).promise();
};


};

},{"./async.js":2,"./util.js":38}],20:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;

Promise.method = function (fn) {
    if (typeof fn !== "function") {
        throw new Promise.TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    return function () {
        var ret = new Promise(INTERNAL);
        ret._captureStackTrace();
        ret._pushContext();
        var value = tryCatch(fn).apply(this, arguments);
        ret._popContext();
        ret._resolveFromSyncValue(value);
        return ret;
    };
};

Promise.attempt = Promise["try"] = function (fn, args, ctx) {
    if (typeof fn !== "function") {
        return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._pushContext();
    var value = util.isArray(args)
        ? tryCatch(fn).apply(ctx, args)
        : tryCatch(fn).call(ctx, args);
    ret._popContext();
    ret._resolveFromSyncValue(value);
    return ret;
};

Promise.prototype._resolveFromSyncValue = function (value) {
    if (value === util.errorObj) {
        this._rejectCallback(value.e, false, true);
    } else {
        this._resolveCallback(value, true);
    }
};
};

},{"./util.js":38}],21:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

function spreadAdapter(val, nodeback) {
    var promise = this;
    if (!util.isArray(val)) return successAdapter.call(promise, val, nodeback);
    var ret = tryCatch(nodeback).apply(promise._boundTo, [null].concat(val));
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

function successAdapter(val, nodeback) {
    var promise = this;
    var receiver = promise._boundTo;
    var ret = val === undefined
        ? tryCatch(nodeback).call(receiver, null)
        : tryCatch(nodeback).call(receiver, null, val);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}
function errorAdapter(reason, nodeback) {
    var promise = this;
    if (!reason) {
        var target = promise._target();
        var newReason = target._getCarriedStackTrace();
        newReason.cause = reason;
        reason = newReason;
    }
    var ret = tryCatch(nodeback).call(promise._boundTo, reason);
    if (ret === errorObj) {
        async.throwLater(ret.e);
    }
}

Promise.prototype.asCallback = 
Promise.prototype.nodeify = function (nodeback, options) {
    if (typeof nodeback == "function") {
        var adapter = successAdapter;
        if (options !== undefined && Object(options).spread) {
            adapter = spreadAdapter;
        }
        this._then(
            adapter,
            errorAdapter,
            undefined,
            this,
            nodeback
        );
    }
    return this;
};
};

},{"./async.js":2,"./util.js":38}],22:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, PromiseArray) {
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;

Promise.prototype.progressed = function (handler) {
    return this._then(undefined, undefined, handler, undefined, undefined);
};

Promise.prototype._progress = function (progressValue) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._target()._progressUnchecked(progressValue);

};

Promise.prototype._progressHandlerAt = function (index) {
    return index === 0
        ? this._progressHandler0
        : this[(index << 2) + index - 5 + 2];
};

Promise.prototype._doProgressWith = function (progression) {
    var progressValue = progression.value;
    var handler = progression.handler;
    var promise = progression.promise;
    var receiver = progression.receiver;

    var ret = tryCatch(handler).call(receiver, progressValue);
    if (ret === errorObj) {
        if (ret.e != null &&
            ret.e.name !== "StopProgressPropagation") {
            var trace = util.canAttachTrace(ret.e)
                ? ret.e : new Error(util.toString(ret.e));
            promise._attachExtraTrace(trace);
            promise._progress(ret.e);
        }
    } else if (ret instanceof Promise) {
        ret._then(promise._progress, null, null, promise, undefined);
    } else {
        promise._progress(ret);
    }
};


Promise.prototype._progressUnchecked = function (progressValue) {
    var len = this._length();
    var progress = this._progress;
    for (var i = 0; i < len; i++) {
        var handler = this._progressHandlerAt(i);
        var promise = this._promiseAt(i);
        if (!(promise instanceof Promise)) {
            var receiver = this._receiverAt(i);
            if (typeof handler === "function") {
                handler.call(receiver, progressValue, promise);
            } else if (receiver instanceof PromiseArray &&
                       !receiver._isResolved()) {
                receiver._promiseProgressed(progressValue, promise);
            }
            continue;
        }

        if (typeof handler === "function") {
            async.invoke(this._doProgressWith, this, {
                handler: handler,
                promise: promise,
                receiver: this._receiverAt(i),
                value: progressValue
            });
        } else {
            async.invoke(progress, promise, progressValue);
        }
    }
};
};

},{"./async.js":2,"./util.js":38}],23:[function(_dereq_,module,exports){
"use strict";
module.exports = function() {
var makeSelfResolutionError = function () {
    return new TypeError("circular promise resolution chain\u000a\u000a    See http://goo.gl/LhFpo0\u000a");
};
var reflect = function() {
    return new Promise.PromiseInspection(this._target());
};
var apiRejection = function(msg) {
    return Promise.reject(new TypeError(msg));
};
var util = _dereq_("./util.js");
var async = _dereq_("./async.js");
var errors = _dereq_("./errors.js");
var TypeError = Promise.TypeError = errors.TypeError;
Promise.RangeError = errors.RangeError;
Promise.CancellationError = errors.CancellationError;
Promise.TimeoutError = errors.TimeoutError;
Promise.OperationalError = errors.OperationalError;
Promise.RejectionError = errors.OperationalError;
Promise.AggregateError = errors.AggregateError;
var INTERNAL = function(){};
var APPLY = {};
var NEXT_FILTER = {e: null};
var tryConvertToPromise = _dereq_("./thenables.js")(Promise, INTERNAL);
var PromiseArray =
    _dereq_("./promise_array.js")(Promise, INTERNAL,
                                    tryConvertToPromise, apiRejection);
var CapturedTrace = _dereq_("./captured_trace.js")();
var isDebugging = _dereq_("./debuggability.js")(Promise, CapturedTrace);
 /*jshint unused:false*/
var createContext =
    _dereq_("./context.js")(Promise, CapturedTrace, isDebugging);
var CatchFilter = _dereq_("./catch_filter.js")(NEXT_FILTER);
var PromiseResolver = _dereq_("./promise_resolver.js");
var nodebackForPromise = PromiseResolver._nodebackForPromise;
var errorObj = util.errorObj;
var tryCatch = util.tryCatch;
function Promise(resolver) {
    if (typeof resolver !== "function") {
        throw new TypeError("the promise constructor requires a resolver function\u000a\u000a    See http://goo.gl/EC22Yn\u000a");
    }
    if (this.constructor !== Promise) {
        throw new TypeError("the promise constructor cannot be invoked directly\u000a\u000a    See http://goo.gl/KsIlge\u000a");
    }
    this._bitField = 0;
    this._fulfillmentHandler0 = undefined;
    this._rejectionHandler0 = undefined;
    this._progressHandler0 = undefined;
    this._promise0 = undefined;
    this._receiver0 = undefined;
    this._settledValue = undefined;
    if (resolver !== INTERNAL) this._resolveFromResolver(resolver);
}

Promise.prototype.toString = function () {
    return "[object Promise]";
};

Promise.prototype.caught = Promise.prototype["catch"] = function (fn) {
    var len = arguments.length;
    if (len > 1) {
        var catchInstances = new Array(len - 1),
            j = 0, i;
        for (i = 0; i < len - 1; ++i) {
            var item = arguments[i];
            if (typeof item === "function") {
                catchInstances[j++] = item;
            } else {
                return Promise.reject(
                    new TypeError("Catch filter must inherit from Error or be a simple predicate function\u000a\u000a    See http://goo.gl/o84o68\u000a"));
            }
        }
        catchInstances.length = j;
        fn = arguments[i];
        var catchFilter = new CatchFilter(catchInstances, fn, this);
        return this._then(undefined, catchFilter.doFilter, undefined,
            catchFilter, undefined);
    }
    return this._then(undefined, fn, undefined, undefined, undefined);
};

Promise.prototype.reflect = function () {
    return this._then(reflect, reflect, undefined, this, undefined);
};

Promise.prototype.then = function (didFulfill, didReject, didProgress) {
    if (isDebugging() && arguments.length > 0 &&
        typeof didFulfill !== "function" &&
        typeof didReject !== "function") {
        var msg = ".then() only accepts functions but was passed: " +
                util.classString(didFulfill);
        if (arguments.length > 1) {
            msg += ", " + util.classString(didReject);
        }
        this._warn(msg);
    }
    return this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
};

Promise.prototype.done = function (didFulfill, didReject, didProgress) {
    var promise = this._then(didFulfill, didReject, didProgress,
        undefined, undefined);
    promise._setIsFinal();
};

Promise.prototype.spread = function (didFulfill, didReject) {
    return this.all()._then(didFulfill, didReject, undefined, APPLY, undefined);
};

Promise.prototype.isCancellable = function () {
    return !this.isResolved() &&
        this._cancellable();
};

Promise.prototype.toJSON = function () {
    var ret = {
        isFulfilled: false,
        isRejected: false,
        fulfillmentValue: undefined,
        rejectionReason: undefined
    };
    if (this.isFulfilled()) {
        ret.fulfillmentValue = this.value();
        ret.isFulfilled = true;
    } else if (this.isRejected()) {
        ret.rejectionReason = this.reason();
        ret.isRejected = true;
    }
    return ret;
};

Promise.prototype.all = function () {
    return new PromiseArray(this).promise();
};

Promise.prototype.error = function (fn) {
    return this.caught(util.originatesFromRejection, fn);
};

Promise.is = function (val) {
    return val instanceof Promise;
};

Promise.fromNode = function(fn) {
    var ret = new Promise(INTERNAL);
    var result = tryCatch(fn)(nodebackForPromise(ret));
    if (result === errorObj) {
        ret._rejectCallback(result.e, true, true);
    }
    return ret;
};

Promise.all = function (promises) {
    return new PromiseArray(promises).promise();
};

Promise.defer = Promise.pending = function () {
    var promise = new Promise(INTERNAL);
    return new PromiseResolver(promise);
};

Promise.cast = function (obj) {
    var ret = tryConvertToPromise(obj);
    if (!(ret instanceof Promise)) {
        var val = ret;
        ret = new Promise(INTERNAL);
        ret._fulfillUnchecked(val);
    }
    return ret;
};

Promise.resolve = Promise.fulfilled = Promise.cast;

Promise.reject = Promise.rejected = function (reason) {
    var ret = new Promise(INTERNAL);
    ret._captureStackTrace();
    ret._rejectCallback(reason, true);
    return ret;
};

Promise.setScheduler = function(fn) {
    if (typeof fn !== "function") throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var prev = async._schedule;
    async._schedule = fn;
    return prev;
};

Promise.prototype._then = function (
    didFulfill,
    didReject,
    didProgress,
    receiver,
    internalData
) {
    var haveInternalData = internalData !== undefined;
    var ret = haveInternalData ? internalData : new Promise(INTERNAL);

    if (!haveInternalData) {
        ret._propagateFrom(this, 4 | 1);
        ret._captureStackTrace();
    }

    var target = this._target();
    if (target !== this) {
        if (receiver === undefined) receiver = this._boundTo;
        if (!haveInternalData) ret._setIsMigrated();
    }

    var callbackIndex =
        target._addCallbacks(didFulfill, didReject, didProgress, ret, receiver);

    if (target._isResolved() && !target._isSettlePromisesQueued()) {
        async.invoke(
            target._settlePromiseAtPostResolution, target, callbackIndex);
    }

    return ret;
};

Promise.prototype._settlePromiseAtPostResolution = function (index) {
    if (this._isRejectionUnhandled()) this._unsetRejectionIsUnhandled();
    this._settlePromiseAt(index);
};

Promise.prototype._length = function () {
    return this._bitField & 131071;
};

Promise.prototype._isFollowingOrFulfilledOrRejected = function () {
    return (this._bitField & 939524096) > 0;
};

Promise.prototype._isFollowing = function () {
    return (this._bitField & 536870912) === 536870912;
};

Promise.prototype._setLength = function (len) {
    this._bitField = (this._bitField & -131072) |
        (len & 131071);
};

Promise.prototype._setFulfilled = function () {
    this._bitField = this._bitField | 268435456;
};

Promise.prototype._setRejected = function () {
    this._bitField = this._bitField | 134217728;
};

Promise.prototype._setFollowing = function () {
    this._bitField = this._bitField | 536870912;
};

Promise.prototype._setIsFinal = function () {
    this._bitField = this._bitField | 33554432;
};

Promise.prototype._isFinal = function () {
    return (this._bitField & 33554432) > 0;
};

Promise.prototype._cancellable = function () {
    return (this._bitField & 67108864) > 0;
};

Promise.prototype._setCancellable = function () {
    this._bitField = this._bitField | 67108864;
};

Promise.prototype._unsetCancellable = function () {
    this._bitField = this._bitField & (~67108864);
};

Promise.prototype._setIsMigrated = function () {
    this._bitField = this._bitField | 4194304;
};

Promise.prototype._unsetIsMigrated = function () {
    this._bitField = this._bitField & (~4194304);
};

Promise.prototype._isMigrated = function () {
    return (this._bitField & 4194304) > 0;
};

Promise.prototype._receiverAt = function (index) {
    var ret = index === 0
        ? this._receiver0
        : this[
            index * 5 - 5 + 4];
    if (ret === undefined && this._isBound()) {
        return this._boundTo;
    }
    return ret;
};

Promise.prototype._promiseAt = function (index) {
    return index === 0
        ? this._promise0
        : this[index * 5 - 5 + 3];
};

Promise.prototype._fulfillmentHandlerAt = function (index) {
    return index === 0
        ? this._fulfillmentHandler0
        : this[index * 5 - 5 + 0];
};

Promise.prototype._rejectionHandlerAt = function (index) {
    return index === 0
        ? this._rejectionHandler0
        : this[index * 5 - 5 + 1];
};

Promise.prototype._migrateCallbacks = function (follower, index) {
    var fulfill = follower._fulfillmentHandlerAt(index);
    var reject = follower._rejectionHandlerAt(index);
    var progress = follower._progressHandlerAt(index);
    var promise = follower._promiseAt(index);
    var receiver = follower._receiverAt(index);
    if (promise instanceof Promise) promise._setIsMigrated();
    this._addCallbacks(fulfill, reject, progress, promise, receiver);
};

Promise.prototype._addCallbacks = function (
    fulfill,
    reject,
    progress,
    promise,
    receiver
) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }

    if (index === 0) {
        this._promise0 = promise;
        if (receiver !== undefined) this._receiver0 = receiver;
        if (typeof fulfill === "function" && !this._isCarryingStackTrace())
            this._fulfillmentHandler0 = fulfill;
        if (typeof reject === "function") this._rejectionHandler0 = reject;
        if (typeof progress === "function") this._progressHandler0 = progress;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promise;
        this[base + 4] = receiver;
        if (typeof fulfill === "function")
            this[base + 0] = fulfill;
        if (typeof reject === "function")
            this[base + 1] = reject;
        if (typeof progress === "function")
            this[base + 2] = progress;
    }
    this._setLength(index + 1);
    return index;
};

Promise.prototype._setProxyHandlers = function (receiver, promiseSlotValue) {
    var index = this._length();

    if (index >= 131071 - 5) {
        index = 0;
        this._setLength(0);
    }
    if (index === 0) {
        this._promise0 = promiseSlotValue;
        this._receiver0 = receiver;
    } else {
        var base = index * 5 - 5;
        this[base + 3] = promiseSlotValue;
        this[base + 4] = receiver;
    }
    this._setLength(index + 1);
};

Promise.prototype._proxyPromiseArray = function (promiseArray, index) {
    this._setProxyHandlers(promiseArray, index);
};

Promise.prototype._resolveCallback = function(value, shouldBind) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    if (value === this)
        return this._rejectCallback(makeSelfResolutionError(), false, true);
    var maybePromise = tryConvertToPromise(value, this);
    if (!(maybePromise instanceof Promise)) return this._fulfill(value);

    var propagationFlags = 1 | (shouldBind ? 4 : 0);
    this._propagateFrom(maybePromise, propagationFlags);
    var promise = maybePromise._target();
    if (promise._isPending()) {
        var len = this._length();
        for (var i = 0; i < len; ++i) {
            promise._migrateCallbacks(this, i);
        }
        this._setFollowing();
        this._setLength(0);
        this._setFollowee(promise);
    } else if (promise._isFulfilled()) {
        this._fulfillUnchecked(promise._value());
    } else {
        this._rejectUnchecked(promise._reason(),
            promise._getCarriedStackTrace());
    }
};

Promise.prototype._rejectCallback =
function(reason, synchronous, shouldNotMarkOriginatingFromRejection) {
    if (!shouldNotMarkOriginatingFromRejection) {
        util.markAsOriginatingFromRejection(reason);
    }
    var trace = util.ensureErrorObject(reason);
    var hasStack = trace === reason;
    this._attachExtraTrace(trace, synchronous ? hasStack : false);
    this._reject(reason, hasStack ? undefined : trace);
};

Promise.prototype._resolveFromResolver = function (resolver) {
    var promise = this;
    this._captureStackTrace();
    this._pushContext();
    var synchronous = true;
    var r = tryCatch(resolver)(function(value) {
        if (promise === null) return;
        promise._resolveCallback(value);
        promise = null;
    }, function (reason) {
        if (promise === null) return;
        promise._rejectCallback(reason, synchronous);
        promise = null;
    });
    synchronous = false;
    this._popContext();

    if (r !== undefined && r === errorObj && promise !== null) {
        promise._rejectCallback(r.e, true, true);
        promise = null;
    }
};

Promise.prototype._settlePromiseFromHandler = function (
    handler, receiver, value, promise
) {
    if (promise._isRejected()) return;
    promise._pushContext();
    var x;
    if (receiver === APPLY && !this._isRejected()) {
        x = tryCatch(handler).apply(this._boundTo, value);
    } else {
        x = tryCatch(handler).call(receiver, value);
    }
    promise._popContext();

    if (x === errorObj || x === promise || x === NEXT_FILTER) {
        var err = x === promise ? makeSelfResolutionError() : x.e;
        promise._rejectCallback(err, false, true);
    } else {
        promise._resolveCallback(x);
    }
};

Promise.prototype._target = function() {
    var ret = this;
    while (ret._isFollowing()) ret = ret._followee();
    return ret;
};

Promise.prototype._followee = function() {
    return this._rejectionHandler0;
};

Promise.prototype._setFollowee = function(promise) {
    this._rejectionHandler0 = promise;
};

Promise.prototype._cleanValues = function () {
    if (this._cancellable()) {
        this._cancellationParent = undefined;
    }
};

Promise.prototype._propagateFrom = function (parent, flags) {
    if ((flags & 1) > 0 && parent._cancellable()) {
        this._setCancellable();
        this._cancellationParent = parent;
    }
    if ((flags & 4) > 0 && parent._isBound()) {
        this._setBoundTo(parent._boundTo);
    }
};

Promise.prototype._fulfill = function (value) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._fulfillUnchecked(value);
};

Promise.prototype._reject = function (reason, carriedStackTrace) {
    if (this._isFollowingOrFulfilledOrRejected()) return;
    this._rejectUnchecked(reason, carriedStackTrace);
};

Promise.prototype._settlePromiseAt = function (index) {
    var promise = this._promiseAt(index);
    var isPromise = promise instanceof Promise;

    if (isPromise && promise._isMigrated()) {
        promise._unsetIsMigrated();
        return async.invoke(this._settlePromiseAt, this, index);
    }
    var handler = this._isFulfilled()
        ? this._fulfillmentHandlerAt(index)
        : this._rejectionHandlerAt(index);

    var carriedStackTrace =
        this._isCarryingStackTrace() ? this._getCarriedStackTrace() : undefined;
    var value = this._settledValue;
    var receiver = this._receiverAt(index);


    this._clearCallbackDataAtIndex(index);

    if (typeof handler === "function") {
        if (!isPromise) {
            handler.call(receiver, value, promise);
        } else {
            this._settlePromiseFromHandler(handler, receiver, value, promise);
        }
    } else if (receiver instanceof PromiseArray) {
        if (!receiver._isResolved()) {
            if (this._isFulfilled()) {
                receiver._promiseFulfilled(value, promise);
            }
            else {
                receiver._promiseRejected(value, promise);
            }
        }
    } else if (isPromise) {
        if (this._isFulfilled()) {
            promise._fulfill(value);
        } else {
            promise._reject(value, carriedStackTrace);
        }
    }

    if (index >= 4 && (index & 31) === 4)
        async.invokeLater(this._setLength, this, 0);
};

Promise.prototype._clearCallbackDataAtIndex = function(index) {
    if (index === 0) {
        if (!this._isCarryingStackTrace()) {
            this._fulfillmentHandler0 = undefined;
        }
        this._rejectionHandler0 =
        this._progressHandler0 =
        this._receiver0 =
        this._promise0 = undefined;
    } else {
        var base = index * 5 - 5;
        this[base + 3] =
        this[base + 4] =
        this[base + 0] =
        this[base + 1] =
        this[base + 2] = undefined;
    }
};

Promise.prototype._isSettlePromisesQueued = function () {
    return (this._bitField &
            -1073741824) === -1073741824;
};

Promise.prototype._setSettlePromisesQueued = function () {
    this._bitField = this._bitField | -1073741824;
};

Promise.prototype._unsetSettlePromisesQueued = function () {
    this._bitField = this._bitField & (~-1073741824);
};

Promise.prototype._queueSettlePromises = function() {
    async.settlePromises(this);
    this._setSettlePromisesQueued();
};

Promise.prototype._fulfillUnchecked = function (value) {
    if (value === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err, undefined);
    }
    this._setFulfilled();
    this._settledValue = value;
    this._cleanValues();

    if (this._length() > 0) {
        this._queueSettlePromises();
    }
};

Promise.prototype._rejectUncheckedCheckError = function (reason) {
    var trace = util.ensureErrorObject(reason);
    this._rejectUnchecked(reason, trace === reason ? undefined : trace);
};

Promise.prototype._rejectUnchecked = function (reason, trace) {
    if (reason === this) {
        var err = makeSelfResolutionError();
        this._attachExtraTrace(err);
        return this._rejectUnchecked(err);
    }
    this._setRejected();
    this._settledValue = reason;
    this._cleanValues();

    if (this._isFinal()) {
        async.throwLater(function(e) {
            if ("stack" in e) {
                async.invokeFirst(
                    CapturedTrace.unhandledRejection, undefined, e);
            }
            throw e;
        }, trace === undefined ? reason : trace);
        return;
    }

    if (trace !== undefined && trace !== reason) {
        this._setCarriedStackTrace(trace);
    }

    if (this._length() > 0) {
        this._queueSettlePromises();
    } else {
        this._ensurePossibleRejectionHandled();
    }
};

Promise.prototype._settlePromises = function () {
    this._unsetSettlePromisesQueued();
    var len = this._length();
    for (var i = 0; i < len; i++) {
        this._settlePromiseAt(i);
    }
};

Promise._makeSelfResolutionError = makeSelfResolutionError;
_dereq_("./progress.js")(Promise, PromiseArray);
_dereq_("./method.js")(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_("./bind.js")(Promise, INTERNAL, tryConvertToPromise);
_dereq_("./finally.js")(Promise, NEXT_FILTER, tryConvertToPromise);
_dereq_("./direct_resolve.js")(Promise);
_dereq_("./synchronous_inspection.js")(Promise);
_dereq_("./join.js")(Promise, PromiseArray, tryConvertToPromise, INTERNAL);
Promise.Promise = Promise;
_dereq_('./map.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./cancel.js')(Promise);
_dereq_('./using.js')(Promise, apiRejection, tryConvertToPromise, createContext);
_dereq_('./generators.js')(Promise, apiRejection, INTERNAL, tryConvertToPromise);
_dereq_('./nodeify.js')(Promise);
_dereq_('./call_get.js')(Promise);
_dereq_('./props.js')(Promise, PromiseArray, tryConvertToPromise, apiRejection);
_dereq_('./race.js')(Promise, INTERNAL, tryConvertToPromise, apiRejection);
_dereq_('./reduce.js')(Promise, PromiseArray, apiRejection, tryConvertToPromise, INTERNAL);
_dereq_('./settle.js')(Promise, PromiseArray);
_dereq_('./some.js')(Promise, PromiseArray, apiRejection);
_dereq_('./promisify.js')(Promise, INTERNAL);
_dereq_('./any.js')(Promise);
_dereq_('./each.js')(Promise, INTERNAL);
_dereq_('./timers.js')(Promise, INTERNAL);
_dereq_('./filter.js')(Promise, INTERNAL);
                                                         
    util.toFastProperties(Promise);                                          
    util.toFastProperties(Promise.prototype);                                
    function fillTypes(value) {                                              
        var p = new Promise(INTERNAL);                                       
        p._fulfillmentHandler0 = value;                                      
        p._rejectionHandler0 = value;                                        
        p._progressHandler0 = value;                                         
        p._promise0 = value;                                                 
        p._receiver0 = value;                                                
        p._settledValue = value;                                             
    }                                                                        
    // Complete slack tracking, opt out of field-type tracking and           
    // stabilize map                                                         
    fillTypes({a: 1});                                                       
    fillTypes({b: 2});                                                       
    fillTypes({c: 3});                                                       
    fillTypes(1);                                                            
    fillTypes(function(){});                                                 
    fillTypes(undefined);                                                    
    fillTypes(false);                                                        
    fillTypes(new Promise(INTERNAL));                                        
    CapturedTrace.setBounds(async.firstLineError, util.lastLineError);       
    return Promise;                                                          

};

},{"./any.js":1,"./async.js":2,"./bind.js":3,"./call_get.js":5,"./cancel.js":6,"./captured_trace.js":7,"./catch_filter.js":8,"./context.js":9,"./debuggability.js":10,"./direct_resolve.js":11,"./each.js":12,"./errors.js":13,"./filter.js":15,"./finally.js":16,"./generators.js":17,"./join.js":18,"./map.js":19,"./method.js":20,"./nodeify.js":21,"./progress.js":22,"./promise_array.js":24,"./promise_resolver.js":25,"./promisify.js":26,"./props.js":27,"./race.js":29,"./reduce.js":30,"./settle.js":32,"./some.js":33,"./synchronous_inspection.js":34,"./thenables.js":35,"./timers.js":36,"./using.js":37,"./util.js":38}],24:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL, tryConvertToPromise,
    apiRejection) {
var util = _dereq_("./util.js");
var isArray = util.isArray;

function toResolutionValue(val) {
    switch(val) {
    case -2: return [];
    case -3: return {};
    }
}

function PromiseArray(values) {
    var promise = this._promise = new Promise(INTERNAL);
    var parent;
    if (values instanceof Promise) {
        parent = values;
        promise._propagateFrom(parent, 1 | 4);
    }
    this._values = values;
    this._length = 0;
    this._totalResolved = 0;
    this._init(undefined, -2);
}
PromiseArray.prototype.length = function () {
    return this._length;
};

PromiseArray.prototype.promise = function () {
    return this._promise;
};

PromiseArray.prototype._init = function init(_, resolveValueIfEmpty) {
    var values = tryConvertToPromise(this._values, this._promise);
    if (values instanceof Promise) {
        values = values._target();
        this._values = values;
        if (values._isFulfilled()) {
            values = values._value();
            if (!isArray(values)) {
                var err = new Promise.TypeError("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
                this.__hardReject__(err);
                return;
            }
        } else if (values._isPending()) {
            values._then(
                init,
                this._reject,
                undefined,
                this,
                resolveValueIfEmpty
           );
            return;
        } else {
            this._reject(values._reason());
            return;
        }
    } else if (!isArray(values)) {
        this._promise._reject(apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a")._reason());
        return;
    }

    if (values.length === 0) {
        if (resolveValueIfEmpty === -5) {
            this._resolveEmptyArray();
        }
        else {
            this._resolve(toResolutionValue(resolveValueIfEmpty));
        }
        return;
    }
    var len = this.getActualLength(values.length);
    this._length = len;
    this._values = this.shouldCopyValues() ? new Array(len) : this._values;
    var promise = this._promise;
    for (var i = 0; i < len; ++i) {
        var isResolved = this._isResolved();
        var maybePromise = tryConvertToPromise(values[i], promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (isResolved) {
                maybePromise._unsetRejectionIsUnhandled();
            } else if (maybePromise._isPending()) {
                maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                this._promiseFulfilled(maybePromise._value(), i);
            } else {
                this._promiseRejected(maybePromise._reason(), i);
            }
        } else if (!isResolved) {
            this._promiseFulfilled(maybePromise, i);
        }
    }
};

PromiseArray.prototype._isResolved = function () {
    return this._values === null;
};

PromiseArray.prototype._resolve = function (value) {
    this._values = null;
    this._promise._fulfill(value);
};

PromiseArray.prototype.__hardReject__ =
PromiseArray.prototype._reject = function (reason) {
    this._values = null;
    this._promise._rejectCallback(reason, false, true);
};

PromiseArray.prototype._promiseProgressed = function (progressValue, index) {
    this._promise._progress({
        index: index,
        value: progressValue
    });
};


PromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

PromiseArray.prototype._promiseRejected = function (reason, index) {
    this._totalResolved++;
    this._reject(reason);
};

PromiseArray.prototype.shouldCopyValues = function () {
    return true;
};

PromiseArray.prototype.getActualLength = function (len) {
    return len;
};

return PromiseArray;
};

},{"./util.js":38}],25:[function(_dereq_,module,exports){
"use strict";
var util = _dereq_("./util.js");
var maybeWrapAsError = util.maybeWrapAsError;
var errors = _dereq_("./errors.js");
var TimeoutError = errors.TimeoutError;
var OperationalError = errors.OperationalError;
var haveGetters = util.haveGetters;
var es5 = _dereq_("./es5.js");

function isUntypedError(obj) {
    return obj instanceof Error &&
        es5.getPrototypeOf(obj) === Error.prototype;
}

var rErrorKey = /^(?:name|message|stack|cause)$/;
function wrapAsOperationalError(obj) {
    var ret;
    if (isUntypedError(obj)) {
        ret = new OperationalError(obj);
        ret.name = obj.name;
        ret.message = obj.message;
        ret.stack = obj.stack;
        var keys = es5.keys(obj);
        for (var i = 0; i < keys.length; ++i) {
            var key = keys[i];
            if (!rErrorKey.test(key)) {
                ret[key] = obj[key];
            }
        }
        return ret;
    }
    util.markAsOriginatingFromRejection(obj);
    return obj;
}

function nodebackForPromise(promise) {
    return function(err, value) {
        if (promise === null) return;

        if (err) {
            var wrapped = wrapAsOperationalError(maybeWrapAsError(err));
            promise._attachExtraTrace(wrapped);
            promise._reject(wrapped);
        } else if (arguments.length > 2) {
            var $_len = arguments.length;var args = new Array($_len - 1); for(var $_i = 1; $_i < $_len; ++$_i) {args[$_i - 1] = arguments[$_i];}
            promise._fulfill(args);
        } else {
            promise._fulfill(value);
        }

        promise = null;
    };
}


var PromiseResolver;
if (!haveGetters) {
    PromiseResolver = function (promise) {
        this.promise = promise;
        this.asCallback = nodebackForPromise(promise);
        this.callback = this.asCallback;
    };
}
else {
    PromiseResolver = function (promise) {
        this.promise = promise;
    };
}
if (haveGetters) {
    var prop = {
        get: function() {
            return nodebackForPromise(this.promise);
        }
    };
    es5.defineProperty(PromiseResolver.prototype, "asCallback", prop);
    es5.defineProperty(PromiseResolver.prototype, "callback", prop);
}

PromiseResolver._nodebackForPromise = nodebackForPromise;

PromiseResolver.prototype.toString = function () {
    return "[object PromiseResolver]";
};

PromiseResolver.prototype.resolve =
PromiseResolver.prototype.fulfill = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._resolveCallback(value);
};

PromiseResolver.prototype.reject = function (reason) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._rejectCallback(reason);
};

PromiseResolver.prototype.progress = function (value) {
    if (!(this instanceof PromiseResolver)) {
        throw new TypeError("Illegal invocation, resolver resolve/reject must be called within a resolver context. Consider using the promise constructor instead.\u000a\u000a    See http://goo.gl/sdkXL9\u000a");
    }
    this.promise._progress(value);
};

PromiseResolver.prototype.cancel = function (err) {
    this.promise.cancel(err);
};

PromiseResolver.prototype.timeout = function () {
    this.reject(new TimeoutError("timeout"));
};

PromiseResolver.prototype.isResolved = function () {
    return this.promise.isResolved();
};

PromiseResolver.prototype.toJSON = function () {
    return this.promise.toJSON();
};

module.exports = PromiseResolver;

},{"./errors.js":13,"./es5.js":14,"./util.js":38}],26:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var THIS = {};
var util = _dereq_("./util.js");
var nodebackForPromise = _dereq_("./promise_resolver.js")
    ._nodebackForPromise;
var withAppended = util.withAppended;
var maybeWrapAsError = util.maybeWrapAsError;
var canEvaluate = util.canEvaluate;
var TypeError = _dereq_("./errors").TypeError;
var defaultSuffix = "Async";
var defaultPromisified = {__isPromisified__: true};
var noCopyPropsPattern =
    /^(?:length|name|arguments|caller|callee|prototype|__isPromisified__)$/;
var defaultFilter = function(name, func) {
    return util.isIdentifier(name) &&
        name.charAt(0) !== "_" &&
        !util.isClass(func);
};

function propsFilter(key) {
    return !noCopyPropsPattern.test(key);
}

function isPromisified(fn) {
    try {
        return fn.__isPromisified__ === true;
    }
    catch (e) {
        return false;
    }
}

function hasPromisified(obj, key, suffix) {
    var val = util.getDataPropertyOrDefault(obj, key + suffix,
                                            defaultPromisified);
    return val ? isPromisified(val) : false;
}
function checkValid(ret, suffix, suffixRegexp) {
    for (var i = 0; i < ret.length; i += 2) {
        var key = ret[i];
        if (suffixRegexp.test(key)) {
            var keyWithoutAsyncSuffix = key.replace(suffixRegexp, "");
            for (var j = 0; j < ret.length; j += 2) {
                if (ret[j] === keyWithoutAsyncSuffix) {
                    throw new TypeError("Cannot promisify an API that has normal methods with '%s'-suffix\u000a\u000a    See http://goo.gl/iWrZbw\u000a"
                        .replace("%s", suffix));
                }
            }
        }
    }
}

function promisifiableMethods(obj, suffix, suffixRegexp, filter) {
    var keys = util.inheritedDataKeys(obj);
    var ret = [];
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        var value = obj[key];
        var passesDefaultFilter = filter === defaultFilter
            ? true : defaultFilter(key, value, obj);
        if (typeof value === "function" &&
            !isPromisified(value) &&
            !hasPromisified(obj, key, suffix) &&
            filter(key, value, obj, passesDefaultFilter)) {
            ret.push(key, value);
        }
    }
    checkValid(ret, suffix, suffixRegexp);
    return ret;
}

var escapeIdentRegex = function(str) {
    return str.replace(/([$])/, "\\$");
};

var makeNodePromisifiedEval;
if (!true) {
var switchCaseArgumentOrder = function(likelyArgumentCount) {
    var ret = [likelyArgumentCount];
    var min = Math.max(0, likelyArgumentCount - 1 - 3);
    for(var i = likelyArgumentCount - 1; i >= min; --i) {
        ret.push(i);
    }
    for(var i = likelyArgumentCount + 1; i <= 3; ++i) {
        ret.push(i);
    }
    return ret;
};

var argumentSequence = function(argumentCount) {
    return util.filledRange(argumentCount, "_arg", "");
};

var parameterDeclaration = function(parameterCount) {
    return util.filledRange(
        Math.max(parameterCount, 3), "_arg", "");
};

var parameterCount = function(fn) {
    if (typeof fn.length === "number") {
        return Math.max(Math.min(fn.length, 1023 + 1), 0);
    }
    return 0;
};

makeNodePromisifiedEval =
function(callback, receiver, originalName, fn) {
    var newParameterCount = Math.max(0, parameterCount(fn) - 1);
    var argumentOrder = switchCaseArgumentOrder(newParameterCount);
    var shouldProxyThis = typeof callback === "string" || receiver === THIS;

    function generateCallForArgumentCount(count) {
        var args = argumentSequence(count).join(", ");
        var comma = count > 0 ? ", " : "";
        var ret;
        if (shouldProxyThis) {
            ret = "ret = callback.call(this, {{args}}, nodeback); break;\n";
        } else {
            ret = receiver === undefined
                ? "ret = callback({{args}}, nodeback); break;\n"
                : "ret = callback.call(receiver, {{args}}, nodeback); break;\n";
        }
        return ret.replace("{{args}}", args).replace(", ", comma);
    }

    function generateArgumentSwitchCase() {
        var ret = "";
        for (var i = 0; i < argumentOrder.length; ++i) {
            ret += "case " + argumentOrder[i] +":" +
                generateCallForArgumentCount(argumentOrder[i]);
        }

        ret += "                                                             \n\
        default:                                                             \n\
            var args = new Array(len + 1);                                   \n\
            var i = 0;                                                       \n\
            for (var i = 0; i < len; ++i) {                                  \n\
               args[i] = arguments[i];                                       \n\
            }                                                                \n\
            args[i] = nodeback;                                              \n\
            [CodeForCall]                                                    \n\
            break;                                                           \n\
        ".replace("[CodeForCall]", (shouldProxyThis
                                ? "ret = callback.apply(this, args);\n"
                                : "ret = callback.apply(receiver, args);\n"));
        return ret;
    }

    var getFunctionCode = typeof callback === "string"
                                ? ("this != null ? this['"+callback+"'] : fn")
                                : "fn";

    return new Function("Promise",
                        "fn",
                        "receiver",
                        "withAppended",
                        "maybeWrapAsError",
                        "nodebackForPromise",
                        "tryCatch",
                        "errorObj",
                        "INTERNAL","'use strict';                            \n\
        var ret = function (Parameters) {                                    \n\
            'use strict';                                                    \n\
            var len = arguments.length;                                      \n\
            var promise = new Promise(INTERNAL);                             \n\
            promise._captureStackTrace();                                    \n\
            var nodeback = nodebackForPromise(promise);                      \n\
            var ret;                                                         \n\
            var callback = tryCatch([GetFunctionCode]);                      \n\
            switch(len) {                                                    \n\
                [CodeForSwitchCase]                                          \n\
            }                                                                \n\
            if (ret === errorObj) {                                          \n\
                promise._rejectCallback(maybeWrapAsError(ret.e), true, true);\n\
            }                                                                \n\
            return promise;                                                  \n\
        };                                                                   \n\
        ret.__isPromisified__ = true;                                        \n\
        return ret;                                                          \n\
        "
        .replace("Parameters", parameterDeclaration(newParameterCount))
        .replace("[CodeForSwitchCase]", generateArgumentSwitchCase())
        .replace("[GetFunctionCode]", getFunctionCode))(
            Promise,
            fn,
            receiver,
            withAppended,
            maybeWrapAsError,
            nodebackForPromise,
            util.tryCatch,
            util.errorObj,
            INTERNAL
        );
};
}

function makeNodePromisifiedClosure(callback, receiver, _, fn) {
    var defaultThis = (function() {return this;})();
    var method = callback;
    if (typeof method === "string") {
        callback = fn;
    }
    function promisified() {
        var _receiver = receiver;
        if (receiver === THIS) _receiver = this;
        var promise = new Promise(INTERNAL);
        promise._captureStackTrace();
        var cb = typeof method === "string" && this !== defaultThis
            ? this[method] : callback;
        var fn = nodebackForPromise(promise);
        try {
            cb.apply(_receiver, withAppended(arguments, fn));
        } catch(e) {
            promise._rejectCallback(maybeWrapAsError(e), true, true);
        }
        return promise;
    }
    promisified.__isPromisified__ = true;
    return promisified;
}

var makeNodePromisified = canEvaluate
    ? makeNodePromisifiedEval
    : makeNodePromisifiedClosure;

function promisifyAll(obj, suffix, filter, promisifier) {
    var suffixRegexp = new RegExp(escapeIdentRegex(suffix) + "$");
    var methods =
        promisifiableMethods(obj, suffix, suffixRegexp, filter);

    for (var i = 0, len = methods.length; i < len; i+= 2) {
        var key = methods[i];
        var fn = methods[i+1];
        var promisifiedKey = key + suffix;
        obj[promisifiedKey] = promisifier === makeNodePromisified
                ? makeNodePromisified(key, THIS, key, fn, suffix)
                : promisifier(fn, function() {
                    return makeNodePromisified(key, THIS, key, fn, suffix);
                });
    }
    util.toFastProperties(obj);
    return obj;
}

function promisify(callback, receiver) {
    return makeNodePromisified(callback, receiver, undefined, callback);
}

Promise.promisify = function (fn, receiver) {
    if (typeof fn !== "function") {
        throw new TypeError("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    }
    if (isPromisified(fn)) {
        return fn;
    }
    var ret = promisify(fn, arguments.length < 2 ? THIS : receiver);
    util.copyDescriptors(fn, ret, propsFilter);
    return ret;
};

Promise.promisifyAll = function (target, options) {
    if (typeof target !== "function" && typeof target !== "object") {
        throw new TypeError("the target of promisifyAll must be an object or a function\u000a\u000a    See http://goo.gl/9ITlV0\u000a");
    }
    options = Object(options);
    var suffix = options.suffix;
    if (typeof suffix !== "string") suffix = defaultSuffix;
    var filter = options.filter;
    if (typeof filter !== "function") filter = defaultFilter;
    var promisifier = options.promisifier;
    if (typeof promisifier !== "function") promisifier = makeNodePromisified;

    if (!util.isIdentifier(suffix)) {
        throw new RangeError("suffix must be a valid identifier\u000a\u000a    See http://goo.gl/8FZo5V\u000a");
    }

    var keys = util.inheritedDataKeys(target);
    for (var i = 0; i < keys.length; ++i) {
        var value = target[keys[i]];
        if (keys[i] !== "constructor" &&
            util.isClass(value)) {
            promisifyAll(value.prototype, suffix, filter, promisifier);
            promisifyAll(value, suffix, filter, promisifier);
        }
    }

    return promisifyAll(target, suffix, filter, promisifier);
};
};


},{"./errors":13,"./promise_resolver.js":25,"./util.js":38}],27:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, PromiseArray, tryConvertToPromise, apiRejection) {
var util = _dereq_("./util.js");
var isObject = util.isObject;
var es5 = _dereq_("./es5.js");

function PropertiesPromiseArray(obj) {
    var keys = es5.keys(obj);
    var len = keys.length;
    var values = new Array(len * 2);
    for (var i = 0; i < len; ++i) {
        var key = keys[i];
        values[i] = obj[key];
        values[i + len] = key;
    }
    this.constructor$(values);
}
util.inherits(PropertiesPromiseArray, PromiseArray);

PropertiesPromiseArray.prototype._init = function () {
    this._init$(undefined, -3) ;
};

PropertiesPromiseArray.prototype._promiseFulfilled = function (value, index) {
    this._values[index] = value;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        var val = {};
        var keyOffset = this.length();
        for (var i = 0, len = this.length(); i < len; ++i) {
            val[this._values[i + keyOffset]] = this._values[i];
        }
        this._resolve(val);
    }
};

PropertiesPromiseArray.prototype._promiseProgressed = function (value, index) {
    this._promise._progress({
        key: this._values[index + this.length()],
        value: value
    });
};

PropertiesPromiseArray.prototype.shouldCopyValues = function () {
    return false;
};

PropertiesPromiseArray.prototype.getActualLength = function (len) {
    return len >> 1;
};

function props(promises) {
    var ret;
    var castValue = tryConvertToPromise(promises);

    if (!isObject(castValue)) {
        return apiRejection("cannot await properties of a non-object\u000a\u000a    See http://goo.gl/OsFKC8\u000a");
    } else if (castValue instanceof Promise) {
        ret = castValue._then(
            Promise.props, undefined, undefined, undefined, undefined);
    } else {
        ret = new PropertiesPromiseArray(castValue).promise();
    }

    if (castValue instanceof Promise) {
        ret._propagateFrom(castValue, 4);
    }
    return ret;
}

Promise.prototype.props = function () {
    return props(this);
};

Promise.props = function (promises) {
    return props(promises);
};
};

},{"./es5.js":14,"./util.js":38}],28:[function(_dereq_,module,exports){
"use strict";
function arrayMove(src, srcIndex, dst, dstIndex, len) {
    for (var j = 0; j < len; ++j) {
        dst[j + dstIndex] = src[j + srcIndex];
        src[j + srcIndex] = void 0;
    }
}

function Queue(capacity) {
    this._capacity = capacity;
    this._length = 0;
    this._front = 0;
}

Queue.prototype._willBeOverCapacity = function (size) {
    return this._capacity < size;
};

Queue.prototype._pushOne = function (arg) {
    var length = this.length();
    this._checkCapacity(length + 1);
    var i = (this._front + length) & (this._capacity - 1);
    this[i] = arg;
    this._length = length + 1;
};

Queue.prototype._unshiftOne = function(value) {
    var capacity = this._capacity;
    this._checkCapacity(this.length() + 1);
    var front = this._front;
    var i = (((( front - 1 ) &
                    ( capacity - 1) ) ^ capacity ) - capacity );
    this[i] = value;
    this._front = i;
    this._length = this.length() + 1;
};

Queue.prototype.unshift = function(fn, receiver, arg) {
    this._unshiftOne(arg);
    this._unshiftOne(receiver);
    this._unshiftOne(fn);
};

Queue.prototype.push = function (fn, receiver, arg) {
    var length = this.length() + 3;
    if (this._willBeOverCapacity(length)) {
        this._pushOne(fn);
        this._pushOne(receiver);
        this._pushOne(arg);
        return;
    }
    var j = this._front + length - 3;
    this._checkCapacity(length);
    var wrapMask = this._capacity - 1;
    this[(j + 0) & wrapMask] = fn;
    this[(j + 1) & wrapMask] = receiver;
    this[(j + 2) & wrapMask] = arg;
    this._length = length;
};

Queue.prototype.shift = function () {
    var front = this._front,
        ret = this[front];

    this[front] = undefined;
    this._front = (front + 1) & (this._capacity - 1);
    this._length--;
    return ret;
};

Queue.prototype.length = function () {
    return this._length;
};

Queue.prototype._checkCapacity = function (size) {
    if (this._capacity < size) {
        this._resizeTo(this._capacity << 1);
    }
};

Queue.prototype._resizeTo = function (capacity) {
    var oldCapacity = this._capacity;
    this._capacity = capacity;
    var front = this._front;
    var length = this._length;
    var moveItemsCount = (front + length) & (oldCapacity - 1);
    arrayMove(this, 0, this, oldCapacity, moveItemsCount);
};

module.exports = Queue;

},{}],29:[function(_dereq_,module,exports){
"use strict";
module.exports = function(
    Promise, INTERNAL, tryConvertToPromise, apiRejection) {
var isArray = _dereq_("./util.js").isArray;

var raceLater = function (promise) {
    return promise.then(function(array) {
        return race(array, promise);
    });
};

function race(promises, parent) {
    var maybePromise = tryConvertToPromise(promises);

    if (maybePromise instanceof Promise) {
        return raceLater(maybePromise);
    } else if (!isArray(promises)) {
        return apiRejection("expecting an array, a promise or a thenable\u000a\u000a    See http://goo.gl/s8MMhc\u000a");
    }

    var ret = new Promise(INTERNAL);
    if (parent !== undefined) {
        ret._propagateFrom(parent, 4 | 1);
    }
    var fulfill = ret._fulfill;
    var reject = ret._reject;
    for (var i = 0, len = promises.length; i < len; ++i) {
        var val = promises[i];

        if (val === undefined && !(i in promises)) {
            continue;
        }

        Promise.cast(val)._then(fulfill, reject, undefined, ret, null);
    }
    return ret;
}

Promise.race = function (promises) {
    return race(promises, undefined);
};

Promise.prototype.race = function () {
    return race(this, undefined);
};

};

},{"./util.js":38}],30:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise,
                          PromiseArray,
                          apiRejection,
                          tryConvertToPromise,
                          INTERNAL) {
var async = _dereq_("./async.js");
var util = _dereq_("./util.js");
var tryCatch = util.tryCatch;
var errorObj = util.errorObj;
function ReductionPromiseArray(promises, fn, accum, _each) {
    this.constructor$(promises);
    this._promise._captureStackTrace();
    this._preservedValues = _each === INTERNAL ? [] : null;
    this._zerothIsAccum = (accum === undefined);
    this._gotAccum = false;
    this._reducingIndex = (this._zerothIsAccum ? 1 : 0);
    this._valuesPhase = undefined;
    var maybePromise = tryConvertToPromise(accum, this._promise);
    var rejected = false;
    var isPromise = maybePromise instanceof Promise;
    if (isPromise) {
        maybePromise = maybePromise._target();
        if (maybePromise._isPending()) {
            maybePromise._proxyPromiseArray(this, -1);
        } else if (maybePromise._isFulfilled()) {
            accum = maybePromise._value();
            this._gotAccum = true;
        } else {
            this._reject(maybePromise._reason());
            rejected = true;
        }
    }
    if (!(isPromise || this._zerothIsAccum)) this._gotAccum = true;
    this._callback = fn;
    this._accum = accum;
    if (!rejected) async.invoke(init, this, undefined);
}
function init() {
    this._init$(undefined, -5);
}
util.inherits(ReductionPromiseArray, PromiseArray);

ReductionPromiseArray.prototype._init = function () {};

ReductionPromiseArray.prototype._resolveEmptyArray = function () {
    if (this._gotAccum || this._zerothIsAccum) {
        this._resolve(this._preservedValues !== null
                        ? [] : this._accum);
    }
};

ReductionPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var values = this._values;
    values[index] = value;
    var length = this.length();
    var preservedValues = this._preservedValues;
    var isEach = preservedValues !== null;
    var gotAccum = this._gotAccum;
    var valuesPhase = this._valuesPhase;
    var valuesPhaseIndex;
    if (!valuesPhase) {
        valuesPhase = this._valuesPhase = new Array(length);
        for (valuesPhaseIndex=0; valuesPhaseIndex<length; ++valuesPhaseIndex) {
            valuesPhase[valuesPhaseIndex] = 0;
        }
    }
    valuesPhaseIndex = valuesPhase[index];

    if (index === 0 && this._zerothIsAccum) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
        valuesPhase[index] = ((valuesPhaseIndex === 0)
            ? 1 : 2);
    } else if (index === -1) {
        this._accum = value;
        this._gotAccum = gotAccum = true;
    } else {
        if (valuesPhaseIndex === 0) {
            valuesPhase[index] = 1;
        } else {
            valuesPhase[index] = 2;
            this._accum = value;
        }
    }
    if (!gotAccum) return;

    var callback = this._callback;
    var receiver = this._promise._boundTo;
    var ret;

    for (var i = this._reducingIndex; i < length; ++i) {
        valuesPhaseIndex = valuesPhase[i];
        if (valuesPhaseIndex === 2) {
            this._reducingIndex = i + 1;
            continue;
        }
        if (valuesPhaseIndex !== 1) return;
        value = values[i];
        this._promise._pushContext();
        if (isEach) {
            preservedValues.push(value);
            ret = tryCatch(callback).call(receiver, value, i, length);
        }
        else {
            ret = tryCatch(callback)
                .call(receiver, this._accum, value, i, length);
        }
        this._promise._popContext();

        if (ret === errorObj) return this._reject(ret.e);

        var maybePromise = tryConvertToPromise(ret, this._promise);
        if (maybePromise instanceof Promise) {
            maybePromise = maybePromise._target();
            if (maybePromise._isPending()) {
                valuesPhase[i] = 4;
                return maybePromise._proxyPromiseArray(this, i);
            } else if (maybePromise._isFulfilled()) {
                ret = maybePromise._value();
            } else {
                return this._reject(maybePromise._reason());
            }
        }

        this._reducingIndex = i + 1;
        this._accum = ret;
    }

    this._resolve(isEach ? preservedValues : this._accum);
};

function reduce(promises, fn, initialValue, _each) {
    if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
    var array = new ReductionPromiseArray(promises, fn, initialValue, _each);
    return array.promise();
}

Promise.prototype.reduce = function (fn, initialValue) {
    return reduce(this, fn, initialValue, null);
};

Promise.reduce = function (promises, fn, initialValue, _each) {
    return reduce(promises, fn, initialValue, _each);
};
};

},{"./async.js":2,"./util.js":38}],31:[function(_dereq_,module,exports){
"use strict";
var schedule;
var noAsyncScheduler = function() {
    throw new Error("No async scheduler available\u000a\u000a    See http://goo.gl/m3OTXk\u000a");
};
if (_dereq_("./util.js").isNode) {
    var version = process.versions.node.split(".").map(Number);
    schedule = (version[0] === 0 && version[1] > 10) || (version[0] > 0)
        ? global.setImmediate : process.nextTick;

    if (!schedule) {
        if (typeof setImmediate !== "undefined") {
            schedule = setImmediate;
        } else if (typeof setTimeout !== "undefined") {
            schedule = setTimeout;
        } else {
            schedule = noAsyncScheduler;
        }
    }
} else if (typeof MutationObserver !== "undefined") {
    schedule = function(fn) {
        var div = document.createElement("div");
        var observer = new MutationObserver(fn);
        observer.observe(div, {attributes: true});
        return function() { div.classList.toggle("foo"); };
    };
    schedule.isStatic = true;
} else if (typeof setImmediate !== "undefined") {
    schedule = function (fn) {
        setImmediate(fn);
    };
} else if (typeof setTimeout !== "undefined") {
    schedule = function (fn) {
        setTimeout(fn, 0);
    };
} else {
    schedule = noAsyncScheduler;
}
module.exports = schedule;

},{"./util.js":38}],32:[function(_dereq_,module,exports){
"use strict";
module.exports =
    function(Promise, PromiseArray) {
var PromiseInspection = Promise.PromiseInspection;
var util = _dereq_("./util.js");

function SettledPromiseArray(values) {
    this.constructor$(values);
}
util.inherits(SettledPromiseArray, PromiseArray);

SettledPromiseArray.prototype._promiseResolved = function (index, inspection) {
    this._values[index] = inspection;
    var totalResolved = ++this._totalResolved;
    if (totalResolved >= this._length) {
        this._resolve(this._values);
    }
};

SettledPromiseArray.prototype._promiseFulfilled = function (value, index) {
    var ret = new PromiseInspection();
    ret._bitField = 268435456;
    ret._settledValue = value;
    this._promiseResolved(index, ret);
};
SettledPromiseArray.prototype._promiseRejected = function (reason, index) {
    var ret = new PromiseInspection();
    ret._bitField = 134217728;
    ret._settledValue = reason;
    this._promiseResolved(index, ret);
};

Promise.settle = function (promises) {
    return new SettledPromiseArray(promises).promise();
};

Promise.prototype.settle = function () {
    return new SettledPromiseArray(this).promise();
};
};

},{"./util.js":38}],33:[function(_dereq_,module,exports){
"use strict";
module.exports =
function(Promise, PromiseArray, apiRejection) {
var util = _dereq_("./util.js");
var RangeError = _dereq_("./errors.js").RangeError;
var AggregateError = _dereq_("./errors.js").AggregateError;
var isArray = util.isArray;


function SomePromiseArray(values) {
    this.constructor$(values);
    this._howMany = 0;
    this._unwrap = false;
    this._initialized = false;
}
util.inherits(SomePromiseArray, PromiseArray);

SomePromiseArray.prototype._init = function () {
    if (!this._initialized) {
        return;
    }
    if (this._howMany === 0) {
        this._resolve([]);
        return;
    }
    this._init$(undefined, -5);
    var isArrayResolved = isArray(this._values);
    if (!this._isResolved() &&
        isArrayResolved &&
        this._howMany > this._canPossiblyFulfill()) {
        this._reject(this._getRangeError(this.length()));
    }
};

SomePromiseArray.prototype.init = function () {
    this._initialized = true;
    this._init();
};

SomePromiseArray.prototype.setUnwrap = function () {
    this._unwrap = true;
};

SomePromiseArray.prototype.howMany = function () {
    return this._howMany;
};

SomePromiseArray.prototype.setHowMany = function (count) {
    this._howMany = count;
};

SomePromiseArray.prototype._promiseFulfilled = function (value) {
    this._addFulfilled(value);
    if (this._fulfilled() === this.howMany()) {
        this._values.length = this.howMany();
        if (this.howMany() === 1 && this._unwrap) {
            this._resolve(this._values[0]);
        } else {
            this._resolve(this._values);
        }
    }

};
SomePromiseArray.prototype._promiseRejected = function (reason) {
    this._addRejected(reason);
    if (this.howMany() > this._canPossiblyFulfill()) {
        var e = new AggregateError();
        for (var i = this.length(); i < this._values.length; ++i) {
            e.push(this._values[i]);
        }
        this._reject(e);
    }
};

SomePromiseArray.prototype._fulfilled = function () {
    return this._totalResolved;
};

SomePromiseArray.prototype._rejected = function () {
    return this._values.length - this.length();
};

SomePromiseArray.prototype._addRejected = function (reason) {
    this._values.push(reason);
};

SomePromiseArray.prototype._addFulfilled = function (value) {
    this._values[this._totalResolved++] = value;
};

SomePromiseArray.prototype._canPossiblyFulfill = function () {
    return this.length() - this._rejected();
};

SomePromiseArray.prototype._getRangeError = function (count) {
    var message = "Input array must contain at least " +
            this._howMany + " items but contains only " + count + " items";
    return new RangeError(message);
};

SomePromiseArray.prototype._resolveEmptyArray = function () {
    this._reject(this._getRangeError(0));
};

function some(promises, howMany) {
    if ((howMany | 0) !== howMany || howMany < 0) {
        return apiRejection("expecting a positive integer\u000a\u000a    See http://goo.gl/1wAmHx\u000a");
    }
    var ret = new SomePromiseArray(promises);
    var promise = ret.promise();
    ret.setHowMany(howMany);
    ret.init();
    return promise;
}

Promise.some = function (promises, howMany) {
    return some(promises, howMany);
};

Promise.prototype.some = function (howMany) {
    return some(this, howMany);
};

Promise._SomePromiseArray = SomePromiseArray;
};

},{"./errors.js":13,"./util.js":38}],34:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise) {
function PromiseInspection(promise) {
    if (promise !== undefined) {
        promise = promise._target();
        this._bitField = promise._bitField;
        this._settledValue = promise._settledValue;
    }
    else {
        this._bitField = 0;
        this._settledValue = undefined;
    }
}

PromiseInspection.prototype.value = function () {
    if (!this.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.error =
PromiseInspection.prototype.reason = function () {
    if (!this.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    return this._settledValue;
};

PromiseInspection.prototype.isFulfilled =
Promise.prototype._isFulfilled = function () {
    return (this._bitField & 268435456) > 0;
};

PromiseInspection.prototype.isRejected =
Promise.prototype._isRejected = function () {
    return (this._bitField & 134217728) > 0;
};

PromiseInspection.prototype.isPending =
Promise.prototype._isPending = function () {
    return (this._bitField & 402653184) === 0;
};

PromiseInspection.prototype.isResolved =
Promise.prototype._isResolved = function () {
    return (this._bitField & 402653184) > 0;
};

Promise.prototype.isPending = function() {
    return this._target()._isPending();
};

Promise.prototype.isRejected = function() {
    return this._target()._isRejected();
};

Promise.prototype.isFulfilled = function() {
    return this._target()._isFulfilled();
};

Promise.prototype.isResolved = function() {
    return this._target()._isResolved();
};

Promise.prototype._value = function() {
    return this._settledValue;
};

Promise.prototype._reason = function() {
    this._unsetRejectionIsUnhandled();
    return this._settledValue;
};

Promise.prototype.value = function() {
    var target = this._target();
    if (!target.isFulfilled()) {
        throw new TypeError("cannot get fulfillment value of a non-fulfilled promise\u000a\u000a    See http://goo.gl/hc1DLj\u000a");
    }
    return target._settledValue;
};

Promise.prototype.reason = function() {
    var target = this._target();
    if (!target.isRejected()) {
        throw new TypeError("cannot get rejection reason of a non-rejected promise\u000a\u000a    See http://goo.gl/hPuiwB\u000a");
    }
    target._unsetRejectionIsUnhandled();
    return target._settledValue;
};


Promise.PromiseInspection = PromiseInspection;
};

},{}],35:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var errorObj = util.errorObj;
var isObject = util.isObject;

function tryConvertToPromise(obj, context) {
    if (isObject(obj)) {
        if (obj instanceof Promise) {
            return obj;
        }
        else if (isAnyBluebirdPromise(obj)) {
            var ret = new Promise(INTERNAL);
            obj._then(
                ret._fulfillUnchecked,
                ret._rejectUncheckedCheckError,
                ret._progressUnchecked,
                ret,
                null
            );
            return ret;
        }
        var then = util.tryCatch(getThen)(obj);
        if (then === errorObj) {
            if (context) context._pushContext();
            var ret = Promise.reject(then.e);
            if (context) context._popContext();
            return ret;
        } else if (typeof then === "function") {
            return doThenable(obj, then, context);
        }
    }
    return obj;
}

function getThen(obj) {
    return obj.then;
}

var hasProp = {}.hasOwnProperty;
function isAnyBluebirdPromise(obj) {
    return hasProp.call(obj, "_promise0");
}

function doThenable(x, then, context) {
    var promise = new Promise(INTERNAL);
    var ret = promise;
    if (context) context._pushContext();
    promise._captureStackTrace();
    if (context) context._popContext();
    var synchronous = true;
    var result = util.tryCatch(then).call(x,
                                        resolveFromThenable,
                                        rejectFromThenable,
                                        progressFromThenable);
    synchronous = false;
    if (promise && result === errorObj) {
        promise._rejectCallback(result.e, true, true);
        promise = null;
    }

    function resolveFromThenable(value) {
        if (!promise) return;
        if (x === value) {
            promise._rejectCallback(
                Promise._makeSelfResolutionError(), false, true);
        } else {
            promise._resolveCallback(value);
        }
        promise = null;
    }

    function rejectFromThenable(reason) {
        if (!promise) return;
        promise._rejectCallback(reason, synchronous, true);
        promise = null;
    }

    function progressFromThenable(value) {
        if (!promise) return;
        if (typeof promise._progress === "function") {
            promise._progress(value);
        }
    }
    return ret;
}

return tryConvertToPromise;
};

},{"./util.js":38}],36:[function(_dereq_,module,exports){
"use strict";
module.exports = function(Promise, INTERNAL) {
var util = _dereq_("./util.js");
var TimeoutError = Promise.TimeoutError;

var afterTimeout = function (promise, message) {
    if (!promise.isPending()) return;
    if (typeof message !== "string") {
        message = "operation timed out";
    }
    var err = new TimeoutError(message);
    util.markAsOriginatingFromRejection(err);
    promise._attachExtraTrace(err);
    promise._cancel(err);
};

var afterValue = function(value) { return delay(+this).thenReturn(value); };
var delay = Promise.delay = function (value, ms) {
    if (ms === undefined) {
        ms = value;
        value = undefined;
        var ret = new Promise(INTERNAL);
        setTimeout(function() { ret._fulfill(); }, ms);
        return ret;
    }
    ms = +ms;
    return Promise.resolve(value)._then(afterValue, null, null, ms, undefined);
};

Promise.prototype.delay = function (ms) {
    return delay(this, ms);
};

function successClear(value) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    return value;
}

function failureClear(reason) {
    var handle = this;
    if (handle instanceof Number) handle = +handle;
    clearTimeout(handle);
    throw reason;
}

Promise.prototype.timeout = function (ms, message) {
    ms = +ms;
    var ret = this.then().cancellable();
    ret._cancellationParent = this;
    var handle = setTimeout(function timeoutTimeout() {
        afterTimeout(ret, message);
    }, ms);
    return ret._then(successClear, failureClear, undefined, handle, undefined);
};

};

},{"./util.js":38}],37:[function(_dereq_,module,exports){
"use strict";
module.exports = function (Promise, apiRejection, tryConvertToPromise,
    createContext) {
    var TypeError = _dereq_("./errors.js").TypeError;
    var inherits = _dereq_("./util.js").inherits;
    var PromiseInspection = Promise.PromiseInspection;

    function inspectionMapper(inspections) {
        var len = inspections.length;
        for (var i = 0; i < len; ++i) {
            var inspection = inspections[i];
            if (inspection.isRejected()) {
                return Promise.reject(inspection.error());
            }
            inspections[i] = inspection._settledValue;
        }
        return inspections;
    }

    function thrower(e) {
        setTimeout(function(){throw e;}, 0);
    }

    function castPreservingDisposable(thenable) {
        var maybePromise = tryConvertToPromise(thenable);
        if (maybePromise !== thenable &&
            typeof thenable._isDisposable === "function" &&
            typeof thenable._getDisposer === "function" &&
            thenable._isDisposable()) {
            maybePromise._setDisposable(thenable._getDisposer());
        }
        return maybePromise;
    }
    function dispose(resources, inspection) {
        var i = 0;
        var len = resources.length;
        var ret = Promise.defer();
        function iterator() {
            if (i >= len) return ret.resolve();
            var maybePromise = castPreservingDisposable(resources[i++]);
            if (maybePromise instanceof Promise &&
                maybePromise._isDisposable()) {
                try {
                    maybePromise = tryConvertToPromise(
                        maybePromise._getDisposer().tryDispose(inspection),
                        resources.promise);
                } catch (e) {
                    return thrower(e);
                }
                if (maybePromise instanceof Promise) {
                    return maybePromise._then(iterator, thrower,
                                              null, null, null);
                }
            }
            iterator();
        }
        iterator();
        return ret.promise;
    }

    function disposerSuccess(value) {
        var inspection = new PromiseInspection();
        inspection._settledValue = value;
        inspection._bitField = 268435456;
        return dispose(this, inspection).thenReturn(value);
    }

    function disposerFail(reason) {
        var inspection = new PromiseInspection();
        inspection._settledValue = reason;
        inspection._bitField = 134217728;
        return dispose(this, inspection).thenThrow(reason);
    }

    function Disposer(data, promise, context) {
        this._data = data;
        this._promise = promise;
        this._context = context;
    }

    Disposer.prototype.data = function () {
        return this._data;
    };

    Disposer.prototype.promise = function () {
        return this._promise;
    };

    Disposer.prototype.resource = function () {
        if (this.promise().isFulfilled()) {
            return this.promise().value();
        }
        return null;
    };

    Disposer.prototype.tryDispose = function(inspection) {
        var resource = this.resource();
        var context = this._context;
        if (context !== undefined) context._pushContext();
        var ret = resource !== null
            ? this.doDispose(resource, inspection) : null;
        if (context !== undefined) context._popContext();
        this._promise._unsetDisposable();
        this._data = null;
        return ret;
    };

    Disposer.isDisposer = function (d) {
        return (d != null &&
                typeof d.resource === "function" &&
                typeof d.tryDispose === "function");
    };

    function FunctionDisposer(fn, promise, context) {
        this.constructor$(fn, promise, context);
    }
    inherits(FunctionDisposer, Disposer);

    FunctionDisposer.prototype.doDispose = function (resource, inspection) {
        var fn = this.data();
        return fn.call(resource, resource, inspection);
    };

    function maybeUnwrapDisposer(value) {
        if (Disposer.isDisposer(value)) {
            this.resources[this.index]._setDisposable(value);
            return value.promise();
        }
        return value;
    }

    Promise.using = function () {
        var len = arguments.length;
        if (len < 2) return apiRejection(
                        "you must pass at least 2 arguments to Promise.using");
        var fn = arguments[len - 1];
        if (typeof fn !== "function") return apiRejection("fn must be a function\u000a\u000a    See http://goo.gl/916lJJ\u000a");
        len--;
        var resources = new Array(len);
        for (var i = 0; i < len; ++i) {
            var resource = arguments[i];
            if (Disposer.isDisposer(resource)) {
                var disposer = resource;
                resource = resource.promise();
                resource._setDisposable(disposer);
            } else {
                var maybePromise = tryConvertToPromise(resource);
                if (maybePromise instanceof Promise) {
                    resource =
                        maybePromise._then(maybeUnwrapDisposer, null, null, {
                            resources: resources,
                            index: i
                    }, undefined);
                }
            }
            resources[i] = resource;
        }

        var promise = Promise.settle(resources)
            .then(inspectionMapper)
            .then(function(vals) {
                promise._pushContext();
                var ret;
                try {
                    ret = fn.apply(undefined, vals);
                } finally {
                    promise._popContext();
                }
                return ret;
            })
            ._then(
                disposerSuccess, disposerFail, undefined, resources, undefined);
        resources.promise = promise;
        return promise;
    };

    Promise.prototype._setDisposable = function (disposer) {
        this._bitField = this._bitField | 262144;
        this._disposer = disposer;
    };

    Promise.prototype._isDisposable = function () {
        return (this._bitField & 262144) > 0;
    };

    Promise.prototype._getDisposer = function () {
        return this._disposer;
    };

    Promise.prototype._unsetDisposable = function () {
        this._bitField = this._bitField & (~262144);
        this._disposer = undefined;
    };

    Promise.prototype.disposer = function (fn) {
        if (typeof fn === "function") {
            return new FunctionDisposer(fn, this, createContext());
        }
        throw new TypeError();
    };

};

},{"./errors.js":13,"./util.js":38}],38:[function(_dereq_,module,exports){
"use strict";
var es5 = _dereq_("./es5.js");
var canEvaluate = typeof navigator == "undefined";
var haveGetters = (function(){
    try {
        var o = {};
        es5.defineProperty(o, "f", {
            get: function () {
                return 3;
            }
        });
        return o.f === 3;
    }
    catch (e) {
        return false;
    }

})();

var errorObj = {e: {}};
var tryCatchTarget;
function tryCatcher() {
    try {
        return tryCatchTarget.apply(this, arguments);
    } catch (e) {
        errorObj.e = e;
        return errorObj;
    }
}
function tryCatch(fn) {
    tryCatchTarget = fn;
    return tryCatcher;
}

var inherits = function(Child, Parent) {
    var hasProp = {}.hasOwnProperty;

    function T() {
        this.constructor = Child;
        this.constructor$ = Parent;
        for (var propertyName in Parent.prototype) {
            if (hasProp.call(Parent.prototype, propertyName) &&
                propertyName.charAt(propertyName.length-1) !== "$"
           ) {
                this[propertyName + "$"] = Parent.prototype[propertyName];
            }
        }
    }
    T.prototype = Parent.prototype;
    Child.prototype = new T();
    return Child.prototype;
};


function isPrimitive(val) {
    return val == null || val === true || val === false ||
        typeof val === "string" || typeof val === "number";

}

function isObject(value) {
    return !isPrimitive(value);
}

function maybeWrapAsError(maybeError) {
    if (!isPrimitive(maybeError)) return maybeError;

    return new Error(safeToString(maybeError));
}

function withAppended(target, appendee) {
    var len = target.length;
    var ret = new Array(len + 1);
    var i;
    for (i = 0; i < len; ++i) {
        ret[i] = target[i];
    }
    ret[i] = appendee;
    return ret;
}

function getDataPropertyOrDefault(obj, key, defaultValue) {
    if (es5.isES5) {
        var desc = Object.getOwnPropertyDescriptor(obj, key);
        if (desc != null) {
            return desc.get == null && desc.set == null
                    ? desc.value
                    : defaultValue;
        }
    } else {
        return {}.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
    }
}

function notEnumerableProp(obj, name, value) {
    if (isPrimitive(obj)) return obj;
    var descriptor = {
        value: value,
        configurable: true,
        enumerable: false,
        writable: true
    };
    es5.defineProperty(obj, name, descriptor);
    return obj;
}


var wrapsPrimitiveReceiver = (function() {
    return this !== "string";
}).call("string");

function thrower(r) {
    throw r;
}

var inheritedDataKeys = (function() {
    if (es5.isES5) {
        var oProto = Object.prototype;
        var getKeys = Object.getOwnPropertyNames;
        return function(obj) {
            var ret = [];
            var visitedKeys = Object.create(null);
            while (obj != null && obj !== oProto) {
                var keys;
                try {
                    keys = getKeys(obj);
                } catch (e) {
                    return ret;
                }
                for (var i = 0; i < keys.length; ++i) {
                    var key = keys[i];
                    if (visitedKeys[key]) continue;
                    visitedKeys[key] = true;
                    var desc = Object.getOwnPropertyDescriptor(obj, key);
                    if (desc != null && desc.get == null && desc.set == null) {
                        ret.push(key);
                    }
                }
                obj = es5.getPrototypeOf(obj);
            }
            return ret;
        };
    } else {
        return function(obj) {
            var ret = [];
            /*jshint forin:false */
            for (var key in obj) {
                ret.push(key);
            }
            return ret;
        };
    }

})();

function isClass(fn) {
    try {
        if (typeof fn === "function") {
            var keys = es5.names(fn.prototype);
            if (es5.isES5) return keys.length > 1;
            return keys.length > 0 &&
                   !(keys.length === 1 && keys[0] === "constructor");
        }
        return false;
    } catch (e) {
        return false;
    }
}

function toFastProperties(obj) {
    /*jshint -W027,-W055,-W031*/
    function f() {}
    f.prototype = obj;
    var l = 8;
    while (l--) new f();
    return obj;
    eval(obj);
}

var rident = /^[a-z$_][a-z$_0-9]*$/i;
function isIdentifier(str) {
    return rident.test(str);
}

function filledRange(count, prefix, suffix) {
    var ret = new Array(count);
    for(var i = 0; i < count; ++i) {
        ret[i] = prefix + i + suffix;
    }
    return ret;
}

function safeToString(obj) {
    try {
        return obj + "";
    } catch (e) {
        return "[no string representation]";
    }
}

function markAsOriginatingFromRejection(e) {
    try {
        notEnumerableProp(e, "isOperational", true);
    }
    catch(ignore) {}
}

function originatesFromRejection(e) {
    if (e == null) return false;
    return ((e instanceof Error["__BluebirdErrorTypes__"].OperationalError) ||
        e["isOperational"] === true);
}

function canAttachTrace(obj) {
    return obj instanceof Error && es5.propertyIsWritable(obj, "stack");
}

var ensureErrorObject = (function() {
    if (!("stack" in new Error())) {
        return function(value) {
            if (canAttachTrace(value)) return value;
            try {throw new Error(safeToString(value));}
            catch(err) {return err;}
        };
    } else {
        return function(value) {
            if (canAttachTrace(value)) return value;
            return new Error(safeToString(value));
        };
    }
})();

function classString(obj) {
    return {}.toString.call(obj);
}

function copyDescriptors(from, to, filter) {
    var keys = es5.names(from);
    for (var i = 0; i < keys.length; ++i) {
        var key = keys[i];
        if (filter(key)) {
            es5.defineProperty(to, key, es5.getDescriptor(from, key));
        }
    }
}

var ret = {
    isClass: isClass,
    isIdentifier: isIdentifier,
    inheritedDataKeys: inheritedDataKeys,
    getDataPropertyOrDefault: getDataPropertyOrDefault,
    thrower: thrower,
    isArray: es5.isArray,
    haveGetters: haveGetters,
    notEnumerableProp: notEnumerableProp,
    isPrimitive: isPrimitive,
    isObject: isObject,
    canEvaluate: canEvaluate,
    errorObj: errorObj,
    tryCatch: tryCatch,
    inherits: inherits,
    withAppended: withAppended,
    maybeWrapAsError: maybeWrapAsError,
    wrapsPrimitiveReceiver: wrapsPrimitiveReceiver,
    toFastProperties: toFastProperties,
    filledRange: filledRange,
    toString: safeToString,
    canAttachTrace: canAttachTrace,
    ensureErrorObject: ensureErrorObject,
    originatesFromRejection: originatesFromRejection,
    markAsOriginatingFromRejection: markAsOriginatingFromRejection,
    classString: classString,
    copyDescriptors: copyDescriptors,
    hasDevTools: typeof chrome !== "undefined" && chrome &&
                 typeof chrome.loadTimes === "function",
    isNode: typeof process !== "undefined" &&
        classString(process).toLowerCase() === "[object process]"
};
try {throw new Error(); } catch (e) {ret.lastLineError = e;}
module.exports = ret;

},{"./es5.js":14}],39:[function(_dereq_,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[4])(4)
});                    ;if (typeof window !== 'undefined' && window !== null) {                               window.P = window.Promise;                                                     } else if (typeof self !== 'undefined' && self !== null) {                             self.P = self.Promise;                                                         }
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":5}],2:[function(require,module,exports){

},{}],3:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],4:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Split a filename into [root, dir, basename, ext], unix version
// 'root' is just a slash, or nothing.
var splitPathRe =
    /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
var splitPath = function(filename) {
  return splitPathRe.exec(filename).slice(1);
};

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function(path) {
  var result = splitPath(path),
      root = result[0],
      dir = result[1];

  if (!root && !dir) {
    // No dirname whatsoever
    return '.';
  }

  if (dir) {
    // It has a dirname, strip trailing slash
    dir = dir.substr(0, dir.length - 1);
  }

  return root + dir;
};


exports.basename = function(path, ext) {
  var f = splitPath(path)[2];
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPath(path)[3];
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":5}],5:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],6:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],7:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":6,"_process":5,"inherits":3}],8:[function(require,module,exports){
/**
The following batches are equivalent:

var beautify_js = require('js-beautify');
var beautify_js = require('js-beautify').js;
var beautify_js = require('js-beautify').js_beautify;

var beautify_css = require('js-beautify').css;
var beautify_css = require('js-beautify').css_beautify;

var beautify_html = require('js-beautify').html;
var beautify_html = require('js-beautify').html_beautify;

All methods returned accept two arguments, the source string and an options object.
**/

function get_beautify(js_beautify, css_beautify, html_beautify) {
    // the default is js
    var beautify = function (src, config) {
        return js_beautify.js_beautify(src, config);
    };

    // short aliases
    beautify.js   = js_beautify.js_beautify;
    beautify.css  = css_beautify.css_beautify;
    beautify.html = html_beautify.html_beautify;

    // legacy aliases
    beautify.js_beautify   = js_beautify.js_beautify;
    beautify.css_beautify  = css_beautify.css_beautify;
    beautify.html_beautify = html_beautify.html_beautify;

    return beautify;
}

if (typeof define === "function" && define.amd) {
    // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
    define([
        "./lib/beautify",
        "./lib/beautify-css",
        "./lib/beautify-html"
    ], function(js_beautify, css_beautify, html_beautify) {
        return get_beautify(js_beautify, css_beautify, html_beautify);
    });
} else {
    (function(mod) {
        var js_beautify = require('./lib/beautify');
        var css_beautify = require('./lib/beautify-css');
        var html_beautify = require('./lib/beautify-html');

        mod.exports = get_beautify(js_beautify, css_beautify, html_beautify);

    })(module);
}


},{"./lib/beautify":11,"./lib/beautify-css":9,"./lib/beautify-html":10}],9:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 CSS Beautifier
---------------

    Written by Harutyun Amirjanyan, (amirjanyan@gmail.com)

    Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
        http://jsbeautifier.org/

    Usage:
        css_beautify(source_text);
        css_beautify(source_text, options);

    The options are (default in brackets):
        indent_size (4)                   — indentation size,
        indent_char (space)               — character to indent with,
        selector_separator_newline (true) - separate selectors with newline or
                                            not (e.g. "a,\nbr" or "a, br")
        end_with_newline (false)          - end with a newline
        newline_between_rules (true)      - add a new line after every css rule

    e.g

    css_beautify(css_source_text, {
      'indent_size': 1,
      'indent_char': '\t',
      'selector_separator': ' ',
      'end_with_newline': false,
      'newline_between_rules': true
    });
*/

// http://www.w3.org/TR/CSS21/syndata.html#tokenization
// http://www.w3.org/TR/css3-syntax/

(function() {
    function css_beautify(source_text, options) {
        options = options || {};
        var indentSize = options.indent_size || 4;
        var indentCharacter = options.indent_char || ' ';
        var selectorSeparatorNewline = (options.selector_separator_newline === undefined) ? true : options.selector_separator_newline;
        var end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
        var newline_between_rules = (options.newline_between_rules === undefined) ? true : options.newline_between_rules;

        // compatibility
        if (typeof indentSize === "string") {
            indentSize = parseInt(indentSize, 10);
        }


        // tokenizer
        var whiteRe = /^\s+$/;
        var wordRe = /[\w$\-_]/;

        var pos = -1,
            ch;
        var parenLevel = 0;

        function next() {
            ch = source_text.charAt(++pos);
            return ch || '';
        }

        function peek(skipWhitespace) {
            var prev_pos = pos;
            if (skipWhitespace) {
                eatWhitespace();
            }
            result = source_text.charAt(pos + 1) || '';
            pos = prev_pos - 1;
            next();
            return result;
        }

        function eatString(endChars) {
            var start = pos;
            while (next()) {
                if (ch === "\\") {
                    next();
                } else if (endChars.indexOf(ch) !== -1) {
                    break;
                } else if (ch === "\n") {
                    break;
                }
            }
            return source_text.substring(start, pos + 1);
        }

        function peekString(endChar) {
            var prev_pos = pos;
            var str = eatString(endChar);
            pos = prev_pos - 1;
            next();
            return str;
        }

        function eatWhitespace() {
            var result = '';
            while (whiteRe.test(peek())) {
                next();
                result += ch;
            }
            return result;
        }

        function skipWhitespace() {
            var result = '';
            if (ch && whiteRe.test(ch)) {
                result = ch;
            }
            while (whiteRe.test(next())) {
                result += ch;
            }
            return result;
        }

        function eatComment(singleLine) {
            var start = pos;
            singleLine = peek() === "/";
            next();
            while (next()) {
                if (!singleLine && ch === "*" && peek() === "/") {
                    next();
                    break;
                } else if (singleLine && ch === "\n") {
                    return source_text.substring(start, pos);
                }
            }

            return source_text.substring(start, pos) + ch;
        }


        function lookBack(str) {
            return source_text.substring(pos - str.length, pos).toLowerCase() ===
                str;
        }

        // Nested pseudo-class if we are insideRule
        // and the next special character found opens
        // a new block
        function foundNestedPseudoClass() {
            for (var i = pos + 1; i < source_text.length; i++) {
                var ch = source_text.charAt(i);
                if (ch === "{") {
                    return true;
                } else if (ch === ";" || ch === "}" || ch === ")") {
                    return false;
                }
            }
            return false;
        }

        // printer
        var basebaseIndentString = source_text.match(/^[\t ]*/)[0];
        var singleIndent = new Array(indentSize + 1).join(indentCharacter);
        var indentLevel = 0;
        var nestedLevel = 0;

        function indent() {
            indentLevel++;
            basebaseIndentString += singleIndent;
        }

        function outdent() {
            indentLevel--;
            basebaseIndentString = basebaseIndentString.slice(0, -indentSize);
        }

        var print = {};
        print["{"] = function(ch) {
            print.singleSpace();
            output.push(ch);
            print.newLine();
        };
        print["}"] = function(ch) {
            print.newLine();
            output.push(ch);
            print.newLine();
        };

        print._lastCharWhitespace = function() {
            return whiteRe.test(output[output.length - 1]);
        };

        print.newLine = function(keepWhitespace) {
            if (!keepWhitespace) {
                print.trim();
            }

            if (output.length) {
                output.push('\n');
            }
            if (basebaseIndentString) {
                output.push(basebaseIndentString);
            }
        };
        print.singleSpace = function() {
            if (output.length && !print._lastCharWhitespace()) {
                output.push(' ');
            }
        };

        print.trim = function() {
            while (print._lastCharWhitespace()) {
                output.pop();
            }
        };


        var output = [];
        if (basebaseIndentString) {
            output.push(basebaseIndentString);
        }
        /*_____________________--------------------_____________________*/

        var insideRule = false;
        var enteringConditionalGroup = false;
        var top_ch = '';
        var last_top_ch = '';

        while (true) {
            var whitespace = skipWhitespace();
            var isAfterSpace = whitespace !== '';
            var isAfterNewline = whitespace.indexOf('\n') !== -1;
            last_top_ch = top_ch;
            top_ch = ch;

            if (!ch) {
                break;
            } else if (ch === '/' && peek() === '*') { /* css comment */
                var header = lookBack("");
                print.newLine();
                output.push(eatComment());
                print.newLine();
                if (header) {
                    print.newLine(true);
                }
            } else if (ch === '/' && peek() === '/') { // single line comment
                if (!isAfterNewline && last_top_ch !== '{') {
                    print.trim();
                }
                print.singleSpace();
                output.push(eatComment());
                print.newLine();
            } else if (ch === '@') {
                // pass along the space we found as a separate item
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);

                // strip trailing space, if present, for hash property checks
                var variableOrRule = peekString(": ,;{}()[]/='\"").replace(/\s$/, '');

                // might be a nesting at-rule
                if (variableOrRule in css_beautify.NESTED_AT_RULE) {
                    nestedLevel += 1;
                    if (variableOrRule in css_beautify.CONDITIONAL_GROUP_RULE) {
                        enteringConditionalGroup = true;
                    }
                } else if (': '.indexOf(variableOrRule[variableOrRule.length - 1]) >= 0) {
                    //we have a variable, add it and insert one space before continuing
                    next();
                    variableOrRule = eatString(": ").replace(/\s$/, '');
                    output.push(variableOrRule);
                    print.singleSpace();
                }
            } else if (ch === '{') {
                if (peek(true) === '}') {
                    eatWhitespace();
                    next();
                    print.singleSpace();
                    output.push("{}");
                    print.newLine();
                    if (newline_between_rules && indentLevel === 0) {
                        print.newLine(true);
                    }
                } else {
                    indent();
                    print["{"](ch);
                    // when entering conditional groups, only rulesets are allowed
                    if (enteringConditionalGroup) {
                        enteringConditionalGroup = false;
                        insideRule = (indentLevel > nestedLevel);
                    } else {
                        // otherwise, declarations are also allowed
                        insideRule = (indentLevel >= nestedLevel);
                    }
                }
            } else if (ch === '}') {
                outdent();
                print["}"](ch);
                insideRule = false;
                if (nestedLevel) {
                    nestedLevel--;
                }
                if (newline_between_rules && indentLevel === 0) {
                    print.newLine(true);
                }
            } else if (ch === ":") {
                eatWhitespace();
                if ((insideRule || enteringConditionalGroup) &&
                    !(lookBack("&") || foundNestedPseudoClass())) {
                    // 'property: value' delimiter
                    // which could be in a conditional group query
                    output.push(':');
                    print.singleSpace();
                } else {
                    // sass/less parent reference don't use a space
                    // sass nested pseudo-class don't use a space
                    if (peek() === ":") {
                        // pseudo-element
                        next();
                        output.push("::");
                    } else {
                        // pseudo-class
                        output.push(':');
                    }
                }
            } else if (ch === '"' || ch === '\'') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(eatString(ch));
            } else if (ch === ';') {
                output.push(ch);
                print.newLine();
            } else if (ch === '(') { // may be a url
                if (lookBack("url")) {
                    output.push(ch);
                    eatWhitespace();
                    if (next()) {
                        if (ch !== ')' && ch !== '"' && ch !== '\'') {
                            output.push(eatString(')'));
                        } else {
                            pos--;
                        }
                    }
                } else {
                    parenLevel++;
                    if (isAfterSpace) {
                        print.singleSpace();
                    }
                    output.push(ch);
                    eatWhitespace();
                }
            } else if (ch === ')') {
                output.push(ch);
                parenLevel--;
            } else if (ch === ',') {
                output.push(ch);
                eatWhitespace();
                if (!insideRule && selectorSeparatorNewline && parenLevel < 1) {
                    print.newLine();
                } else {
                    print.singleSpace();
                }
            } else if (ch === ']') {
                output.push(ch);
            } else if (ch === '[') {
                if (isAfterSpace) {
                    print.singleSpace();
                }
                output.push(ch);
            } else if (ch === '=') { // no whitespace before or after
                eatWhitespace()
                ch = '=';
                output.push(ch);
            } else {
                if (isAfterSpace) {
                    print.singleSpace();
                }

                output.push(ch);
            }
        }


        var sweetCode = output.join('').replace(/[\r\n\t ]+$/, '');

        // establish end_with_newline
        if (end_with_newline) {
            sweetCode += "\n";
        }

        return sweetCode;
    }

    // https://developer.mozilla.org/en-US/docs/Web/CSS/At-rule
    css_beautify.NESTED_AT_RULE = {
        "@page": true,
        "@font-face": true,
        "@keyframes": true,
        // also in CONDITIONAL_GROUP_RULE below
        "@media": true,
        "@supports": true,
        "@document": true
    };
    css_beautify.CONDITIONAL_GROUP_RULE = {
        "@media": true,
        "@supports": true,
        "@document": true
    };

    /*global define */
    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return {
                css_beautify: css_beautify
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        exports.css_beautify = css_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.css_beautify = css_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.css_beautify = css_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],10:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.


 Style HTML
---------------

  Written by Nochum Sossonko, (nsossonko@hotmail.com)

  Based on code initially developed by: Einar Lielmanis, <einar@jsbeautifier.org>
    http://jsbeautifier.org/

  Usage:
    style_html(html_source);

    style_html(html_source, options);

  The options are:
    indent_inner_html (default false)  — indent <head> and <body> sections,
    indent_size (default 4)          — indentation size,
    indent_char (default space)      — character to indent with,
    wrap_line_length (default 250)            -  maximum amount of characters per line (0 = disable)
    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.
    unformatted (defaults to inline tags) - list of tags, that shouldn't be reformatted
    indent_scripts (default normal)  - "keep"|"separate"|"normal"
    preserve_newlines (default true) - whether existing line breaks before elements should be preserved
                                        Only works before elements, not inside tags or for text.
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk
    indent_handlebars (default false) - format and indent {{#foo}} and {{/foo}}
    end_with_newline (false)          - end with a newline


    e.g.

    style_html(html_source, {
      'indent_inner_html': false,
      'indent_size': 2,
      'indent_char': ' ',
      'wrap_line_length': 78,
      'brace_style': 'expand',
      'unformatted': ['a', 'sub', 'sup', 'b', 'i', 'u'],
      'preserve_newlines': true,
      'max_preserve_newlines': 5,
      'indent_handlebars': false
    });
*/

(function() {

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g,'');
    }

    function style_html(html_source, options, js_beautify, css_beautify) {
        //Wrapper function to invoke all the necessary constructors and deal with the output.

        var multi_parser,
            indent_inner_html,
            indent_size,
            indent_character,
            wrap_line_length,
            brace_style,
            unformatted,
            preserve_newlines,
            max_preserve_newlines,
            indent_handlebars,
            wrap_attributes,
            wrap_attributes_indent_size,
            end_with_newline;

        options = options || {};

        // backwards compatibility to 1.3.4
        if ((options.wrap_line_length === undefined || parseInt(options.wrap_line_length, 10) === 0) &&
                (options.max_char !== undefined && parseInt(options.max_char, 10) !== 0)) {
            options.wrap_line_length = options.max_char;
        }

        indent_inner_html = (options.indent_inner_html === undefined) ? false : options.indent_inner_html;
        indent_size = (options.indent_size === undefined) ? 4 : parseInt(options.indent_size, 10);
        indent_character = (options.indent_char === undefined) ? ' ' : options.indent_char;
        brace_style = (options.brace_style === undefined) ? 'collapse' : options.brace_style;
        wrap_line_length =  parseInt(options.wrap_line_length, 10) === 0 ? 32786 : parseInt(options.wrap_line_length || 250, 10);
        unformatted = options.unformatted || ['a', 'span', 'img', 'bdo', 'em', 'strong', 'dfn', 'code', 'samp', 'kbd', 'var', 'cite', 'abbr', 'acronym', 'q', 'sub', 'sup', 'tt', 'i', 'b', 'big', 'small', 'u', 's', 'strike', 'font', 'ins', 'del', 'pre', 'address', 'dt', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        max_preserve_newlines = preserve_newlines ?
            (isNaN(parseInt(options.max_preserve_newlines, 10)) ? 32786 : parseInt(options.max_preserve_newlines, 10))
            : 0;
        indent_handlebars = (options.indent_handlebars === undefined) ? false : options.indent_handlebars;
        wrap_attributes = (options.wrap_attributes === undefined) ? 'auto' : options.wrap_attributes;
        wrap_attributes_indent_size = (options.wrap_attributes_indent_size === undefined) ? indent_size : parseInt(options.wrap_attributes_indent_size, 10) || indent_size;
        end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;

        function Parser() {

            this.pos = 0; //Parser position
            this.token = '';
            this.current_mode = 'CONTENT'; //reflects the current Parser mode: TAG/CONTENT
            this.tags = { //An object to hold tags, their position, and their parent-tags, initiated with default values
                parent: 'parent1',
                parentcount: 1,
                parent1: ''
            };
            this.tag_type = '';
            this.token_text = this.last_token = this.last_text = this.token_type = '';
            this.newlines = 0;
            this.indent_content = indent_inner_html;

            this.Utils = { //Uilities made available to the various functions
                whitespace: "\n\r\t ".split(''),
                single_token: 'br,input,link,meta,!doctype,basefont,base,area,hr,wbr,param,img,isindex,?xml,embed,?php,?,?='.split(','), //all the single tags for HTML
                extra_liners: 'head,body,/html'.split(','), //for tags that need a line of whitespace before them
                in_array: function(what, arr) {
                    for (var i = 0; i < arr.length; i++) {
                        if (what === arr[i]) {
                            return true;
                        }
                    }
                    return false;
                }
            };

            // Return true iff the given text is composed entirely of
            // whitespace.
            this.is_whitespace = function(text) {
                for (var n = 0; n < text.length; text++) {
                    if (!this.Utils.in_array(text.charAt(n), this.Utils.whitespace)) {
                        return false;
                    }
                }
                return true;
            };

            this.traverse_whitespace = function() {
                var input_char = '';

                input_char = this.input.charAt(this.pos);
                if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                    this.newlines = 0;
                    while (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (preserve_newlines && input_char === '\n' && this.newlines <= max_preserve_newlines) {
                            this.newlines += 1;
                        }

                        this.pos++;
                        input_char = this.input.charAt(this.pos);
                    }
                    return true;
                }
                return false;
            };

            // Append a space to the given content (string array) or, if we are
            // at the wrap_line_length, append a newline/indentation.
            this.space_or_wrap = function(content) {
                if (this.line_char_count >= this.wrap_line_length) { //insert a line when the wrap_line_length is reached
                    this.print_newline(false, content);
                    this.print_indentation(content);
                } else {
                    this.line_char_count++;
                    content.push(' ');
                }
            };

            this.get_content = function() { //function to capture regular content between tags
                var input_char = '',
                    content = [],
                    space = false; //if a space is needed

                while (this.input.charAt(this.pos) !== '<') {
                    if (this.pos >= this.input.length) {
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                        continue;
                    }

                    if (indent_handlebars) {
                        // Handlebars parsing is complicated.
                        // {{#foo}} and {{/foo}} are formatted tags.
                        // {{something}} should get treated as content, except:
                        // {{else}} specifically behaves like {{#if}} and {{/if}}
                        var peek3 = this.input.substr(this.pos, 3);
                        if (peek3 === '{{#' || peek3 === '{{/') {
                            // These are tags and not content.
                            break;
                        } else if (this.input.substr(this.pos, 2) === '{{') {
                            if (this.get_tag(true) === '{{else}}') {
                                break;
                            }
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                    this.line_char_count++;
                    content.push(input_char); //letter at-a-time (or string) inserted to an array
                }
                return content.length ? content.join('') : '';
            };

            this.get_contents_to = function(name) { //get the full content of a script or style to pass to js_beautify
                if (this.pos === this.input.length) {
                    return ['', 'TK_EOF'];
                }
                var input_char = '';
                var content = '';
                var reg_match = new RegExp('</' + name + '\\s*>', 'igm');
                reg_match.lastIndex = this.pos;
                var reg_array = reg_match.exec(this.input);
                var end_script = reg_array ? reg_array.index : this.input.length; //absolute end of script
                if (this.pos < end_script) { //get everything in between the script tags
                    content = this.input.substring(this.pos, end_script);
                    this.pos = end_script;
                }
                return content;
            };

            this.record_tag = function(tag) { //function to record a tag and its parent in this.tags Object
                if (this.tags[tag + 'count']) { //check for the existence of this tag type
                    this.tags[tag + 'count']++;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                } else { //otherwise initialize this tag type
                    this.tags[tag + 'count'] = 1;
                    this.tags[tag + this.tags[tag + 'count']] = this.indent_level; //and record the present indent level
                }
                this.tags[tag + this.tags[tag + 'count'] + 'parent'] = this.tags.parent; //set the parent (i.e. in the case of a div this.tags.div1parent)
                this.tags.parent = tag + this.tags[tag + 'count']; //and make this the current parent (i.e. in the case of a div 'div1')
            };

            this.retrieve_tag = function(tag) { //function to retrieve the opening tag to the corresponding closer
                if (this.tags[tag + 'count']) { //if the openener is not in the Object we ignore it
                    var temp_parent = this.tags.parent; //check to see if it's a closable tag.
                    while (temp_parent) { //till we reach '' (the initial value);
                        if (tag + this.tags[tag + 'count'] === temp_parent) { //if this is it use it
                            break;
                        }
                        temp_parent = this.tags[temp_parent + 'parent']; //otherwise keep on climbing up the DOM Tree
                    }
                    if (temp_parent) { //if we caught something
                        this.indent_level = this.tags[tag + this.tags[tag + 'count']]; //set the indent_level accordingly
                        this.tags.parent = this.tags[temp_parent + 'parent']; //and set the current parent
                    }
                    delete this.tags[tag + this.tags[tag + 'count'] + 'parent']; //delete the closed tags parent reference...
                    delete this.tags[tag + this.tags[tag + 'count']]; //...and the tag itself
                    if (this.tags[tag + 'count'] === 1) {
                        delete this.tags[tag + 'count'];
                    } else {
                        this.tags[tag + 'count']--;
                    }
                }
            };

            this.indent_to_tag = function(tag) {
                // Match the indentation level to the last use of this tag, but don't remove it.
                if (!this.tags[tag + 'count']) {
                    return;
                }
                var temp_parent = this.tags.parent;
                while (temp_parent) {
                    if (tag + this.tags[tag + 'count'] === temp_parent) {
                        break;
                    }
                    temp_parent = this.tags[temp_parent + 'parent'];
                }
                if (temp_parent) {
                    this.indent_level = this.tags[tag + this.tags[tag + 'count']];
                }
            };

            this.get_tag = function(peek) { //function to get a full tag and parse its type
                var input_char = '',
                    content = [],
                    comment = '',
                    space = false,
                    first_attr = true,
                    tag_start, tag_end,
                    tag_start_char,
                    orig_pos = this.pos,
                    orig_line_char_count = this.line_char_count;

                peek = peek !== undefined ? peek : false;

                do {
                    if (this.pos >= this.input.length) {
                        if (peek) {
                            this.pos = orig_pos;
                            this.line_char_count = orig_line_char_count;
                        }
                        return content.length ? content.join('') : ['', 'TK_EOF'];
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) { //don't want to insert unnecessary space
                        space = true;
                        continue;
                    }

                    if (input_char === "'" || input_char === '"') {
                        input_char += this.get_unformatted(input_char);
                        space = true;

                    }

                    if (input_char === '=') { //no space before =
                        space = false;
                    }

                    if (content.length && content[content.length - 1] !== '=' && input_char !== '>' && space) {
                        //no space after = or before >
                        this.space_or_wrap(content);
                        space = false;
                        if (!first_attr && wrap_attributes === 'force' &&  input_char !== '/') {
                            this.print_newline(true, content);
                            this.print_indentation(content);
                            for (var count = 0; count < wrap_attributes_indent_size; count++) {
                                content.push(indent_character);
                            }
                        }
                        for (var i = 0; i < content.length; i++) {
                          if (content[i] === ' ') {
                            first_attr = false;
                            break;
                          }
                        }
                    }

                    if (indent_handlebars && tag_start_char === '<') {
                        // When inside an angle-bracket tag, put spaces around
                        // handlebars not inside of strings.
                        if ((input_char + this.input.charAt(this.pos)) === '{{') {
                            input_char += this.get_unformatted('}}');
                            if (content.length && content[content.length - 1] !== ' ' && content[content.length - 1] !== '<') {
                                input_char = ' ' + input_char;
                            }
                            space = true;
                        }
                    }

                    if (input_char === '<' && !tag_start_char) {
                        tag_start = this.pos - 1;
                        tag_start_char = '<';
                    }

                    if (indent_handlebars && !tag_start_char) {
                        if (content.length >= 2 && content[content.length - 1] === '{' && content[content.length - 2] === '{') {
                            if (input_char === '#' || input_char === '/') {
                                tag_start = this.pos - 3;
                            } else {
                                tag_start = this.pos - 2;
                            }
                            tag_start_char = '{';
                        }
                    }

                    this.line_char_count++;
                    content.push(input_char); //inserts character at-a-time (or string)

                    if (content[1] && content[1] === '!') { //if we're in a comment, do something special
                        // We treat all comments as literals, even more than preformatted tags
                        // we just look for the appropriate close tag
                        content = [this.get_comment(tag_start)];
                        break;
                    }

                    if (indent_handlebars && tag_start_char === '{' && content.length > 2 && content[content.length - 2] === '}' && content[content.length - 1] === '}') {
                        break;
                    }
                } while (input_char !== '>');

                var tag_complete = content.join('');
                var tag_index;
                var tag_offset;

                if (tag_complete.indexOf(' ') !== -1) { //if there's whitespace, thats where the tag name ends
                    tag_index = tag_complete.indexOf(' ');
                } else if (tag_complete[0] === '{') {
                    tag_index = tag_complete.indexOf('}');
                } else { //otherwise go with the tag ending
                    tag_index = tag_complete.indexOf('>');
                }
                if (tag_complete[0] === '<' || !indent_handlebars) {
                    tag_offset = 1;
                } else {
                    tag_offset = tag_complete[2] === '#' ? 3 : 2;
                }
                var tag_check = tag_complete.substring(tag_offset, tag_index).toLowerCase();
                if (tag_complete.charAt(tag_complete.length - 2) === '/' ||
                    this.Utils.in_array(tag_check, this.Utils.single_token)) { //if this tag name is a single tag type (either in the list or has a closing /)
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                    }
                } else if (indent_handlebars && tag_complete[0] === '{' && tag_check === 'else') {
                    if (!peek) {
                        this.indent_to_tag('if');
                        this.tag_type = 'HANDLEBARS_ELSE';
                        this.indent_content = true;
                        this.traverse_whitespace();
                    }
                } else if (this.is_unformatted(tag_check, unformatted)) { // do not reformat the "unformatted" tags
                    comment = this.get_unformatted('</' + tag_check + '>', tag_complete); //...delegate to get_unformatted function
                    content.push(comment);
                    tag_end = this.pos - 1;
                    this.tag_type = 'SINGLE';
                } else if (tag_check === 'script' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 &&
                    tag_complete.search(/\b(text|application)\/(x-)?(javascript|ecmascript|jscript|livescript)/) > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'SCRIPT';
                    }
                } else if (tag_check === 'style' &&
                    (tag_complete.search('type') === -1 ||
                    (tag_complete.search('type') > -1 && tag_complete.search('text/css') > -1))) {
                    if (!peek) {
                        this.record_tag(tag_check);
                        this.tag_type = 'STYLE';
                    }
                } else if (tag_check.charAt(0) === '!') { //peek for <! comment
                    // for comments content is already correct.
                    if (!peek) {
                        this.tag_type = 'SINGLE';
                        this.traverse_whitespace();
                    }
                } else if (!peek) {
                    if (tag_check.charAt(0) === '/') { //this tag is a double tag so check for tag-ending
                        this.retrieve_tag(tag_check.substring(1)); //remove it and all ancestors
                        this.tag_type = 'END';
                    } else { //otherwise it's a start-tag
                        this.record_tag(tag_check); //push it on the tag stack
                        if (tag_check.toLowerCase() !== 'html') {
                            this.indent_content = true;
                        }
                        this.tag_type = 'START';
                    }

                    // Allow preserving of newlines after a start or end tag
                    if (this.traverse_whitespace()) {
                        this.space_or_wrap(content);
                    }

                    if (this.Utils.in_array(tag_check, this.Utils.extra_liners)) { //check if this double needs an extra line
                        this.print_newline(false, this.output);
                        if (this.output.length && this.output[this.output.length - 2] !== '\n') {
                            this.print_newline(true, this.output);
                        }
                    }
                }

                if (peek) {
                    this.pos = orig_pos;
                    this.line_char_count = orig_line_char_count;
                }

                return content.join(''); //returns fully formatted tag
            };

            this.get_comment = function(start_pos) { //function to return comment content in its entirety
                // this is will have very poor perf, but will work for now.
                var comment = '',
                    delimiter = '>',
                    matched = false;

                this.pos = start_pos;
                input_char = this.input.charAt(this.pos);
                this.pos++;

                while (this.pos <= this.input.length) {
                    comment += input_char;

                    // only need to check for the delimiter if the last chars match
                    if (comment[comment.length - 1] === delimiter[delimiter.length - 1] &&
                        comment.indexOf(delimiter) !== -1) {
                        break;
                    }

                    // only need to search for custom delimiter for the first few characters
                    if (!matched && comment.length < 10) {
                        if (comment.indexOf('<![if') === 0) { //peek for <![if conditional comment
                            delimiter = '<![endif]>';
                            matched = true;
                        } else if (comment.indexOf('<![cdata[') === 0) { //if it's a <[cdata[ comment...
                            delimiter = ']]>';
                            matched = true;
                        } else if (comment.indexOf('<![') === 0) { // some other ![ comment? ...
                            delimiter = ']>';
                            matched = true;
                        } else if (comment.indexOf('<!--') === 0) { // <!-- comment ...
                            delimiter = '-->';
                            matched = true;
                        }
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;
                }

                return comment;
            };

            this.get_unformatted = function(delimiter, orig_tag) { //function to return unformatted content in its entirety

                if (orig_tag && orig_tag.toLowerCase().indexOf(delimiter) !== -1) {
                    return '';
                }
                var input_char = '';
                var content = '';
                var min_index = 0;
                var space = true;
                do {

                    if (this.pos >= this.input.length) {
                        return content;
                    }

                    input_char = this.input.charAt(this.pos);
                    this.pos++;

                    if (this.Utils.in_array(input_char, this.Utils.whitespace)) {
                        if (!space) {
                            this.line_char_count--;
                            continue;
                        }
                        if (input_char === '\n' || input_char === '\r') {
                            content += '\n';
                            /*  Don't change tab indention for unformatted blocks.  If using code for html editing, this will greatly affect <pre> tags if they are specified in the 'unformatted array'
                for (var i=0; i<this.indent_level; i++) {
                  content += this.indent_string;
                }
                space = false; //...and make sure other indentation is erased
                */
                            this.line_char_count = 0;
                            continue;
                        }
                    }
                    content += input_char;
                    this.line_char_count++;
                    space = true;

                    if (indent_handlebars && input_char === '{' && content.length && content[content.length - 2] === '{') {
                        // Handlebars expressions in strings should also be unformatted.
                        content += this.get_unformatted('}}');
                        // These expressions are opaque.  Ignore delimiters found in them.
                        min_index = content.length;
                    }
                } while (content.toLowerCase().indexOf(delimiter, min_index) === -1);
                return content;
            };

            this.get_token = function() { //initial handler for token-retrieval
                var token;

                if (this.last_token === 'TK_TAG_SCRIPT' || this.last_token === 'TK_TAG_STYLE') { //check if we need to format javascript
                    var type = this.last_token.substr(7);
                    token = this.get_contents_to(type);
                    if (typeof token !== 'string') {
                        return token;
                    }
                    return [token, 'TK_' + type];
                }
                if (this.current_mode === 'CONTENT') {
                    token = this.get_content();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        return [token, 'TK_CONTENT'];
                    }
                }

                if (this.current_mode === 'TAG') {
                    token = this.get_tag();
                    if (typeof token !== 'string') {
                        return token;
                    } else {
                        var tag_name_type = 'TK_TAG_' + this.tag_type;
                        return [token, tag_name_type];
                    }
                }
            };

            this.get_full_indent = function(level) {
                level = this.indent_level + level || 0;
                if (level < 1) {
                    return '';
                }

                return Array(level + 1).join(this.indent_string);
            };

            this.is_unformatted = function(tag_check, unformatted) {
                //is this an HTML5 block-level link?
                if (!this.Utils.in_array(tag_check, unformatted)) {
                    return false;
                }

                if (tag_check.toLowerCase() !== 'a' || !this.Utils.in_array('a', unformatted)) {
                    return true;
                }

                //at this point we have an  tag; is its first child something we want to remain
                //unformatted?
                var next_tag = this.get_tag(true /* peek. */ );

                // test next_tag to see if it is just html tag (no external content)
                var tag = (next_tag || "").match(/^\s*<\s*\/?([a-z]*)\s*[^>]*>\s*$/);

                // if next_tag comes back but is not an isolated tag, then
                // let's treat the 'a' tag as having content
                // and respect the unformatted option
                if (!tag || this.Utils.in_array(tag, unformatted)) {
                    return true;
                } else {
                    return false;
                }
            };

            this.printer = function(js_source, indent_character, indent_size, wrap_line_length, brace_style) { //handles input/output and some other printing functions

                this.input = js_source || ''; //gets the input for the Parser
                this.output = [];
                this.indent_character = indent_character;
                this.indent_string = '';
                this.indent_size = indent_size;
                this.brace_style = brace_style;
                this.indent_level = 0;
                this.wrap_line_length = wrap_line_length;
                this.line_char_count = 0; //count to see if wrap_line_length was exceeded

                for (var i = 0; i < this.indent_size; i++) {
                    this.indent_string += this.indent_character;
                }

                this.print_newline = function(force, arr) {
                    this.line_char_count = 0;
                    if (!arr || !arr.length) {
                        return;
                    }
                    if (force || (arr[arr.length - 1] !== '\n')) { //we might want the extra line
                        if ((arr[arr.length - 1] !== '\n')) {
                            arr[arr.length - 1] = rtrim(arr[arr.length - 1]);
                        }
                        arr.push('\n');
                    }
                };

                this.print_indentation = function(arr) {
                    for (var i = 0; i < this.indent_level; i++) {
                        arr.push(this.indent_string);
                        this.line_char_count += this.indent_string.length;
                    }
                };

                this.print_token = function(text) {
                    // Avoid printing initial whitespace.
                    if (this.is_whitespace(text) && !this.output.length) {
                        return;
                    }
                    if (text || text !== '') {
                        if (this.output.length && this.output[this.output.length - 1] === '\n') {
                            this.print_indentation(this.output);
                            text = ltrim(text);
                        }
                    }
                    this.print_token_raw(text);
                };

                this.print_token_raw = function(text) {
                    // If we are going to print newlines, truncate trailing
                    // whitespace, as the newlines will represent the space.
                    if (this.newlines > 0) {
                        text = rtrim(text);
                    }

                    if (text && text !== '') {
                        if (text.length > 1 && text[text.length - 1] === '\n') {
                            // unformatted tags can grab newlines as their last character
                            this.output.push(text.slice(0, -1));
                            this.print_newline(false, this.output);
                        } else {
                            this.output.push(text);
                        }
                    }

                    for (var n = 0; n < this.newlines; n++) {
                        this.print_newline(n > 0, this.output);
                    }
                    this.newlines = 0;
                };

                this.indent = function() {
                    this.indent_level++;
                };

                this.unindent = function() {
                    if (this.indent_level > 0) {
                        this.indent_level--;
                    }
                };
            };
            return this;
        }

        /*_____________________--------------------_____________________*/

        multi_parser = new Parser(); //wrapping functions Parser
        multi_parser.printer(html_source, indent_character, indent_size, wrap_line_length, brace_style); //initialize starting values

        while (true) {
            var t = multi_parser.get_token();
            multi_parser.token_text = t[0];
            multi_parser.token_type = t[1];

            if (multi_parser.token_type === 'TK_EOF') {
                break;
            }

            switch (multi_parser.token_type) {
                case 'TK_TAG_START':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_STYLE':
                case 'TK_TAG_SCRIPT':
                    multi_parser.print_newline(false, multi_parser.output);
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_END':
                    //Print new line only if the tag has no content and has child
                    if (multi_parser.last_token === 'TK_CONTENT' && multi_parser.last_text === '') {
                        var tag_name = multi_parser.token_text.match(/\w+/)[0];
                        var tag_extracted_from_last_output = null;
                        if (multi_parser.output.length) {
                            tag_extracted_from_last_output = multi_parser.output[multi_parser.output.length - 1].match(/(?:<|{{#)\s*(\w+)/);
                        }
                        if (tag_extracted_from_last_output === null ||
                            (tag_extracted_from_last_output[1] !== tag_name && !multi_parser.Utils.in_array(tag_extracted_from_last_output[1], unformatted))) {
                            multi_parser.print_newline(false, multi_parser.output);
                        }
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_SINGLE':
                    // Don't add a newline before elements that should remain unformatted.
                    var tag_check = multi_parser.token_text.match(/^\s*<([a-z-]+)/i);
                    if (!tag_check || !multi_parser.Utils.in_array(tag_check[1], unformatted)) {
                        multi_parser.print_newline(false, multi_parser.output);
                    }
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_TAG_HANDLEBARS_ELSE':
                    multi_parser.print_token(multi_parser.token_text);
                    if (multi_parser.indent_content) {
                        multi_parser.indent();
                        multi_parser.indent_content = false;
                    }
                    multi_parser.current_mode = 'CONTENT';
                    break;
                case 'TK_CONTENT':
                    multi_parser.print_token(multi_parser.token_text);
                    multi_parser.current_mode = 'TAG';
                    break;
                case 'TK_STYLE':
                case 'TK_SCRIPT':
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_newline(false, multi_parser.output);
                        var text = multi_parser.token_text,
                            _beautifier,
                            script_indent_level = 1;
                        if (multi_parser.token_type === 'TK_SCRIPT') {
                            _beautifier = typeof js_beautify === 'function' && js_beautify;
                        } else if (multi_parser.token_type === 'TK_STYLE') {
                            _beautifier = typeof css_beautify === 'function' && css_beautify;
                        }

                        if (options.indent_scripts === "keep") {
                            script_indent_level = 0;
                        } else if (options.indent_scripts === "separate") {
                            script_indent_level = -multi_parser.indent_level;
                        }

                        var indentation = multi_parser.get_full_indent(script_indent_level);
                        if (_beautifier) {
                            // call the Beautifier if avaliable
                            text = _beautifier(text.replace(/^\s*/, indentation), options);
                        } else {
                            // simply indent the string otherwise
                            var white = text.match(/^\s*/)[0];
                            var _level = white.match(/[^\n\r]*$/)[0].split(multi_parser.indent_string).length - 1;
                            var reindent = multi_parser.get_full_indent(script_indent_level - _level);
                            text = text.replace(/^\s*/, indentation)
                                .replace(/\r\n|\r|\n/g, '\n' + reindent)
                                .replace(/\s+$/, '');
                        }
                        if (text) {
                            multi_parser.print_token_raw(text);
                            multi_parser.print_newline(true, multi_parser.output);
                        }
                    }
                    multi_parser.current_mode = 'TAG';
                    break;
                default:
                    // We should not be getting here but we don't want to drop input on the floor
                    // Just output the text and move on
                    if (multi_parser.token_text !== '') {
                        multi_parser.print_token(multi_parser.token_text);
                    }
                    break;
            }
            multi_parser.last_token = multi_parser.token_type;
            multi_parser.last_text = multi_parser.token_text;
        }
        var sweet_code = multi_parser.output.join('').replace(/[\r\n\t ]+$/, '');
        if (end_with_newline) {
            sweet_code += '\n';
        }
        return sweet_code;
    }

    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define(["require", "./beautify", "./beautify-css"], function(requireamd) {
            var js_beautify =  requireamd("./beautify");
            var css_beautify =  requireamd("./beautify-css");

            return {
              html_beautify: function(html_source, options) {
                return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
              }
            };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var html_beautify = require("beautify").html_beautify`.
        var js_beautify = require('./beautify.js');
        var css_beautify = require('./beautify-css.js');

        exports.html_beautify = function(html_source, options) {
            return style_html(html_source, options, js_beautify.js_beautify, css_beautify.css_beautify);
        };
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.html_beautify = function(html_source, options) {
            return style_html(html_source, options, window.js_beautify, window.css_beautify);
        };
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.html_beautify = function(html_source, options) {
            return style_html(html_source, options, global.js_beautify, global.css_beautify);
        };
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./beautify-css.js":9,"./beautify.js":11}],11:[function(require,module,exports){
(function (global){
/*jshint curly:true, eqeqeq:true, laxbreak:true, noempty:false */
/*

  The MIT License (MIT)

  Copyright (c) 2007-2013 Einar Lielmanis and contributors.

  Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files
  (the "Software"), to deal in the Software without restriction,
  including without limitation the rights to use, copy, modify, merge,
  publish, distribute, sublicense, and/or sell copies of the Software,
  and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions:

  The above copyright notice and this permission notice shall be
  included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
  NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
  BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
  ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
  CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.

 JS Beautifier
---------------


  Written by Einar Lielmanis, <einar@jsbeautifier.org>
      http://jsbeautifier.org/

  Originally converted to javascript by Vital, <vital76@gmail.com>
  "End braces on own line" added by Chris J. Shull, <chrisjshull@gmail.com>
  Parsing improvements for brace-less statements by Liam Newman <bitwiseman@gmail.com>


  Usage:
    js_beautify(js_source_text);
    js_beautify(js_source_text, options);

  The options are:
    indent_size (default 4)          - indentation size,
    indent_char (default space)      - character to indent with,
    preserve_newlines (default true) - whether existing line breaks should be preserved,
    max_preserve_newlines (default unlimited) - maximum number of line breaks to be preserved in one chunk,

    jslint_happy (default false) - if true, then jslint-stricter mode is enforced.

            jslint_happy        !jslint_happy
            ---------------------------------
            function ()         function()

            switch () {         switch() {
            case 1:               case 1:
              break;                break;
            }                   }

    space_after_anon_function (default false) - should the space before an anonymous function's parens be added, "function()" vs "function ()",
          NOTE: This option is overriden by jslint_happy (i.e. if jslint_happy is true, space_after_anon_function is true by design)

    brace_style (default "collapse") - "collapse" | "expand" | "end-expand" | "none"
            put braces on the same line as control statements (default), or put braces on own line (Allman / ANSI style), or just put end braces on own line, or attempt to keep them where they are.

    space_before_conditional (default true) - should the space before conditional statement be added, "if(true)" vs "if (true)",

    unescape_strings (default false) - should printable characters in strings encoded in \xNN notation be unescaped, "example" vs "\x65\x78\x61\x6d\x70\x6c\x65"

    wrap_line_length (default unlimited) - lines should wrap at next opportunity after this number of characters.
          NOTE: This is not a hard limit. Lines will continue until a point where a newline would
                be preserved if it were present.

    end_with_newline (default false)  - end output with a newline


    e.g

    js_beautify(js_source_text, {
      'indent_size': 1,
      'indent_char': '\t'
    });

*/

(function() {

    var acorn = {};
    (function (exports) {
      // This section of code is taken from acorn.
      //
      // Acorn was written by Marijn Haverbeke and released under an MIT
      // license. The Unicode regexps (for identifiers and whitespace) were
      // taken from [Esprima](http://esprima.org) by Ariya Hidayat.
      //
      // Git repositories for Acorn are available at
      //
      //     http://marijnhaverbeke.nl/git/acorn
      //     https://github.com/marijnh/acorn.git

      // ## Character categories

      // Big ugly regular expressions that match characters in the
      // whitespace, identifier, and identifier-start categories. These
      // are only applied when a character is found to actually have a
      // code point above 128.

      var nonASCIIwhitespace = /[\u1680\u180e\u2000-\u200a\u202f\u205f\u3000\ufeff]/;
      var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05d0-\u05ea\u05f0-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u08a0\u08a2-\u08ac\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097f\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c33\u0c35-\u0c39\u0c3d\u0c58\u0c59\u0c60\u0c61\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d05-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d60\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e87\u0e88\u0e8a\u0e8d\u0e94-\u0e97\u0e99-\u0e9f\u0ea1-\u0ea3\u0ea5\u0ea7\u0eaa\u0eab\u0ead-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f4\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f0\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1877\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191c\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19c1-\u19c7\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1ce9-\u1cec\u1cee-\u1cf1\u1cf5\u1cf6\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2119-\u211d\u2124\u2126\u2128\u212a-\u212d\u212f-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u2e2f\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309d-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312d\u3131-\u318e\u31a0-\u31ba\u31f0-\u31ff\u3400-\u4db5\u4e00-\u9fcc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua697\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua78e\ua790-\ua793\ua7a0-\ua7aa\ua7f8-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa80-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uabc0-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
      var nonASCIIidentifierChars = "\u0300-\u036f\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u0620-\u0649\u0672-\u06d3\u06e7-\u06e8\u06fb-\u06fc\u0730-\u074a\u0800-\u0814\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0840-\u0857\u08e4-\u08fe\u0900-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962-\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09d7\u09df-\u09e0\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2-\u0ae3\u0ae6-\u0aef\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b56\u0b57\u0b5f-\u0b60\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c01-\u0c03\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62-\u0c63\u0c66-\u0c6f\u0c82\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2-\u0ce3\u0ce6-\u0cef\u0d02\u0d03\u0d46-\u0d48\u0d57\u0d62-\u0d63\u0d66-\u0d6f\u0d82\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0df2\u0df3\u0e34-\u0e3a\u0e40-\u0e45\u0e50-\u0e59\u0eb4-\u0eb9\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f41-\u0f47\u0f71-\u0f84\u0f86-\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u1000-\u1029\u1040-\u1049\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u170e-\u1710\u1720-\u1730\u1740-\u1750\u1772\u1773\u1780-\u17b2\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u1920-\u192b\u1930-\u193b\u1951-\u196d\u19b0-\u19c0\u19c8-\u19c9\u19d0-\u19d9\u1a00-\u1a15\u1a20-\u1a53\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1b46-\u1b4b\u1b50-\u1b59\u1b6b-\u1b73\u1bb0-\u1bb9\u1be6-\u1bf3\u1c00-\u1c22\u1c40-\u1c49\u1c5b-\u1c7d\u1cd0-\u1cd2\u1d00-\u1dbe\u1e01-\u1f15\u200c\u200d\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2d81-\u2d96\u2de0-\u2dff\u3021-\u3028\u3099\u309a\ua640-\ua66d\ua674-\ua67d\ua69f\ua6f0-\ua6f1\ua7f8-\ua800\ua806\ua80b\ua823-\ua827\ua880-\ua881\ua8b4-\ua8c4\ua8d0-\ua8d9\ua8f3-\ua8f7\ua900-\ua909\ua926-\ua92d\ua930-\ua945\ua980-\ua983\ua9b3-\ua9c0\uaa00-\uaa27\uaa40-\uaa41\uaa4c-\uaa4d\uaa50-\uaa59\uaa7b\uaae0-\uaae9\uaaf2-\uaaf3\uabc0-\uabe1\uabec\uabed\uabf0-\uabf9\ufb20-\ufb28\ufe00-\ufe0f\ufe20-\ufe26\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";
      var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
      var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

      // Whether a single character denotes a newline.

      var newline = exports.newline = /[\n\r\u2028\u2029]/;

      // Matches a whole line break (where CRLF is considered a single
      // line break). Used to count lines.

      var lineBreak = /\r\n|[\n\r\u2028\u2029]/g;

      // Test whether a given character code starts an identifier.

      var isIdentifierStart = exports.isIdentifierStart = function(code) {
        if (code < 65) return code === 36;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code));
      };

      // Test whether a given character is part of an identifier.

      var isIdentifierChar = exports.isIdentifierChar = function(code) {
        if (code < 48) return code === 36;
        if (code < 58) return true;
        if (code < 65) return false;
        if (code < 91) return true;
        if (code < 97) return code === 95;
        if (code < 123)return true;
        return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code));
      };
    })(acorn);

    function in_array(what, arr) {
        for (var i = 0; i < arr.length; i += 1) {
            if (arr[i] === what) {
                return true;
            }
        }
        return false;
    }

    function trim(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function ltrim(s) {
        return s.replace(/^\s+/g, '');
    }

    function rtrim(s) {
        return s.replace(/\s+$/g, '');
    }

    function js_beautify(js_source_text, options) {
        "use strict";
        var beautifier = new Beautifier(js_source_text, options);
        return beautifier.beautify();
    }

    var MODE = {
            BlockStatement: 'BlockStatement', // 'BLOCK'
            Statement: 'Statement', // 'STATEMENT'
            ObjectLiteral: 'ObjectLiteral', // 'OBJECT',
            ArrayLiteral: 'ArrayLiteral', //'[EXPRESSION]',
            ForInitializer: 'ForInitializer', //'(FOR-EXPRESSION)',
            Conditional: 'Conditional', //'(COND-EXPRESSION)',
            Expression: 'Expression' //'(EXPRESSION)'
        };

    function Beautifier(js_source_text, options) {
        "use strict";
        var output
        var tokens = [], token_pos;
        var Tokenizer;
        var current_token;
        var last_type, last_last_text, indent_string;
        var flags, previous_flags, flag_store;
        var prefix;

        var handlers, opt;
        var baseIndentString = '';

        handlers = {
            'TK_START_EXPR': handle_start_expr,
            'TK_END_EXPR': handle_end_expr,
            'TK_START_BLOCK': handle_start_block,
            'TK_END_BLOCK': handle_end_block,
            'TK_WORD': handle_word,
            'TK_RESERVED': handle_word,
            'TK_SEMICOLON': handle_semicolon,
            'TK_STRING': handle_string,
            'TK_EQUALS': handle_equals,
            'TK_OPERATOR': handle_operator,
            'TK_COMMA': handle_comma,
            'TK_BLOCK_COMMENT': handle_block_comment,
            'TK_INLINE_COMMENT': handle_inline_comment,
            'TK_COMMENT': handle_comment,
            'TK_DOT': handle_dot,
            'TK_UNKNOWN': handle_unknown,
            'TK_EOF': handle_eof
        };

        function create_flags(flags_base, mode) {
            var next_indent_level = 0;
            if (flags_base) {
                next_indent_level = flags_base.indentation_level;
                if (!output.just_added_newline() &&
                    flags_base.line_indent_level > next_indent_level) {
                    next_indent_level = flags_base.line_indent_level;
                }
            }

            var next_flags = {
                mode: mode,
                parent: flags_base,
                last_text: flags_base ? flags_base.last_text : '', // last token text
                last_word: flags_base ? flags_base.last_word : '', // last 'TK_WORD' passed
                declaration_statement: false,
                declaration_assignment: false,
                multiline_frame: false,
                if_block: false,
                else_block: false,
                do_block: false,
                do_while: false,
                in_case_statement: false, // switch(..){ INSIDE HERE }
                in_case: false, // we're on the exact line with "case 0:"
                case_body: false, // the indented case-action block
                indentation_level: next_indent_level,
                line_indent_level: flags_base ? flags_base.line_indent_level : next_indent_level,
                start_line_index: output.get_line_number(),
                ternary_depth: 0
            };
            return next_flags;
        }

        // Some interpreters have unexpected results with foo = baz || bar;
        options = options ? options : {};
        opt = {};

        // compatibility
        if (options.braces_on_own_line !== undefined) { //graceful handling of deprecated option
            opt.brace_style = options.braces_on_own_line ? "expand" : "collapse";
        }
        opt.brace_style = options.brace_style ? options.brace_style : (opt.brace_style ? opt.brace_style : "collapse");

        // graceful handling of deprecated option
        if (opt.brace_style === "expand-strict") {
            opt.brace_style = "expand";
        }


        opt.indent_size = options.indent_size ? parseInt(options.indent_size, 10) : 4;
        opt.indent_char = options.indent_char ? options.indent_char : ' ';
        opt.preserve_newlines = (options.preserve_newlines === undefined) ? true : options.preserve_newlines;
        opt.break_chained_methods = (options.break_chained_methods === undefined) ? false : options.break_chained_methods;
        opt.max_preserve_newlines = (options.max_preserve_newlines === undefined) ? 0 : parseInt(options.max_preserve_newlines, 10);
        opt.space_in_paren = (options.space_in_paren === undefined) ? false : options.space_in_paren;
        opt.space_in_empty_paren = (options.space_in_empty_paren === undefined) ? false : options.space_in_empty_paren;
        opt.jslint_happy = (options.jslint_happy === undefined) ? false : options.jslint_happy;
        opt.space_after_anon_function = (options.space_after_anon_function === undefined) ? false : options.space_after_anon_function;
        opt.keep_array_indentation = (options.keep_array_indentation === undefined) ? false : options.keep_array_indentation;
        opt.space_before_conditional = (options.space_before_conditional === undefined) ? true : options.space_before_conditional;
        opt.unescape_strings = (options.unescape_strings === undefined) ? false : options.unescape_strings;
        opt.wrap_line_length = (options.wrap_line_length === undefined) ? 0 : parseInt(options.wrap_line_length, 10);
        opt.e4x = (options.e4x === undefined) ? false : options.e4x;
        opt.end_with_newline = (options.end_with_newline === undefined) ? false : options.end_with_newline;
        opt.comma_first = (options.comma_first === undefined) ? false : options.comma_first;


        // force opt.space_after_anon_function to true if opt.jslint_happy
        if(opt.jslint_happy) {
            opt.space_after_anon_function = true;
        }

        if(options.indent_with_tabs){
            opt.indent_char = '\t';
            opt.indent_size = 1;
        }

        //----------------------------------
        indent_string = '';
        while (opt.indent_size > 0) {
            indent_string += opt.indent_char;
            opt.indent_size -= 1;
        }

        var preindent_index = 0;
        if(js_source_text && js_source_text.length) {
            while ( (js_source_text.charAt(preindent_index) === ' ' ||
                    js_source_text.charAt(preindent_index) === '\t')) {
                baseIndentString += js_source_text.charAt(preindent_index);
                preindent_index += 1;
            }
            js_source_text = js_source_text.substring(preindent_index);
        }

        last_type = 'TK_START_BLOCK'; // last token type
        last_last_text = ''; // pre-last token text
        output = new Output(indent_string, baseIndentString);


        // Stack of parsing/formatting states, including MODE.
        // We tokenize, parse, and output in an almost purely a forward-only stream of token input
        // and formatted output.  This makes the beautifier less accurate than full parsers
        // but also far more tolerant of syntax errors.
        //
        // For example, the default mode is MODE.BlockStatement. If we see a '{' we push a new frame of type
        // MODE.BlockStatement on the the stack, even though it could be object literal.  If we later
        // encounter a ":", we'll switch to to MODE.ObjectLiteral.  If we then see a ";",
        // most full parsers would die, but the beautifier gracefully falls back to
        // MODE.BlockStatement and continues on.
        flag_store = [];
        set_mode(MODE.BlockStatement);

        this.beautify = function() {

            /*jshint onevar:true */
            var local_token, sweet_code;
            Tokenizer = new tokenizer(js_source_text, opt, indent_string);
            tokens = Tokenizer.tokenize();
            token_pos = 0;

            while (local_token = get_token()) {
                for(var i = 0; i < local_token.comments_before.length; i++) {
                    // The cleanest handling of inline comments is to treat them as though they aren't there.
                    // Just continue formatting and the behavior should be logical.
                    // Also ignore unknown tokens.  Again, this should result in better behavior.
                    handle_token(local_token.comments_before[i]);
                }
                handle_token(local_token);

                last_last_text = flags.last_text;
                last_type = local_token.type;
                flags.last_text = local_token.text;

                token_pos += 1;
            }

            sweet_code = output.get_code();
            if (opt.end_with_newline) {
                sweet_code += '\n';
            }

            return sweet_code;
        };

        function handle_token(local_token) {
            var newlines = local_token.newlines;
            var keep_whitespace = opt.keep_array_indentation && is_array(flags.mode);

            if (keep_whitespace) {
                for (i = 0; i < newlines; i += 1) {
                    print_newline(i > 0);
                }
            } else {
                if (opt.max_preserve_newlines && newlines > opt.max_preserve_newlines) {
                    newlines = opt.max_preserve_newlines;
                }

                if (opt.preserve_newlines) {
                    if (local_token.newlines > 1) {
                        print_newline();
                        for (var i = 1; i < newlines; i += 1) {
                            print_newline(true);
                        }
                    }
                }
            }

            current_token = local_token;
            handlers[current_token.type]();
        }

        // we could use just string.split, but
        // IE doesn't like returning empty strings
        function split_newlines(s) {
            //return s.split(/\x0d\x0a|\x0a/);

            s = s.replace(/\x0d/g, '');
            var out = [],
                idx = s.indexOf("\n");
            while (idx !== -1) {
                out.push(s.substring(0, idx));
                s = s.substring(idx + 1);
                idx = s.indexOf("\n");
            }
            if (s.length) {
                out.push(s);
            }
            return out;
        }

        function allow_wrap_or_preserved_newline(force_linewrap) {
            force_linewrap = (force_linewrap === undefined) ? false : force_linewrap;

            // Never wrap the first token on a line
            if (output.just_added_newline()) {
                return
            }

            if ((opt.preserve_newlines && current_token.wanted_newline) || force_linewrap) {
                print_newline(false, true);
            } else if (opt.wrap_line_length) {
                var proposed_line_length = output.current_line.get_character_count() + current_token.text.length +
                    (output.space_before_token ? 1 : 0);
                if (proposed_line_length >= opt.wrap_line_length) {
                    print_newline(false, true);
                }
            }
        }

        function print_newline(force_newline, preserve_statement_flags) {
            if (!preserve_statement_flags) {
                if (flags.last_text !== ';' && flags.last_text !== ',' && flags.last_text !== '=' && last_type !== 'TK_OPERATOR') {
                    while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                        restore_mode();
                    }
                }
            }

            if (output.add_new_line(force_newline)) {
                flags.multiline_frame = true;
            }
        }

        function print_token_line_indentation() {
            if (output.just_added_newline()) {
                if (opt.keep_array_indentation && is_array(flags.mode) && current_token.wanted_newline) {
                    output.current_line.push(current_token.whitespace_before);
                    output.space_before_token = false;
                } else if (output.set_indent(flags.indentation_level)) {
                    flags.line_indent_level = flags.indentation_level;
                }
            }
        }

        function print_token(printable_token) {
            if (opt.comma_first && last_type === 'TK_COMMA'
                && output.just_added_newline()) {
                if(output.previous_line.last() === ',') {
                    output.previous_line.pop();
                    print_token_line_indentation();
                    output.add_token(',');
                    output.space_before_token = true;
                }
            }

            printable_token = printable_token || current_token.text;
            print_token_line_indentation();
            output.add_token(printable_token);
        }

        function indent() {
            flags.indentation_level += 1;
        }

        function deindent() {
            if (flags.indentation_level > 0 &&
                ((!flags.parent) || flags.indentation_level > flags.parent.indentation_level))
                flags.indentation_level -= 1;
        }

        function set_mode(mode) {
            if (flags) {
                flag_store.push(flags);
                previous_flags = flags;
            } else {
                previous_flags = create_flags(null, mode);
            }

            flags = create_flags(previous_flags, mode);
        }

        function is_array(mode) {
            return mode === MODE.ArrayLiteral;
        }

        function is_expression(mode) {
            return in_array(mode, [MODE.Expression, MODE.ForInitializer, MODE.Conditional]);
        }

        function restore_mode() {
            if (flag_store.length > 0) {
                previous_flags = flags;
                flags = flag_store.pop();
                if (previous_flags.mode === MODE.Statement) {
                    output.remove_redundant_indentation(previous_flags);
                }
            }
        }

        function start_of_object_property() {
            return flags.parent.mode === MODE.ObjectLiteral && flags.mode === MODE.Statement && (
                (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set'])));
        }

        function start_of_statement() {
            if (
                    (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'do') ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'return' && !current_token.wanted_newline) ||
                    (last_type === 'TK_RESERVED' && flags.last_text === 'else' && !(current_token.type === 'TK_RESERVED' && current_token.text === 'if')) ||
                    (last_type === 'TK_END_EXPR' && (previous_flags.mode === MODE.ForInitializer || previous_flags.mode === MODE.Conditional)) ||
                    (last_type === 'TK_WORD' && flags.mode === MODE.BlockStatement
                        && !flags.in_case
                        && !(current_token.text === '--' || current_token.text === '++')
                        && current_token.type !== 'TK_WORD' && current_token.type !== 'TK_RESERVED') ||
                    (flags.mode === MODE.ObjectLiteral && (
                        (flags.last_text === ':' && flags.ternary_depth === 0) || (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set']))))
                ) {

                set_mode(MODE.Statement);
                indent();

                if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const']) && current_token.type === 'TK_WORD') {
                    flags.declaration_statement = true;
                }

                // Issue #276:
                // If starting a new statement with [if, for, while, do], push to a new line.
                // if (a) if (b) if(c) d(); else e(); else f();
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline(
                        current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['do', 'for', 'if', 'while']));
                }

                return true;
            }
            return false;
        }

        function all_lines_start_with(lines, c) {
            for (var i = 0; i < lines.length; i++) {
                var line = trim(lines[i]);
                if (line.charAt(0) !== c) {
                    return false;
                }
            }
            return true;
        }

        function each_line_matches_indent(lines, indent) {
            var i = 0,
                len = lines.length,
                line;
            for (; i < len; i++) {
                line = lines[i];
                // allow empty lines to pass through
                if (line && line.indexOf(indent) !== 0) {
                    return false;
                }
            }
            return true;
        }

        function is_special_word(word) {
            return in_array(word, ['case', 'return', 'do', 'if', 'throw', 'else']);
        }

        function get_token(offset) {
            var index = token_pos + (offset || 0);
            return (index < 0 || index >= tokens.length) ? null : tokens[index];
        }

        function handle_start_expr() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            var next_mode = MODE.Expression;
            if (current_token.text === '[') {

                if (last_type === 'TK_WORD' || flags.last_text === ')') {
                    // this is array index specifier, break immediately
                    // a[x], fn()[x]
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, Tokenizer.line_starters)) {
                        output.space_before_token = true;
                    }
                    set_mode(next_mode);
                    print_token();
                    indent();
                    if (opt.space_in_paren) {
                        output.space_before_token = true;
                    }
                    return;
                }

                next_mode = MODE.ArrayLiteral;
                if (is_array(flags.mode)) {
                    if (flags.last_text === '[' ||
                        (flags.last_text === ',' && (last_last_text === ']' || last_last_text === '}'))) {
                        // ], [ goes to new line
                        // }, [ goes to new line
                        if (!opt.keep_array_indentation) {
                            print_newline();
                        }
                    }
                }

            } else {
                if (last_type === 'TK_RESERVED' && flags.last_text === 'for') {
                    next_mode = MODE.ForInitializer;
                } else if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['if', 'while'])) {
                    next_mode = MODE.Conditional;
                } else {
                    // next_mode = MODE.Expression;
                }
            }

            if (flags.last_text === ';' || last_type === 'TK_START_BLOCK') {
                print_newline();
            } else if (last_type === 'TK_END_EXPR' || last_type === 'TK_START_EXPR' || last_type === 'TK_END_BLOCK' || flags.last_text === '.') {
                // TODO: Consider whether forcing this is required.  Review failing tests when removed.
                allow_wrap_or_preserved_newline(current_token.wanted_newline);
                // do nothing on (( and )( and ][ and ]( and .(
            } else if (!(last_type === 'TK_RESERVED' && current_token.text === '(') && last_type !== 'TK_WORD' && last_type !== 'TK_OPERATOR') {
                output.space_before_token = true;
            } else if ((last_type === 'TK_RESERVED' && (flags.last_word === 'function' || flags.last_word === 'typeof')) ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                // function() vs function ()
                if (opt.space_after_anon_function) {
                    output.space_before_token = true;
                }
            } else if (last_type === 'TK_RESERVED' && (in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === 'catch')) {
                if (opt.space_before_conditional) {
                    output.space_before_token = true;
                }
            }

            // Support of this kind of newline preservation.
            // a = (b &&
            //     (c || d));
            if (current_token.text === '(') {
                if (last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                    if (!start_of_object_property()) {
                        allow_wrap_or_preserved_newline();
                    }
                }
            }

            set_mode(next_mode);
            print_token();
            if (opt.space_in_paren) {
                output.space_before_token = true;
            }

            // In all cases, if we newline while inside an expression it should be indented.
            indent();
        }

        function handle_end_expr() {
            // statements inside expressions are not valid syntax, but...
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }

            if (flags.multiline_frame) {
                allow_wrap_or_preserved_newline(current_token.text === ']' && is_array(flags.mode) && !opt.keep_array_indentation);
            }

            if (opt.space_in_paren) {
                if (last_type === 'TK_START_EXPR' && ! opt.space_in_empty_paren) {
                    // () [] no inner space in empty parens like these, ever, ref #320
                    output.trim();
                    output.space_before_token = false;
                } else {
                    output.space_before_token = true;
                }
            }
            if (current_token.text === ']' && opt.keep_array_indentation) {
                print_token();
                restore_mode();
            } else {
                restore_mode();
                print_token();
            }
            output.remove_redundant_indentation(previous_flags);

            // do {} while () // no statement required after
            if (flags.do_while && previous_flags.mode === MODE.Conditional) {
                previous_flags.mode = MODE.Expression;
                flags.do_block = false;
                flags.do_while = false;

            }
        }

        function handle_start_block() {
            // Check if this is should be treated as a ObjectLiteral
            var next_token = get_token(1)
            var second_token = get_token(2)
            if (second_token && (
                    (second_token.text === ':' && in_array(next_token.type, ['TK_STRING', 'TK_WORD', 'TK_RESERVED']))
                    || (in_array(next_token.text, ['get', 'set']) && in_array(second_token.type, ['TK_WORD', 'TK_RESERVED']))
                )) {
                // We don't support TypeScript,but we didn't break it for a very long time.
                // We'll try to keep not breaking it.
                if (!in_array(last_last_text, ['class','interface'])) {
                    set_mode(MODE.ObjectLiteral);
                } else {
                    set_mode(MODE.BlockStatement);
                }
            } else {
                set_mode(MODE.BlockStatement);
            }

            var empty_braces = !next_token.comments_before.length &&  next_token.text === '}';
            var empty_anonymous_function = empty_braces && flags.last_word === 'function' &&
                last_type === 'TK_END_EXPR';

            if (opt.brace_style === "expand" ||
                (opt.brace_style === "none" && current_token.wanted_newline)) {
                if (last_type !== 'TK_OPERATOR' &&
                    (empty_anonymous_function ||
                        last_type === 'TK_EQUALS' ||
                        (last_type === 'TK_RESERVED' && is_special_word(flags.last_text) && flags.last_text !== 'else'))) {
                    output.space_before_token = true;
                } else {
                    print_newline(false, true);
                }
            } else { // collapse
                if (last_type !== 'TK_OPERATOR' && last_type !== 'TK_START_EXPR') {
                    if (last_type === 'TK_START_BLOCK') {
                        print_newline();
                    } else {
                        output.space_before_token = true;
                    }
                } else {
                    // if TK_OPERATOR or TK_START_EXPR
                    if (is_array(previous_flags.mode) && flags.last_text === ',') {
                        if (last_last_text === '}') {
                            // }, { in array context
                            output.space_before_token = true;
                        } else {
                            print_newline(); // [a, b, c, {
                        }
                    }
                }
            }
            print_token();
            indent();
        }

        function handle_end_block() {
            // statements must all be closed when their container closes
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
            var empty_braces = last_type === 'TK_START_BLOCK';

            if (opt.brace_style === "expand") {
                if (!empty_braces) {
                    print_newline();
                }
            } else {
                // skip {}
                if (!empty_braces) {
                    if (is_array(flags.mode) && opt.keep_array_indentation) {
                        // we REALLY need a newline here, but newliner would skip that
                        opt.keep_array_indentation = false;
                        print_newline();
                        opt.keep_array_indentation = true;

                    } else {
                        print_newline();
                    }
                }
            }
            restore_mode();
            print_token();
        }

        function handle_word() {
            if (current_token.type === 'TK_RESERVED' && flags.mode !== MODE.ObjectLiteral &&
                in_array(current_token.text, ['set', 'get'])) {
                current_token.type = 'TK_WORD';
            }

            if (current_token.type === 'TK_RESERVED' && flags.mode === MODE.ObjectLiteral) {
                var next_token = get_token(1);
                if (next_token.text == ':') {
                    current_token.type = 'TK_WORD';
                }
            }

            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            } else if (current_token.wanted_newline && !is_expression(flags.mode) &&
                (last_type !== 'TK_OPERATOR' || (flags.last_text === '--' || flags.last_text === '++')) &&
                last_type !== 'TK_EQUALS' &&
                (opt.preserve_newlines || !(last_type === 'TK_RESERVED' && in_array(flags.last_text, ['var', 'let', 'const', 'set', 'get'])))) {

                print_newline();
            }

            if (flags.do_block && !flags.do_while) {
                if (current_token.type === 'TK_RESERVED' && current_token.text === 'while') {
                    // do {} ## while ()
                    output.space_before_token = true;
                    print_token();
                    output.space_before_token = true;
                    flags.do_while = true;
                    return;
                } else {
                    // do {} should always have while as the next word.
                    // if we don't see the expected while, recover
                    print_newline();
                    flags.do_block = false;
                }
            }

            // if may be followed by else, or not
            // Bare/inline ifs are tricky
            // Need to unwind the modes correctly: if (a) if (b) c(); else d(); else e();
            if (flags.if_block) {
                if (!flags.else_block && (current_token.type === 'TK_RESERVED' && current_token.text === 'else')) {
                    flags.else_block = true;
                } else {
                    while (flags.mode === MODE.Statement) {
                        restore_mode();
                    }
                    flags.if_block = false;
                    flags.else_block = false;
                }
            }

            if (current_token.type === 'TK_RESERVED' && (current_token.text === 'case' || (current_token.text === 'default' && flags.in_case_statement))) {
                print_newline();
                if (flags.case_body || opt.jslint_happy) {
                    // switch cases following one another
                    deindent();
                    flags.case_body = false;
                }
                print_token();
                flags.in_case = true;
                flags.in_case_statement = true;
                return;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'function') {
                if (in_array(flags.last_text, ['}', ';']) || (output.just_added_newline() && ! in_array(flags.last_text, ['[', '{', ':', '=', ',']))) {
                    // make sure there is a nice clean space of at least one blank line
                    // before a new function definition
                    if ( !output.just_added_blankline() && !current_token.comments_before.length) {
                        print_newline();
                        print_newline(true);
                    }
                }
                if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                    if (last_type === 'TK_RESERVED' && in_array(flags.last_text, ['get', 'set', 'new', 'return', 'export'])) {
                        output.space_before_token = true;
                    } else if (last_type === 'TK_RESERVED' && flags.last_text === 'default' && last_last_text === 'export') {
                        output.space_before_token = true;
                    } else {
                        print_newline();
                    }
                } else if (last_type === 'TK_OPERATOR' || flags.last_text === '=') {
                    // foo = function
                    output.space_before_token = true;
                } else if (!flags.multiline_frame && (is_expression(flags.mode) || is_array(flags.mode))) {
                    // (function
                } else {
                    print_newline();
                }
            }

            if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            }

            if (current_token.type === 'TK_RESERVED' &&  in_array(current_token.text, ['function', 'get', 'set'])) {
                print_token();
                flags.last_word = current_token.text;
                return;
            }

            prefix = 'NONE';

            if (last_type === 'TK_END_BLOCK') {
                if (!(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally']))) {
                    prefix = 'NEWLINE';
                } else {
                    if (opt.brace_style === "expand" ||
                        opt.brace_style === "end-expand" ||
                        (opt.brace_style === "none" && current_token.wanted_newline)) {
                        prefix = 'NEWLINE';
                    } else {
                        prefix = 'SPACE';
                        output.space_before_token = true;
                    }
                }
            } else if (last_type === 'TK_SEMICOLON' && flags.mode === MODE.BlockStatement) {
                // TODO: Should this be for STATEMENT as well?
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_SEMICOLON' && is_expression(flags.mode)) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_STRING') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD' ||
                (flags.last_text === '*' && last_last_text === 'function')) {
                prefix = 'SPACE';
            } else if (last_type === 'TK_START_BLOCK') {
                prefix = 'NEWLINE';
            } else if (last_type === 'TK_END_EXPR') {
                output.space_before_token = true;
                prefix = 'NEWLINE';
            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                if (flags.last_text === 'else' || flags.last_text === 'export') {
                    prefix = 'SPACE';
                } else {
                    prefix = 'NEWLINE';
                }

            }

            if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['else', 'catch', 'finally'])) {
                if (last_type !== 'TK_END_BLOCK' ||
                    opt.brace_style === "expand" ||
                    opt.brace_style === "end-expand" ||
                    (opt.brace_style === "none" && current_token.wanted_newline)) {
                    print_newline();
                } else {
                    output.trim(true);
                    var line = output.current_line;
                    // If we trimmed and there's something other than a close block before us
                    // put a newline back in.  Handles '} // comment' scenario.
                    if (line.last() !== '}') {
                        print_newline();
                    }
                    output.space_before_token = true;
                }
            } else if (prefix === 'NEWLINE') {
                if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                    // no newline between 'return nnn'
                    output.space_before_token = true;
                } else if (last_type !== 'TK_END_EXPR') {
                    if ((last_type !== 'TK_START_EXPR' || !(current_token.type === 'TK_RESERVED' && in_array(current_token.text, ['var', 'let', 'const']))) && flags.last_text !== ':') {
                        // no need to force newline on 'var': for (var x = 0...)
                        if (current_token.type === 'TK_RESERVED' && current_token.text === 'if' && flags.last_text === 'else') {
                            // no newline for } else if {
                            output.space_before_token = true;
                        } else {
                            print_newline();
                        }
                    }
                } else if (current_token.type === 'TK_RESERVED' && in_array(current_token.text, Tokenizer.line_starters) && flags.last_text !== ')') {
                    print_newline();
                }
            } else if (flags.multiline_frame && is_array(flags.mode) && flags.last_text === ',' && last_last_text === '}') {
                print_newline(); // }, in lists get a newline treatment
            } else if (prefix === 'SPACE') {
                output.space_before_token = true;
            }
            print_token();
            flags.last_word = current_token.text;

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'do') {
                flags.do_block = true;
            }

            if (current_token.type === 'TK_RESERVED' && current_token.text === 'if') {
                flags.if_block = true;
            }
        }

        function handle_semicolon() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // Semicolon can be the start (and end) of a statement
                output.space_before_token = false;
            }
            while (flags.mode === MODE.Statement && !flags.if_block && !flags.do_block) {
                restore_mode();
            }
            print_token();
        }

        function handle_string() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
                // One difference - strings want at least a space before
                output.space_before_token = true;
            } else if (last_type === 'TK_RESERVED' || last_type === 'TK_WORD') {
                output.space_before_token = true;
            } else if (last_type === 'TK_COMMA' || last_type === 'TK_START_EXPR' || last_type === 'TK_EQUALS' || last_type === 'TK_OPERATOR') {
                if (!start_of_object_property()) {
                    allow_wrap_or_preserved_newline();
                }
            } else {
                print_newline();
            }
            print_token();
        }

        function handle_equals() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (flags.declaration_statement) {
                // just got an '=' in a var-line, different formatting/line-breaking, etc will now be done
                flags.declaration_assignment = true;
            }
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comma() {
            if (flags.declaration_statement) {
                if (is_expression(flags.parent.mode)) {
                    // do not break on comma, for(var a = 1, b = 2)
                    flags.declaration_assignment = false;
                }

                print_token();

                if (flags.declaration_assignment) {
                    flags.declaration_assignment = false;
                    print_newline(false, true);
                } else {
                    output.space_before_token = true;
                    // for comma-first, we want to allow a newline before the comma
                    // to turn into a newline after the comma, which we will fixup later
                    if (opt.comma_first) {
                        allow_wrap_or_preserved_newline();
                    }
                }
                return;
            }

            print_token();
            if (flags.mode === MODE.ObjectLiteral ||
                (flags.mode === MODE.Statement && flags.parent.mode === MODE.ObjectLiteral)) {
                if (flags.mode === MODE.Statement) {
                    restore_mode();
                }
                print_newline();
            } else {
                // EXPR or DO_BLOCK
                output.space_before_token = true;
                // for comma-first, we want to allow a newline before the comma
                // to turn into a newline after the comma, which we will fixup later
                if (opt.comma_first) {
                    allow_wrap_or_preserved_newline();
                }
            }

        }

        function handle_operator() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                // "return" had a special handling in TK_WORD. Now we need to return the favor
                output.space_before_token = true;
                print_token();
                return;
            }

            // hack for actionscript's import .*;
            if (current_token.text === '*' && last_type === 'TK_DOT') {
                print_token();
                return;
            }

            if (current_token.text === ':' && flags.in_case) {
                flags.case_body = true;
                indent();
                print_token();
                print_newline();
                flags.in_case = false;
                return;
            }

            if (current_token.text === '::') {
                // no spaces around exotic namespacing syntax operator
                print_token();
                return;
            }

            // Allow line wrapping between operators
            if (last_type === 'TK_OPERATOR') {
                allow_wrap_or_preserved_newline();
            }

            var space_before = true;
            var space_after = true;

            if (in_array(current_token.text, ['--', '++', '!', '~']) || (in_array(current_token.text, ['-', '+']) && (in_array(last_type, ['TK_START_BLOCK', 'TK_START_EXPR', 'TK_EQUALS', 'TK_OPERATOR']) || in_array(flags.last_text, Tokenizer.line_starters) || flags.last_text === ','))) {
                // unary operators (and binary +/- pretending to be unary) special cases

                space_before = false;
                space_after = false;

                // http://www.ecma-international.org/ecma-262/5.1/#sec-7.9.1
                // if there is a newline between -- or ++ and anything else we should preserve it.
                if (current_token.wanted_newline && (current_token.text === '--' || current_token.text === '++')) {
                    print_newline(false, true);
                }

                if (flags.last_text === ';' && is_expression(flags.mode)) {
                    // for (;; ++i)
                    //        ^^^
                    space_before = true;
                }

                if (last_type === 'TK_RESERVED') {
                    space_before = true;
                } else if (last_type === 'TK_END_EXPR') {
                    space_before = !(flags.last_text === ']' && (current_token.text === '--' || current_token.text === '++'));
                } else if (last_type === 'TK_OPERATOR') {
                    // a++ + ++b;
                    // a - -b
                    space_before = in_array(current_token.text, ['--', '-', '++', '+']) && in_array(flags.last_text, ['--', '-', '++', '+']);
                    // + and - are not unary when preceeded by -- or ++ operator
                    // a-- + b
                    // a * +b
                    // a - -b
                    if (in_array(current_token.text, ['+', '-']) && in_array(flags.last_text, ['--', '++'])) {
                        space_after = true;
                    }
                }

                if ((flags.mode === MODE.BlockStatement || flags.mode === MODE.Statement) && (flags.last_text === '{' || flags.last_text === ';')) {
                    // { foo; --i }
                    // foo(); --bar;
                    print_newline();
                }
            } else if (current_token.text === ':') {
                if (flags.ternary_depth === 0) {
                    // Colon is invalid javascript outside of ternary and object, but do our best to guess what was meant.
                    space_before = false;
                } else {
                    flags.ternary_depth -= 1;
                }
            } else if (current_token.text === '?') {
                flags.ternary_depth += 1;
            } else if (current_token.text === '*' && last_type === 'TK_RESERVED' && flags.last_text === 'function') {
                space_before = false;
                space_after = false;
            }
            output.space_before_token = output.space_before_token || space_before;
            print_token();
            output.space_before_token = space_after;
        }

        function handle_block_comment() {
            var lines = split_newlines(current_token.text);
            var j; // iterator for this case
            var javadoc = false;
            var starless = false;
            var lastIndent = current_token.whitespace_before;
            var lastIndentLength = lastIndent.length;

            // block comment starts with a new line
            print_newline(false, true);
            if (lines.length > 1) {
                if (all_lines_start_with(lines.slice(1), '*')) {
                    javadoc = true;
                }
                else if (each_line_matches_indent(lines.slice(1), lastIndent)) {
                    starless = true;
                }
            }

            // first line always indented
            print_token(lines[0]);
            for (j = 1; j < lines.length; j++) {
                print_newline(false, true);
                if (javadoc) {
                    // javadoc: reformat and re-indent
                    print_token(' ' + ltrim(lines[j]));
                } else if (starless && lines[j].length > lastIndentLength) {
                    // starless: re-indent non-empty content, avoiding trim
                    print_token(lines[j].substring(lastIndentLength));
                } else {
                    // normal comments output raw
                    output.add_token(lines[j]);
                }
            }

            // for comments of more than one line, make sure there's a new line after
            print_newline(false, true);
        }

        function handle_inline_comment() {
            output.space_before_token = true;
            print_token();
            output.space_before_token = true;
        }

        function handle_comment() {
            if (current_token.wanted_newline) {
                print_newline(false, true);
            } else {
                output.trim(true);
            }

            output.space_before_token = true;
            print_token();
            print_newline(false, true);
        }

        function handle_dot() {
            if (start_of_statement()) {
                // The conditional starts the statement if appropriate.
            }

            if (last_type === 'TK_RESERVED' && is_special_word(flags.last_text)) {
                output.space_before_token = true;
            } else {
                // allow preserved newlines before dots in general
                // force newlines on dots after close paren when break_chained - for bar().baz()
                allow_wrap_or_preserved_newline(flags.last_text === ')' && opt.break_chained_methods);
            }

            print_token();
        }

        function handle_unknown() {
            print_token();

            if (current_token.text[current_token.text.length - 1] === '\n') {
                print_newline();
            }
        }

        function handle_eof() {
            // Unwind any open statements
            while (flags.mode === MODE.Statement) {
                restore_mode();
            }
        }
    }


    function OutputLine(parent) {
        var _character_count = 0;
        // use indent_count as a marker for lines that have preserved indentation
        var _indent_count = -1;

        var _items = [];
        var _empty = true;

        this.set_indent = function(level) {
            _character_count = parent.baseIndentLength + level * parent.indent_length
            _indent_count = level;
        }

        this.get_character_count = function() {
            return _character_count;
        }

        this.is_empty = function() {
            return _empty;
        }

        this.last = function() {
            if (!this._empty) {
              return _items[_items.length - 1];
            } else {
              return null;
            }
        }

        this.push = function(input) {
            _items.push(input);
            _character_count += input.length;
            _empty = false;
        }

        this.pop = function() {
            var item = null;
            if (!_empty) {
                item = _items.pop();
                _character_count -= item.length;
                _empty = _items.length === 0;
            }
            return item;
        }

        this.remove_indent = function() {
            if (_indent_count > 0) {
                _indent_count -= 1;
                _character_count -= parent.indent_length
            }
        }

        this.trim = function() {
            while (this.last() === ' ') {
                var item = _items.pop();
                _character_count -= 1;
            }
            _empty = _items.length === 0;
        }

        this.toString = function() {
            var result = '';
            if (!this._empty) {
                if (_indent_count >= 0) {
                    result = parent.indent_cache[_indent_count];
                }
                result += _items.join('')
            }
            return result;
        }
    }

    function Output(indent_string, baseIndentString) {
        baseIndentString = baseIndentString || '';
        this.indent_cache = [ baseIndentString ];
        this.baseIndentLength = baseIndentString.length;
        this.indent_length = indent_string.length;

        var lines =[];
        this.baseIndentString = baseIndentString;
        this.indent_string = indent_string;
        this.previous_line = null;
        this.current_line = null;
        this.space_before_token = false;

        this.get_line_number = function() {
            return lines.length;
        }

        // Using object instead of string to allow for later expansion of info about each line
        this.add_new_line = function(force_newline) {
            if (this.get_line_number() === 1 && this.just_added_newline()) {
                return false; // no newline on start of file
            }

            if (force_newline || !this.just_added_newline()) {
                this.previous_line = this.current_line;
                this.current_line = new OutputLine(this);
                lines.push(this.current_line);
                return true;
            }

            return false;
        }

        // initialize
        this.add_new_line(true);

        this.get_code = function() {
            var sweet_code = lines.join('\n').replace(/[\r\n\t ]+$/, '');
            return sweet_code;
        }

        this.set_indent = function(level) {
            // Never indent your first output indent at the start of the file
            if (lines.length > 1) {
                while(level >= this.indent_cache.length) {
                    this.indent_cache.push(this.indent_cache[this.indent_cache.length - 1] + this.indent_string);
                }

                this.current_line.set_indent(level);
                return true;
            }
            this.current_line.set_indent(0);
            return false;
        }

        this.add_token = function(printable_token) {
            this.add_space_before_token();
            this.current_line.push(printable_token);
        }

        this.add_space_before_token = function() {
            if (this.space_before_token && !this.just_added_newline()) {
                this.current_line.push(' ');
            }
            this.space_before_token = false;
        }

        this.remove_redundant_indentation = function (frame) {
            // This implementation is effective but has some issues:
            //     - can cause line wrap to happen too soon due to indent removal
            //           after wrap points are calculated
            // These issues are minor compared to ugly indentation.

            if (frame.multiline_frame ||
                frame.mode === MODE.ForInitializer ||
                frame.mode === MODE.Conditional) {
                return;
            }

            // remove one indent from each line inside this section
            var index = frame.start_line_index;
            var line;

            var output_length = lines.length;
            while (index < output_length) {
                lines[index].remove_indent();
                index++;
            }
        }

        this.trim = function(eat_newlines) {
            eat_newlines = (eat_newlines === undefined) ? false : eat_newlines;

            this.current_line.trim(indent_string, baseIndentString);

            while (eat_newlines && lines.length > 1 &&
                this.current_line.is_empty()) {
                lines.pop();
                this.current_line = lines[lines.length - 1]
                this.current_line.trim();
            }

            this.previous_line = lines.length > 1 ? lines[lines.length - 2] : null;
        }

        this.just_added_newline = function() {
            return this.current_line.is_empty();
        }

        this.just_added_blankline = function() {
            if (this.just_added_newline()) {
                if (lines.length === 1) {
                    return true; // start of the file and newline = blank
                }

                var line = lines[lines.length - 2];
                return line.is_empty();
            }
            return false;
        }
    }


    var Token = function(type, text, newlines, whitespace_before, mode, parent) {
        this.type = type;
        this.text = text;
        this.comments_before = [];
        this.newlines = newlines || 0;
        this.wanted_newline = newlines > 0;
        this.whitespace_before = whitespace_before || '';
        this.parent = null;
    }

    function tokenizer(input, opts, indent_string) {

        var whitespace = "\n\r\t ".split('');
        var digit = /[0-9]/;

        var punct = ('+ - * / % & ++ -- = += -= *= /= %= == === != !== > < >= <= >> << >>> >>>= >>= <<= && &= | || ! ~ , : ? ^ ^= |= :: =>'
                +' <%= <% %> <?= <? ?>').split(' '); // try to be a good boy and try not to break the markup language identifiers

        // words which should always start on new line.
        this.line_starters = 'continue,try,throw,return,var,let,const,if,switch,case,default,for,while,break,function,import,export'.split(',');
        var reserved_words = this.line_starters.concat(['do', 'in', 'else', 'get', 'set', 'new', 'catch', 'finally', 'typeof', 'yield']);

        var n_newlines, whitespace_before_token, in_html_comment, tokens, parser_pos;
        var input_length;

        this.tokenize = function() {
            // cache the source's length.
            input_length = input.length
            parser_pos = 0;
            in_html_comment = false
            tokens = [];

            var next, last;
            var token_values;
            var open = null;
            var open_stack = [];
            var comments = [];

            while (!(last && last.type === 'TK_EOF')) {
                token_values = tokenize_next();
                next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                while(next.type === 'TK_INLINE_COMMENT' || next.type === 'TK_COMMENT' ||
                    next.type === 'TK_BLOCK_COMMENT' || next.type === 'TK_UNKNOWN') {
                    comments.push(next);
                    token_values = tokenize_next();
                    next = new Token(token_values[1], token_values[0], n_newlines, whitespace_before_token);
                }

                if (comments.length) {
                    next.comments_before = comments;
                    comments = [];
                }

                if (next.type === 'TK_START_BLOCK' || next.type === 'TK_START_EXPR') {
                    next.parent = last;
                    open = next;
                    open_stack.push(next);
                }  else if ((next.type === 'TK_END_BLOCK' || next.type === 'TK_END_EXPR') &&
                    (open && (
                        (next.text === ']' && open.text === '[') ||
                        (next.text === ')' && open.text === '(') ||
                        (next.text === '}' && open.text === '}')))) {
                    next.parent = open.parent;
                    open = open_stack.pop();
                }

                tokens.push(next);
                last = next;
            }

            return tokens;
        }

        function tokenize_next() {
            var i, resulting_string;
            var whitespace_on_this_line = [];

            n_newlines = 0;
            whitespace_before_token = '';

            if (parser_pos >= input_length) {
                return ['', 'TK_EOF'];
            }

            var last_token;
            if (tokens.length) {
                last_token = tokens[tokens.length-1];
            } else {
                // For the sake of tokenizing we can pretend that there was on open brace to start
                last_token = new Token('TK_START_BLOCK', '{');
            }


            var c = input.charAt(parser_pos);
            parser_pos += 1;

            while (in_array(c, whitespace)) {

                if (c === '\n') {
                    n_newlines += 1;
                    whitespace_on_this_line = [];
                } else if (n_newlines) {
                    if (c === indent_string) {
                        whitespace_on_this_line.push(indent_string);
                    } else if (c !== '\r') {
                        whitespace_on_this_line.push(' ');
                    }
                }

                if (parser_pos >= input_length) {
                    return ['', 'TK_EOF'];
                }

                c = input.charAt(parser_pos);
                parser_pos += 1;
            }

            if(whitespace_on_this_line.length) {
                whitespace_before_token = whitespace_on_this_line.join('');
            }

            if (digit.test(c)) {
                var allow_decimal = true;
                var allow_e = true;
                var local_digit = digit;

                if (c === '0' && parser_pos < input_length && /[Xx]/.test(input.charAt(parser_pos))) {
                    // switch to hex number, no decimal or e, just hex digits
                    allow_decimal = false;
                    allow_e = false;
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    local_digit = /[0123456789abcdefABCDEF]/
                } else {
                    // we know this first loop will run.  It keeps the logic simpler.
                    c = '';
                    parser_pos -= 1
                }

                // Add the digits
                while (parser_pos < input_length && local_digit.test(input.charAt(parser_pos))) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;

                    if (allow_decimal && parser_pos < input_length && input.charAt(parser_pos) === '.') {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        allow_decimal = false;
                    }

                    if (allow_e && parser_pos < input_length && /[Ee]/.test(input.charAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;

                        if (parser_pos < input_length && /[+-]/.test(input.charAt(parser_pos))) {
                            c += input.charAt(parser_pos);
                            parser_pos += 1;
                        }

                        allow_e = false;
                        allow_decimal = false;
                    }
                }

                return [c, 'TK_WORD'];
            }

            if (acorn.isIdentifierStart(input.charCodeAt(parser_pos-1))) {
                if (parser_pos < input_length) {
                    while (acorn.isIdentifierChar(input.charCodeAt(parser_pos))) {
                        c += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos === input_length) {
                            break;
                        }
                    }
                }

                if (!(last_token.type === 'TK_DOT' ||
                        (last_token.type === 'TK_RESERVED' && in_array(last_token.text, ['set', 'get'])))
                    && in_array(c, reserved_words)) {
                    if (c === 'in') { // hack for 'in' operator
                        return [c, 'TK_OPERATOR'];
                    }
                    return [c, 'TK_RESERVED'];
                }

                return [c, 'TK_WORD'];
            }

            if (c === '(' || c === '[') {
                return [c, 'TK_START_EXPR'];
            }

            if (c === ')' || c === ']') {
                return [c, 'TK_END_EXPR'];
            }

            if (c === '{') {
                return [c, 'TK_START_BLOCK'];
            }

            if (c === '}') {
                return [c, 'TK_END_BLOCK'];
            }

            if (c === ';') {
                return [c, 'TK_SEMICOLON'];
            }

            if (c === '/') {
                var comment = '';
                // peek for comment /* ... */
                var inline_comment = true;
                if (input.charAt(parser_pos) === '*') {
                    parser_pos += 1;
                    if (parser_pos < input_length) {
                        while (parser_pos < input_length && !(input.charAt(parser_pos) === '*' && input.charAt(parser_pos + 1) && input.charAt(parser_pos + 1) === '/')) {
                            c = input.charAt(parser_pos);
                            comment += c;
                            if (c === "\n" || c === "\r") {
                                inline_comment = false;
                            }
                            parser_pos += 1;
                            if (parser_pos >= input_length) {
                                break;
                            }
                        }
                    }
                    parser_pos += 2;
                    if (inline_comment && n_newlines === 0) {
                        return ['/*' + comment + '*/', 'TK_INLINE_COMMENT'];
                    } else {
                        return ['/*' + comment + '*/', 'TK_BLOCK_COMMENT'];
                    }
                }
                // peek for comment // ...
                if (input.charAt(parser_pos) === '/') {
                    comment = c;
                    while (input.charAt(parser_pos) !== '\r' && input.charAt(parser_pos) !== '\n') {
                        comment += input.charAt(parser_pos);
                        parser_pos += 1;
                        if (parser_pos >= input_length) {
                            break;
                        }
                    }
                    return [comment, 'TK_COMMENT'];
                }

            }

            if (c === '`' || c === "'" || c === '"' || // string
                (
                    (c === '/') || // regexp
                    (opts.e4x && c === "<" && input.slice(parser_pos - 1).match(/^<([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*\/?\s*>/)) // xml
                ) && ( // regex and xml can only appear in specific locations during parsing
                    (last_token.type === 'TK_RESERVED' && in_array(last_token.text , ['return', 'case', 'throw', 'else', 'do', 'typeof', 'yield'])) ||
                    (last_token.type === 'TK_END_EXPR' && last_token.text === ')' &&
                        last_token.parent && last_token.parent.type === 'TK_RESERVED' && in_array(last_token.parent.text, ['if', 'while', 'for'])) ||
                    (in_array(last_token.type, ['TK_COMMENT', 'TK_START_EXPR', 'TK_START_BLOCK',
                        'TK_END_BLOCK', 'TK_OPERATOR', 'TK_EQUALS', 'TK_EOF', 'TK_SEMICOLON', 'TK_COMMA'
                    ]))
                )) {

                var sep = c,
                    esc = false,
                    has_char_escapes = false;

                resulting_string = c;

                if (sep === '/') {
                    //
                    // handle regexp
                    //
                    var in_char_class = false;
                    while (parser_pos < input_length &&
                            ((esc || in_char_class || input.charAt(parser_pos) !== sep) &&
                            !acorn.newline.test(input.charAt(parser_pos)))) {
                        resulting_string += input.charAt(parser_pos);
                        if (!esc) {
                            esc = input.charAt(parser_pos) === '\\';
                            if (input.charAt(parser_pos) === '[') {
                                in_char_class = true;
                            } else if (input.charAt(parser_pos) === ']') {
                                in_char_class = false;
                            }
                        } else {
                            esc = false;
                        }
                        parser_pos += 1;
                    }
                } else if (opts.e4x && sep === '<') {
                    //
                    // handle e4x xml literals
                    //
                    var xmlRegExp = /<(\/?)([-a-zA-Z:0-9_.]+|{[^{}]*}|!\[CDATA\[[\s\S]*?\]\])\s*([-a-zA-Z:0-9_.]+=('[^']*'|"[^"]*"|{[^{}]*})\s*)*(\/?)\s*>/g;
                    var xmlStr = input.slice(parser_pos - 1);
                    var match = xmlRegExp.exec(xmlStr);
                    if (match && match.index === 0) {
                        var rootTag = match[2];
                        var depth = 0;
                        while (match) {
                            var isEndTag = !! match[1];
                            var tagName = match[2];
                            var isSingletonTag = ( !! match[match.length - 1]) || (tagName.slice(0, 8) === "![CDATA[");
                            if (tagName === rootTag && !isSingletonTag) {
                                if (isEndTag) {
                                    --depth;
                                } else {
                                    ++depth;
                                }
                            }
                            if (depth <= 0) {
                                break;
                            }
                            match = xmlRegExp.exec(xmlStr);
                        }
                        var xmlLength = match ? match.index + match[0].length : xmlStr.length;
                        parser_pos += xmlLength - 1;
                        return [xmlStr.slice(0, xmlLength), "TK_STRING"];
                    }
                } else {
                    //
                    // handle string
                    //
                    // Template strings can travers lines without escape characters.
                    // Other strings cannot
                    while (parser_pos < input_length &&
                            (esc || (input.charAt(parser_pos) !== sep &&
                            (sep === '`' || !acorn.newline.test(input.charAt(parser_pos)))))) {
                        resulting_string += input.charAt(parser_pos);
                        if (esc) {
                            if (input.charAt(parser_pos) === 'x' || input.charAt(parser_pos) === 'u') {
                                has_char_escapes = true;
                            }
                            esc = false;
                        } else {
                            esc = input.charAt(parser_pos) === '\\';
                        }
                        parser_pos += 1;
                    }

                }

                if (has_char_escapes && opts.unescape_strings) {
                    resulting_string = unescape_string(resulting_string);
                }

                if (parser_pos < input_length && input.charAt(parser_pos) === sep) {
                    resulting_string += sep;
                    parser_pos += 1;

                    if (sep === '/') {
                        // regexps may have modifiers /regexp/MOD , so fetch those, too
                        // Only [gim] are valid, but if the user puts in garbage, do what we can to take it.
                        while (parser_pos < input_length && acorn.isIdentifierStart(input.charCodeAt(parser_pos))) {
                            resulting_string += input.charAt(parser_pos);
                            parser_pos += 1;
                        }
                    }
                }
                return [resulting_string, 'TK_STRING'];
            }

            if (c === '#') {

                if (tokens.length === 0 && input.charAt(parser_pos) === '!') {
                    // shebang
                    resulting_string = c;
                    while (parser_pos < input_length && c !== '\n') {
                        c = input.charAt(parser_pos);
                        resulting_string += c;
                        parser_pos += 1;
                    }
                    return [trim(resulting_string) + '\n', 'TK_UNKNOWN'];
                }



                // Spidermonkey-specific sharp variables for circular references
                // https://developer.mozilla.org/En/Sharp_variables_in_JavaScript
                // http://mxr.mozilla.org/mozilla-central/source/js/src/jsscan.cpp around line 1935
                var sharp = '#';
                if (parser_pos < input_length && digit.test(input.charAt(parser_pos))) {
                    do {
                        c = input.charAt(parser_pos);
                        sharp += c;
                        parser_pos += 1;
                    } while (parser_pos < input_length && c !== '#' && c !== '=');
                    if (c === '#') {
                        //
                    } else if (input.charAt(parser_pos) === '[' && input.charAt(parser_pos + 1) === ']') {
                        sharp += '[]';
                        parser_pos += 2;
                    } else if (input.charAt(parser_pos) === '{' && input.charAt(parser_pos + 1) === '}') {
                        sharp += '{}';
                        parser_pos += 2;
                    }
                    return [sharp, 'TK_WORD'];
                }
            }

            if (c === '<' && input.substring(parser_pos - 1, parser_pos + 3) === '<!--') {
                parser_pos += 3;
                c = '<!--';
                while (input.charAt(parser_pos) !== '\n' && parser_pos < input_length) {
                    c += input.charAt(parser_pos);
                    parser_pos++;
                }
                in_html_comment = true;
                return [c, 'TK_COMMENT'];
            }

            if (c === '-' && in_html_comment && input.substring(parser_pos - 1, parser_pos + 2) === '-->') {
                in_html_comment = false;
                parser_pos += 2;
                return ['-->', 'TK_COMMENT'];
            }

            if (c === '.') {
                return [c, 'TK_DOT'];
            }

            if (in_array(c, punct)) {
                while (parser_pos < input_length && in_array(c + input.charAt(parser_pos), punct)) {
                    c += input.charAt(parser_pos);
                    parser_pos += 1;
                    if (parser_pos >= input_length) {
                        break;
                    }
                }

                if (c === ',') {
                    return [c, 'TK_COMMA'];
                } else if (c === '=') {
                    return [c, 'TK_EQUALS'];
                } else {
                    return [c, 'TK_OPERATOR'];
                }
            }

            return [c, 'TK_UNKNOWN'];
        }


        function unescape_string(s) {
            var esc = false,
                out = '',
                pos = 0,
                s_hex = '',
                escaped = 0,
                c;

            while (esc || pos < s.length) {

                c = s.charAt(pos);
                pos++;

                if (esc) {
                    esc = false;
                    if (c === 'x') {
                        // simple hex-escape \x24
                        s_hex = s.substr(pos, 2);
                        pos += 2;
                    } else if (c === 'u') {
                        // unicode-escape, \u2134
                        s_hex = s.substr(pos, 4);
                        pos += 4;
                    } else {
                        // some common escape, e.g \n
                        out += '\\' + c;
                        continue;
                    }
                    if (!s_hex.match(/^[0123456789abcdefABCDEF]+$/)) {
                        // some weird escaping, bail out,
                        // leaving whole string intact
                        return s;
                    }

                    escaped = parseInt(s_hex, 16);

                    if (escaped >= 0x00 && escaped < 0x20) {
                        // leave 0x00...0x1f escaped
                        if (c === 'x') {
                            out += '\\x' + s_hex;
                        } else {
                            out += '\\u' + s_hex;
                        }
                        continue;
                    } else if (escaped === 0x22 || escaped === 0x27 || escaped === 0x5c) {
                        // single-quote, apostrophe, backslash - escape these
                        out += '\\' + String.fromCharCode(escaped);
                    } else if (c === 'x' && escaped > 0x7e && escaped <= 0xff) {
                        // we bail out on \x7f..\xff,
                        // leaving whole string escaped,
                        // as it's probably completely binary
                        return s;
                    } else {
                        out += String.fromCharCode(escaped);
                    }
                } else if (c === '\\') {
                    esc = true;
                } else {
                    out += c;
                }
            }
            return out;
        }

    }


    if (typeof define === "function" && define.amd) {
        // Add support for AMD ( https://github.com/amdjs/amdjs-api/wiki/AMD#defineamd-property- )
        define([], function() {
            return { js_beautify: js_beautify };
        });
    } else if (typeof exports !== "undefined") {
        // Add support for CommonJS. Just put this file somewhere on your require.paths
        // and you will be able to `var js_beautify = require("beautify").js_beautify`.
        exports.js_beautify = js_beautify;
    } else if (typeof window !== "undefined") {
        // If we're running a web page and don't have either of the above, add our one global
        window.js_beautify = js_beautify;
    } else if (typeof global !== "undefined") {
        // If we don't even have window, try global.
        global.js_beautify = js_beautify;
    }

}());

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],12:[function(require,module,exports){
var beautify = require('js-beautify').js_beautify;
var parser = require('./parser');
var utils = require('./utils');

// Whenever we hit an indented block, make sure all preceding
// empty lines are made to have this indentation level
function normalizeBlocks (input) {

    var numberOfLinesToIndent = 0,
        thisLineContainsStuff = false,
        thisLinesIndentation = '',
        out = '';

    for (var i = 0; i < input.length; i++) {

        var chr = input[i];

        if (chr == '\r') {
            continue;
        }

        if (chr === '\n') {
            if (!thisLineContainsStuff) {
                numberOfLinesToIndent++;
            }
            else {
                out += '\n';
            }
            thisLineContainsStuff = false;
            thisLinesIndentation = '';
            continue;
        }

        if (!thisLineContainsStuff && (chr === ' ' || chr === '\t')) {
            thisLinesIndentation += chr;
            continue;
        }

        if (chr !== ' ' || chr !== '\t') {

            if (!thisLineContainsStuff) {
                for (var j = 0; j < numberOfLinesToIndent; j++) {
                    out += thisLinesIndentation + '\n';
                }
                out += thisLinesIndentation + chr;
            }
            else {
                out += chr;
            }
            numberOfLinesToIndent = 0;
            thisLineContainsStuff = true;

        }

    }

    return out;

}

function parse (input, options) {

    input = normalizeBlocks(input);

    options = options || {};
    options.removeComments = options.removeComments !== undefined ? options.removeComments : false;
    options.node = options.node !== undefined ? options.node : false;
    options.bare = options.bare !== undefined ? options.bare : false;
    options.strictStyleMode = options.strictStyleMode !== undefined ? options.strictStyleMode : true;
    options.optimize = options.optimize !== undefined ? options.optimize : true;
    options.parse = parse;

    var js;
    try {
        js = parser.parse(input).toJS(options);
    }
    catch (e) {
        throw new ParserError(e, input, options);
    }

    return beautify(js);

}

function ParserError (error, input, options) {
    this.message  = error.message;
    this.expected = error.expected;
    this.found    = error.found;
    this.offset   = error.offset;
    this.line     = error.line;
    this.column   = error.column;
    this.inner    = error;
    this.name     = 'ParserError';

    this.toString = function () {
        var lines = input.split('\n');
        if (this.offset !== undefined) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ', character ' + error.column + ':',
                error.line > 2 ? lines[error.line-2] : '',
                lines[error.line-1],
                utils.repeat(" ", error.column-1) + '^',
                error.message,
            ].join('\n');
        }
        else if (this.line) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ':',
                lines[error.line-1],
                '',
                error.message
            ].join('\n');
        }
        else {
            return this.inner.toString();
        }
    };

}

ParserError.prototype = Object.create(Error);

module.exports.parse = parse;
module.exports.ParserError = ParserError;

},{"./parser":13,"./utils":14,"js-beautify":8}],13:[function(require,module,exports){
module.exports = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleFunctions = { Program: peg$parseProgram, Expression: peg$parseExpression, Statement: peg$parseStatement },
        peg$startRuleFunction  = peg$parseProgram,

        peg$c0 = function(block) {
                    block.isScope = true;
                    return new type.Program(block);
                },
        peg$c1 = peg$FAILED,
        peg$c2 = [],
        peg$c3 = function(statements) {
                    var list = [statements[0]];
                    for(var i = 0; i < statements[1].length; i++) list.push(statements[1][i][3]);
                    return new type.Block(list)
                },
        peg$c4 = "if ",
        peg$c5 = { type: "literal", value: "if ", description: "\"if \"" },
        peg$c6 = null,
        peg$c7 = "elif",
        peg$c8 = { type: "literal", value: "elif", description: "\"elif\"" },
        peg$c9 = "else",
        peg$c10 = { type: "literal", value: "else", description: "\"else\"" },
        peg$c11 = function(condition, ifBody, elifPart, elsePart) {
                    var elifs = elifPart.map(function(elif) {
                        return new type.If(elif[3], elif[4]);
                    });
                    return new type.If(condition, ifBody, elifs, elsePart ? elsePart[2] : null);
                },
        peg$c12 = "while ",
        peg$c13 = { type: "literal", value: "while ", description: "\"while \"" },
        peg$c14 = function(e, body) { return new type.WhileLoop(e, body); },
        peg$c15 = "break",
        peg$c16 = { type: "literal", value: "break", description: "\"break\"" },
        peg$c17 = "continue",
        peg$c18 = { type: "literal", value: "continue", description: "\"continue\"" },
        peg$c19 = void 0,
        peg$c20 = function(word) { return new type.LoopControl(word) },
        peg$c21 = "import ",
        peg$c22 = { type: "literal", value: "import ", description: "\"import \"" },
        peg$c23 = /^[\-a-zA-Z0-9._!\/]/,
        peg$c24 = { type: "class", value: "[\\-a-zA-Z0-9._!\\/]", description: "[\\-a-zA-Z0-9._!\\/]" },
        peg$c25 = " as ",
        peg$c26 = { type: "literal", value: " as ", description: "\" as \"" },
        peg$c27 = ":",
        peg$c28 = { type: "literal", value: ":", description: "\":\"" },
        peg$c29 = ",",
        peg$c30 = { type: "literal", value: ",", description: "\",\"" },
        peg$c31 = function(path, name, subImports) {
                    var subs = [];
                    if (subImports) {
                        subs.push(new type.SubImportStatement(subImports[3]));
                        subs = subs.concat(subImports[5].map(function(group){
                            return new type.SubImportStatement(group[2])
                        }));
                    }
                    return new type.ImportStatement(path.join(''), name ? name[1] : undefined, subs);
                },
        peg$c32 = "include ",
        peg$c33 = { type: "literal", value: "include ", description: "\"include \"" },
        peg$c34 = /^[a-zA-Z0-9._\/\-]/,
        peg$c35 = { type: "class", value: "[a-zA-Z0-9._\\/\\-]", description: "[a-zA-Z0-9._\\/\\-]" },
        peg$c36 = function(path) { return new type.IncludeStatement(path.join('')); },
        peg$c37 = "export ",
        peg$c38 = { type: "literal", value: "export ", description: "\"export \"" },
        peg$c39 = function(expr) { return new type.ExportStatement(expr); },
        peg$c40 = "return",
        peg$c41 = { type: "literal", value: "return", description: "\"return\"" },
        peg$c42 = function(expr) { return new type.Return(expr); },
        peg$c43 = "try",
        peg$c44 = { type: "literal", value: "try", description: "\"try\"" },
        peg$c45 = "catch",
        peg$c46 = { type: "literal", value: "catch", description: "\"catch\"" },
        peg$c47 = function(tryBody, catchVar, catchBody) { return new type.TryCatch(tryBody, catchVar, catchBody)},
        peg$c48 = "throw",
        peg$c49 = { type: "literal", value: "throw", description: "\"throw\"" },
        peg$c50 = function(expr) { return new type.Throw(expr); },
        peg$c51 = "pass",
        peg$c52 = { type: "literal", value: "pass", description: "\"pass\"" },
        peg$c53 = function() { return new type.Noop() },
        peg$c54 = "class",
        peg$c55 = { type: "literal", value: "class", description: "\"class\"" },
        peg$c56 = "extends",
        peg$c57 = { type: "literal", value: "extends", description: "\"extends\"" },
        peg$c58 = function(ident, extender, head, tail) {
                    var obj = new type.ClassStatement(ident, extender ? extender[2] : null);
                    if (head !== '') obj.add(head[1]);

                    for (var i = 0; i < tail.length; i++)
                        if (tail[i][1].key)
                            obj.add(tail[i][1])

                    return obj;
                },
        peg$c59 = "for ",
        peg$c60 = { type: "literal", value: "for ", description: "\"for \"" },
        peg$c61 = "in",
        peg$c62 = { type: "literal", value: "in", description: "\"in\"" },
        peg$c63 = "of",
        peg$c64 = { type: "literal", value: "of", description: "\"of\"" },
        peg$c65 = function(body) { return body; },
        peg$c66 = function(iterator, item, op, iterable, body) {
                    if (op === 'of' && iterable.nodeType === 'Range') {
                        error('for ... of cannot be used with a range, only objects.')
                    }
                    return new type.ForLoop(iterator ? iterator[0] : null, item, iterable, body, op === 'of');
                },
        peg$c67 = function(block) { return block; },
        peg$c68 = "then",
        peg$c69 = { type: "literal", value: "then", description: "\"then\"" },
        peg$c70 = function(statement) { return statement; },
        peg$c71 = "\r\n",
        peg$c72 = { type: "literal", value: "\r\n", description: "\"\\r\\n\"" },
        peg$c73 = "\n",
        peg$c74 = { type: "literal", value: "\n", description: "\"\\n\"" },
        peg$c75 = "\r",
        peg$c76 = { type: "literal", value: "\r", description: "\"\\r\"" },
        peg$c77 = /^[ \t]/,
        peg$c78 = { type: "class", value: "[ \\t]", description: "[ \\t]" },
        peg$c79 = function(i) { return i.join("") === indent; },
        peg$c80 = function(i) { return i.length > indent.length; },
        peg$c81 = function(i) {
                    indentStack.push(indent);
                    indent = i.join("");
                    peg$currPos = offset();
                },
        peg$c82 = function() { indent = indentStack.pop(); },
        peg$c83 = "#",
        peg$c84 = { type: "literal", value: "#", description: "\"#\"" },
        peg$c85 = { type: "any", description: "any character" },
        peg$c86 = function(text) { return new type.Comment(text); },
        peg$c87 = function(left, op, value) { return new type.Assignment(op, left, value) },
        peg$c88 = "=",
        peg$c89 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c90 = function() { return '='; },
        peg$c91 = "*=",
        peg$c92 = { type: "literal", value: "*=", description: "\"*=\"" },
        peg$c93 = "/=",
        peg$c94 = { type: "literal", value: "/=", description: "\"/=\"" },
        peg$c95 = "%=",
        peg$c96 = { type: "literal", value: "%=", description: "\"%=\"" },
        peg$c97 = "+=",
        peg$c98 = { type: "literal", value: "+=", description: "\"+=\"" },
        peg$c99 = "-=",
        peg$c100 = { type: "literal", value: "-=", description: "\"-=\"" },
        peg$c101 = "<<=",
        peg$c102 = { type: "literal", value: "<<=", description: "\"<<=\"" },
        peg$c103 = ">>=",
        peg$c104 = { type: "literal", value: ">>=", description: "\">>=\"" },
        peg$c105 = ">>>=",
        peg$c106 = { type: "literal", value: ">>>=", description: "\">>>=\"" },
        peg$c107 = "&=",
        peg$c108 = { type: "literal", value: "&=", description: "\"&=\"" },
        peg$c109 = "^=",
        peg$c110 = { type: "literal", value: "^=", description: "\"^=\"" },
        peg$c111 = "|=",
        peg$c112 = { type: "literal", value: "|=", description: "\"|=\"" },
        peg$c113 = "+",
        peg$c114 = { type: "literal", value: "+", description: "\"+\"" },
        peg$c115 = "-",
        peg$c116 = { type: "literal", value: "-", description: "\"-\"" },
        peg$c117 = "*",
        peg$c118 = { type: "literal", value: "*", description: "\"*\"" },
        peg$c119 = "/",
        peg$c120 = { type: "literal", value: "/", description: "\"/\"" },
        peg$c121 = "%",
        peg$c122 = { type: "literal", value: "%", description: "\"%\"" },
        peg$c123 = "&",
        peg$c124 = { type: "literal", value: "&", description: "\"&\"" },
        peg$c125 = "|",
        peg$c126 = { type: "literal", value: "|", description: "\"|\"" },
        peg$c127 = "^",
        peg$c128 = { type: "literal", value: "^", description: "\"^\"" },
        peg$c129 = ">>",
        peg$c130 = { type: "literal", value: ">>", description: "\">>\"" },
        peg$c131 = ">>>",
        peg$c132 = { type: "literal", value: ">>>", description: "\">>>\"" },
        peg$c133 = "<<",
        peg$c134 = { type: "literal", value: "<<", description: "\"<<\"" },
        peg$c135 = "==",
        peg$c136 = { type: "literal", value: "==", description: "\"==\"" },
        peg$c137 = function() { return '==='; },
        peg$c138 = "!=",
        peg$c139 = { type: "literal", value: "!=", description: "\"!=\"" },
        peg$c140 = function() { return '!=='; },
        peg$c141 = "<=",
        peg$c142 = { type: "literal", value: "<=", description: "\"<=\"" },
        peg$c143 = ">=",
        peg$c144 = { type: "literal", value: ">=", description: "\">=\"" },
        peg$c145 = "<",
        peg$c146 = { type: "literal", value: "<", description: "\"<\"" },
        peg$c147 = ">",
        peg$c148 = { type: "literal", value: ">", description: "\">\"" },
        peg$c149 = "and",
        peg$c150 = { type: "literal", value: "and", description: "\"and\"" },
        peg$c151 = function() { return '&&'; },
        peg$c152 = "or",
        peg$c153 = { type: "literal", value: "or", description: "\"or\"" },
        peg$c154 = function() { return '||'; },
        peg$c155 = "instanceof",
        peg$c156 = { type: "literal", value: "instanceof", description: "\"instanceof\"" },
        peg$c157 = function() { return 'instanceof'; },
        peg$c158 = function() { return 'in'; },
        peg$c159 = "delete",
        peg$c160 = { type: "literal", value: "delete", description: "\"delete\"" },
        peg$c161 = function() { return 'delete'; },
        peg$c162 = "typeof",
        peg$c163 = { type: "literal", value: "typeof", description: "\"typeof\"" },
        peg$c164 = function() { return 'typeof'; },
        peg$c165 = "++",
        peg$c166 = { type: "literal", value: "++", description: "\"++\"" },
        peg$c167 = "--",
        peg$c168 = { type: "literal", value: "--", description: "\"--\"" },
        peg$c169 = "~",
        peg$c170 = { type: "literal", value: "~", description: "\"~\"" },
        peg$c171 = "not",
        peg$c172 = { type: "literal", value: "not", description: "\"not\"" },
        peg$c173 = function() { return '!'},
        peg$c174 = "?",
        peg$c175 = { type: "literal", value: "?", description: "\"?\"" },
        peg$c176 = function(cond, rest) {
                    if (!rest) {
                        return cond;
                    }
                    return new type.If(cond, rest[3], null, rest[7], true);
                },
        peg$c177 = function(left, rest) {
                    if (!rest) {
                        return left;
                    }
                    return new type.Operator(rest[1], left, rest[3]);
                },
        peg$c178 = function(left, op) {
                    if (!op) {
                        return left;
                    }
                    return new type.Operator(op, left);
                },
        peg$c179 = "[",
        peg$c180 = { type: "literal", value: "[", description: "\"[\"" },
        peg$c181 = "]",
        peg$c182 = { type: "literal", value: "]", description: "\"]\"" },
        peg$c183 = function(expr) { return {type: '[]', expr: expr} },
        peg$c184 = ".",
        peg$c185 = { type: "literal", value: ".", description: "\".\"" },
        peg$c186 = function(expr) { return {type: '.', expr: expr} },
        peg$c187 = "(",
        peg$c188 = { type: "literal", value: "(", description: "\"(\"" },
        peg$c189 = ")",
        peg$c190 = { type: "literal", value: ")", description: "\")\"" },
        peg$c191 = function(args) { return args; },
        peg$c192 = function(value, modifiers) {
                    for (var i = 0; i < modifiers.length; i++) {
                        if (modifiers[i].type) {
                            value = new type.PropertyAccess(value, modifiers[i].expr, modifiers[i].type)
                        }
                        else {
                            value = new type.FunctionCall(value, modifiers[i]);
                        }
                    }
                    return value;
                },
        peg$c193 = function(op, right) { return new type.UnaryOperator(op, right); },
        peg$c194 = function(a) { return new type.Variable(a); },
        peg$c195 = "super",
        peg$c196 = { type: "literal", value: "super", description: "\"super\"" },
        peg$c197 = function() { return new type.SuperToken(); },
        peg$c198 = "new",
        peg$c199 = { type: "literal", value: "new", description: "\"new\"" },
        peg$c200 = function(expr) { return new type.NewExpression(expr); },
        peg$c201 = function(head, tail) {
                    var list = [];
                    if (head !== null) {
                        list.push(head);
                    }
                    list = list.concat(tail.map(function(item) { return item[3]; }));
                    return new type.ListLiteral(list);
                },
        peg$c202 = "{",
        peg$c203 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c204 = "}",
        peg$c205 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c206 = function(head, tail) {
                    var obj = new type.ObjectLiteral();
                    if (head !== null) obj.add(head[1]);
                    for (var i = 0; i < tail.length; i++) {
                        if (tail[i][3].key) {
                            obj.add(tail[i][3]);
                        }
                    }
                    return obj;
                },
        peg$c207 = "->",
        peg$c208 = { type: "literal", value: "->", description: "\"->\"" },
        peg$c209 = function(params, body) {
                    body.isScope = true;
                    return new type.Function(params, body);
                },
        peg$c210 = function(params, body) {
                    body.isScope = true;
                    return new type.Function(params, new type.Return(body));
                },
        peg$c211 = function(key, value) { return {key: key, value: value}; },
        peg$c212 = function(str) { return str.join(''); },
        peg$c213 = "\"",
        peg$c214 = { type: "literal", value: "\"", description: "\"\\\"\"" },
        peg$c215 = "'",
        peg$c216 = { type: "literal", value: "'", description: "\"'\"" },
        peg$c217 = function(a) { return new type.Group(a); },
        peg$c218 = function(from, equals, to, by) {
                    by = by ? by[2] : {value: 1};
                    return new type.Range(from, to, by, !!equals); },
        peg$c219 = "0",
        peg$c220 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c221 = /^[1-9]/,
        peg$c222 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c223 = /^[0-9]/,
        peg$c224 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c225 = "e",
        peg$c226 = { type: "literal", value: "e", description: "\"e\"" },
        peg$c227 = function(fract, e) { return new type.Number(text()); },
        peg$c228 = "0x",
        peg$c229 = { type: "literal", value: "0x", description: "\"0x\"" },
        peg$c230 = /^[0-9a-fA-F]/,
        peg$c231 = { type: "class", value: "[0-9a-fA-F]", description: "[0-9a-fA-F]" },
        peg$c232 = function() { return new type.Literal(text()); },
        peg$c233 = "_",
        peg$c234 = { type: "literal", value: "_", description: "\"_\"" },
        peg$c235 = " ",
        peg$c236 = { type: "literal", value: " ", description: "\" \"" },
        peg$c237 = function(identifierType, identifier) { return new type.TypedIdentifier(identifierType ? identifierType[0] : null, identifier); },
        peg$c238 = "int",
        peg$c239 = { type: "literal", value: "int", description: "\"int\"" },
        peg$c240 = function(head, tail) {
                    tail = tail.map(function(item) { return item[3]; });
                    return [head].concat(tail);
                },
        peg$c241 = function() { return [] },
        peg$c242 = /^[a-zA-Z$_]/,
        peg$c243 = { type: "class", value: "[a-zA-Z$_]", description: "[a-zA-Z$_]" },
        peg$c244 = "\t",
        peg$c245 = { type: "literal", value: "\t", description: "\"\\t\"" },
        peg$c246 = function() { return new type.Noop(); },
        peg$c247 = "case",
        peg$c248 = { type: "literal", value: "case", description: "\"case\"" },
        peg$c249 = "debugger",
        peg$c250 = { type: "literal", value: "debugger", description: "\"debugger\"" },
        peg$c251 = "default",
        peg$c252 = { type: "literal", value: "default", description: "\"default\"" },
        peg$c253 = "do",
        peg$c254 = { type: "literal", value: "do", description: "\"do\"" },
        peg$c255 = "finally",
        peg$c256 = { type: "literal", value: "finally", description: "\"finally\"" },
        peg$c257 = "for",
        peg$c258 = { type: "literal", value: "for", description: "\"for\"" },
        peg$c259 = "function",
        peg$c260 = { type: "literal", value: "function", description: "\"function\"" },
        peg$c261 = "if",
        peg$c262 = { type: "literal", value: "if", description: "\"if\"" },
        peg$c263 = "switch",
        peg$c264 = { type: "literal", value: "switch", description: "\"switch\"" },
        peg$c265 = "this",
        peg$c266 = { type: "literal", value: "this", description: "\"this\"" },
        peg$c267 = "var",
        peg$c268 = { type: "literal", value: "var", description: "\"var\"" },
        peg$c269 = "void",
        peg$c270 = { type: "literal", value: "void", description: "\"void\"" },
        peg$c271 = "while",
        peg$c272 = { type: "literal", value: "while", description: "\"while\"" },
        peg$c273 = "with",
        peg$c274 = { type: "literal", value: "with", description: "\"with\"" },
        peg$c275 = "const",
        peg$c276 = { type: "literal", value: "const", description: "\"const\"" },
        peg$c277 = "enum",
        peg$c278 = { type: "literal", value: "enum", description: "\"enum\"" },
        peg$c279 = "export",
        peg$c280 = { type: "literal", value: "export", description: "\"export\"" },
        peg$c281 = "import",
        peg$c282 = { type: "literal", value: "import", description: "\"import\"" },
        peg$c283 = "null",
        peg$c284 = { type: "literal", value: "null", description: "\"null\"" },
        peg$c285 = "true",
        peg$c286 = { type: "literal", value: "true", description: "\"true\"" },
        peg$c287 = "false",
        peg$c288 = { type: "literal", value: "false", description: "\"false\"" },
        peg$c289 = "undefined",
        peg$c290 = { type: "literal", value: "undefined", description: "\"undefined\"" },
        peg$c291 = function(word) { return new type.Literal(word); },
        peg$c292 = "@",
        peg$c293 = { type: "literal", value: "@", description: "\"@\"" },
        peg$c294 = function(tokens) { return new type.ThisToken(tokens.length - 1); },
        peg$c295 = function(token, ident) { return new type.PropertyAccess(token, new type.Literal(ident), '.'); },
        peg$c296 = { type: "other", description: "string" },
        peg$c297 = function(parts) {
                var d = parts[0];
                var text = parts[1] !== null ? parts[1].join('') : "";

                // Is this a normal string?
                if (text.indexOf('#\x7b') === -1) {
                    return new type.StringLiteral(d, text);
                }

                // Oh, it contains variables. Let's reparse it then! Somewhat of a hack, but.. :)
                var re = new RegExp("#{([^\x7d]+)}", "g");
                text = d + text.replace(re, d + ' + $1 + ' + d) + d;
                return parser.parse(text, {startRule: 'Expression'});

            },
        peg$c298 = "\\",
        peg$c299 = { type: "literal", value: "\\", description: "\"\\\\\"" },
        peg$c300 = function() { return text(); },
        peg$c301 = function(sequence) { return sequence; },
        peg$c302 = function() { return "\\\\"; },
        peg$c303 = "b",
        peg$c304 = { type: "literal", value: "b", description: "\"b\"" },
        peg$c305 = function() { return "\\b";   },
        peg$c306 = "f",
        peg$c307 = { type: "literal", value: "f", description: "\"f\"" },
        peg$c308 = function() { return "\\f";   },
        peg$c309 = "n",
        peg$c310 = { type: "literal", value: "n", description: "\"n\"" },
        peg$c311 = function() { return "\\n";   },
        peg$c312 = "r",
        peg$c313 = { type: "literal", value: "r", description: "\"r\"" },
        peg$c314 = function() { return "\\r";   },
        peg$c315 = "t",
        peg$c316 = { type: "literal", value: "t", description: "\"t\"" },
        peg$c317 = function() { return "\\t";   },
        peg$c318 = "v",
        peg$c319 = { type: "literal", value: "v", description: "\"v\"" },
        peg$c320 = function() { return "\\x0B"; },
        peg$c321 = { type: "other", description: "regular expression" },
        peg$c322 = function(pattern, flags) {
              var value;

              try {
                value = new RegExp(pattern, flags);
              } catch (e) {
                error(e.message);
              }

              return new type.Regex(pattern, flags);
            },
        peg$c323 = /^[*\\\/[]/,
        peg$c324 = { type: "class", value: "[*\\\\\\/[]", description: "[*\\\\\\/[]" },
        peg$c325 = /^[\\\/[]/,
        peg$c326 = { type: "class", value: "[\\\\\\/[]", description: "[\\\\\\/[]" },
        peg$c327 = /^[\]\\]/,
        peg$c328 = { type: "class", value: "[\\]\\\\]", description: "[\\]\\\\]" },

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$parseProgram() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parseBlock();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c0(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseBlock() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseStatement();
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$parse_();
        if (s5 !== peg$FAILED) {
          s6 = peg$parseEOL();
          if (s6 !== peg$FAILED) {
            s7 = peg$parseIndent();
            if (s7 !== peg$FAILED) {
              s8 = peg$parseStatement();
              if (s8 !== peg$FAILED) {
                s5 = [s5, s6, s7, s8];
                s4 = s5;
              } else {
                peg$currPos = s4;
                s4 = peg$c1;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c1;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$c1;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseEOL();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseIndent();
              if (s7 !== peg$FAILED) {
                s8 = peg$parseStatement();
                if (s8 !== peg$FAILED) {
                  s5 = [s5, s6, s7, s8];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c1;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c1;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c1;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c3(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseStatement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12, s13, s14, s15;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c4) {
        s1 = peg$c4;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c5); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseExpression();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIndentedBlockOrThenPlusExpresssion();
          if (s3 !== peg$FAILED) {
            s4 = [];
            s5 = peg$currPos;
            s6 = [];
            s7 = peg$currPos;
            s8 = peg$parseEOL();
            if (s8 !== peg$FAILED) {
              s9 = peg$parseIndent();
              if (s9 !== peg$FAILED) {
                s10 = peg$parseComment();
                if (s10 === peg$FAILED) {
                  s10 = peg$c6;
                }
                if (s10 !== peg$FAILED) {
                  s8 = [s8, s9, s10];
                  s7 = s8;
                } else {
                  peg$currPos = s7;
                  s7 = peg$c1;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$c1;
              }
            } else {
              peg$currPos = s7;
              s7 = peg$c1;
            }
            if (s7 !== peg$FAILED) {
              while (s7 !== peg$FAILED) {
                s6.push(s7);
                s7 = peg$currPos;
                s8 = peg$parseEOL();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseIndent();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parseComment();
                    if (s10 === peg$FAILED) {
                      s10 = peg$c6;
                    }
                    if (s10 !== peg$FAILED) {
                      s8 = [s8, s9, s10];
                      s7 = s8;
                    } else {
                      peg$currPos = s7;
                      s7 = peg$c1;
                    }
                  } else {
                    peg$currPos = s7;
                    s7 = peg$c1;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$c1;
                }
              }
            } else {
              s6 = peg$c1;
            }
            if (s6 !== peg$FAILED) {
              if (input.substr(peg$currPos, 4) === peg$c7) {
                s7 = peg$c7;
                peg$currPos += 4;
              } else {
                s7 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c8); }
              }
              if (s7 !== peg$FAILED) {
                s8 = peg$parse_();
                if (s8 !== peg$FAILED) {
                  s9 = peg$parseExpression();
                  if (s9 !== peg$FAILED) {
                    s10 = peg$parseIndentedBlockOrThenPlusExpresssion();
                    if (s10 !== peg$FAILED) {
                      s6 = [s6, s7, s8, s9, s10];
                      s5 = s6;
                    } else {
                      peg$currPos = s5;
                      s5 = peg$c1;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c1;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c1;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c1;
              }
            } else {
              peg$currPos = s5;
              s5 = peg$c1;
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              s5 = peg$currPos;
              s6 = [];
              s7 = peg$currPos;
              s8 = peg$parseEOL();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseIndent();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parseComment();
                  if (s10 === peg$FAILED) {
                    s10 = peg$c6;
                  }
                  if (s10 !== peg$FAILED) {
                    s8 = [s8, s9, s10];
                    s7 = s8;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$c1;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$c1;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$c1;
              }
              if (s7 !== peg$FAILED) {
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$currPos;
                  s8 = peg$parseEOL();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseIndent();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseComment();
                      if (s10 === peg$FAILED) {
                        s10 = peg$c6;
                      }
                      if (s10 !== peg$FAILED) {
                        s8 = [s8, s9, s10];
                        s7 = s8;
                      } else {
                        peg$currPos = s7;
                        s7 = peg$c1;
                      }
                    } else {
                      peg$currPos = s7;
                      s7 = peg$c1;
                    }
                  } else {
                    peg$currPos = s7;
                    s7 = peg$c1;
                  }
                }
              } else {
                s6 = peg$c1;
              }
              if (s6 !== peg$FAILED) {
                if (input.substr(peg$currPos, 4) === peg$c7) {
                  s7 = peg$c7;
                  peg$currPos += 4;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c8); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parse_();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseExpression();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseIndentedBlockOrThenPlusExpresssion();
                      if (s10 !== peg$FAILED) {
                        s6 = [s6, s7, s8, s9, s10];
                        s5 = s6;
                      } else {
                        peg$currPos = s5;
                        s5 = peg$c1;
                      }
                    } else {
                      peg$currPos = s5;
                      s5 = peg$c1;
                    }
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c1;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c1;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c1;
              }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              s6 = [];
              s7 = peg$currPos;
              s8 = peg$parseEOL();
              if (s8 !== peg$FAILED) {
                s9 = peg$parseIndent();
                if (s9 !== peg$FAILED) {
                  s10 = peg$parseComment();
                  if (s10 === peg$FAILED) {
                    s10 = peg$c6;
                  }
                  if (s10 !== peg$FAILED) {
                    s8 = [s8, s9, s10];
                    s7 = s8;
                  } else {
                    peg$currPos = s7;
                    s7 = peg$c1;
                  }
                } else {
                  peg$currPos = s7;
                  s7 = peg$c1;
                }
              } else {
                peg$currPos = s7;
                s7 = peg$c1;
              }
              if (s7 !== peg$FAILED) {
                while (s7 !== peg$FAILED) {
                  s6.push(s7);
                  s7 = peg$currPos;
                  s8 = peg$parseEOL();
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parseIndent();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseComment();
                      if (s10 === peg$FAILED) {
                        s10 = peg$c6;
                      }
                      if (s10 !== peg$FAILED) {
                        s8 = [s8, s9, s10];
                        s7 = s8;
                      } else {
                        peg$currPos = s7;
                        s7 = peg$c1;
                      }
                    } else {
                      peg$currPos = s7;
                      s7 = peg$c1;
                    }
                  } else {
                    peg$currPos = s7;
                    s7 = peg$c1;
                  }
                }
              } else {
                s6 = peg$c1;
              }
              if (s6 !== peg$FAILED) {
                if (input.substr(peg$currPos, 4) === peg$c9) {
                  s7 = peg$c9;
                  peg$currPos += 4;
                } else {
                  s7 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c10); }
                }
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseIndentedBlockOrExpresssion();
                  if (s8 !== peg$FAILED) {
                    s6 = [s6, s7, s8];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$c1;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$c1;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$c1;
              }
              if (s5 === peg$FAILED) {
                s5 = peg$c6;
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c11(s2, s3, s4, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 6) === peg$c12) {
          s1 = peg$c12;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c13); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseExpression();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseIndentNewline();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseBlock();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseIndentRemove();
                  if (s6 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c14(s2, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 5) === peg$c15) {
            s1 = peg$c15;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c16); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c17) {
              s1 = peg$c17;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c18); }
            }
          }
          if (s1 !== peg$FAILED) {
            s2 = peg$currPos;
            peg$silentFails++;
            s3 = peg$parseAnyIdentifier();
            peg$silentFails--;
            if (s3 === peg$FAILED) {
              s2 = peg$c19;
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
            if (s2 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c20(s1);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 7) === peg$c21) {
              s1 = peg$c21;
              peg$currPos += 7;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c22); }
            }
            if (s1 !== peg$FAILED) {
              s2 = [];
              if (peg$c23.test(input.charAt(peg$currPos))) {
                s3 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s3 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c24); }
              }
              if (s3 !== peg$FAILED) {
                while (s3 !== peg$FAILED) {
                  s2.push(s3);
                  if (peg$c23.test(input.charAt(peg$currPos))) {
                    s3 = input.charAt(peg$currPos);
                    peg$currPos++;
                  } else {
                    s3 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c24); }
                  }
                }
              } else {
                s2 = peg$c1;
              }
              if (s2 !== peg$FAILED) {
                s3 = peg$currPos;
                if (input.substr(peg$currPos, 4) === peg$c25) {
                  s4 = peg$c25;
                  peg$currPos += 4;
                } else {
                  s4 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c26); }
                }
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseIdentifier();
                  if (s5 !== peg$FAILED) {
                    s4 = [s4, s5];
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
                if (s3 === peg$FAILED) {
                  s3 = peg$c6;
                }
                if (s3 !== peg$FAILED) {
                  s4 = peg$currPos;
                  s5 = peg$parse_();
                  if (s5 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 58) {
                      s6 = peg$c27;
                      peg$currPos++;
                    } else {
                      s6 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c28); }
                    }
                    if (s6 !== peg$FAILED) {
                      s7 = peg$parse_();
                      if (s7 !== peg$FAILED) {
                        s8 = peg$parseIdentifier();
                        if (s8 !== peg$FAILED) {
                          s9 = peg$parse_();
                          if (s9 !== peg$FAILED) {
                            s10 = [];
                            s11 = peg$currPos;
                            if (input.charCodeAt(peg$currPos) === 44) {
                              s12 = peg$c29;
                              peg$currPos++;
                            } else {
                              s12 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c30); }
                            }
                            if (s12 !== peg$FAILED) {
                              s13 = peg$parse_();
                              if (s13 !== peg$FAILED) {
                                s14 = peg$parseIdentifier();
                                if (s14 !== peg$FAILED) {
                                  s15 = peg$parse_();
                                  if (s15 !== peg$FAILED) {
                                    s12 = [s12, s13, s14, s15];
                                    s11 = s12;
                                  } else {
                                    peg$currPos = s11;
                                    s11 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s11;
                                  s11 = peg$c1;
                                }
                              } else {
                                peg$currPos = s11;
                                s11 = peg$c1;
                              }
                            } else {
                              peg$currPos = s11;
                              s11 = peg$c1;
                            }
                            while (s11 !== peg$FAILED) {
                              s10.push(s11);
                              s11 = peg$currPos;
                              if (input.charCodeAt(peg$currPos) === 44) {
                                s12 = peg$c29;
                                peg$currPos++;
                              } else {
                                s12 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c30); }
                              }
                              if (s12 !== peg$FAILED) {
                                s13 = peg$parse_();
                                if (s13 !== peg$FAILED) {
                                  s14 = peg$parseIdentifier();
                                  if (s14 !== peg$FAILED) {
                                    s15 = peg$parse_();
                                    if (s15 !== peg$FAILED) {
                                      s12 = [s12, s13, s14, s15];
                                      s11 = s12;
                                    } else {
                                      peg$currPos = s11;
                                      s11 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s11;
                                    s11 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s11;
                                  s11 = peg$c1;
                                }
                              } else {
                                peg$currPos = s11;
                                s11 = peg$c1;
                              }
                            }
                            if (s10 !== peg$FAILED) {
                              s5 = [s5, s6, s7, s8, s9, s10];
                              s4 = s5;
                            } else {
                              peg$currPos = s4;
                              s4 = peg$c1;
                            }
                          } else {
                            peg$currPos = s4;
                            s4 = peg$c1;
                          }
                        } else {
                          peg$currPos = s4;
                          s4 = peg$c1;
                        }
                      } else {
                        peg$currPos = s4;
                        s4 = peg$c1;
                      }
                    } else {
                      peg$currPos = s4;
                      s4 = peg$c1;
                    }
                  } else {
                    peg$currPos = s4;
                    s4 = peg$c1;
                  }
                  if (s4 === peg$FAILED) {
                    s4 = peg$c6;
                  }
                  if (s4 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c31(s2, s3, s4);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 8) === peg$c32) {
                s1 = peg$c32;
                peg$currPos += 8;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c33); }
              }
              if (s1 !== peg$FAILED) {
                s2 = [];
                if (peg$c34.test(input.charAt(peg$currPos))) {
                  s3 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s3 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c35); }
                }
                if (s3 !== peg$FAILED) {
                  while (s3 !== peg$FAILED) {
                    s2.push(s3);
                    if (peg$c34.test(input.charAt(peg$currPos))) {
                      s3 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s3 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c35); }
                    }
                  }
                } else {
                  s2 = peg$c1;
                }
                if (s2 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c36(s2);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 7) === peg$c37) {
                  s1 = peg$c37;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c38); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$parseExpression();
                  if (s2 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c39(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.substr(peg$currPos, 6) === peg$c40) {
                    s1 = peg$c40;
                    peg$currPos += 6;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c41); }
                  }
                  if (s1 !== peg$FAILED) {
                    s2 = peg$parse_();
                    if (s2 !== peg$FAILED) {
                      s3 = peg$parseExpression();
                      if (s3 === peg$FAILED) {
                        s3 = peg$c6;
                      }
                      if (s3 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c42(s3);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 3) === peg$c43) {
                      s1 = peg$c43;
                      peg$currPos += 3;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c44); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$parseIndentNewline();
                      if (s2 !== peg$FAILED) {
                        s3 = peg$parseBlock();
                        if (s3 !== peg$FAILED) {
                          s4 = peg$parseIndentRemove();
                          if (s4 !== peg$FAILED) {
                            s5 = peg$parse__();
                            if (s5 !== peg$FAILED) {
                              if (input.substr(peg$currPos, 5) === peg$c45) {
                                s6 = peg$c45;
                                peg$currPos += 5;
                              } else {
                                s6 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c46); }
                              }
                              if (s6 !== peg$FAILED) {
                                s7 = peg$parse_();
                                if (s7 !== peg$FAILED) {
                                  s8 = peg$parseIdentifier();
                                  if (s8 !== peg$FAILED) {
                                    s9 = peg$parseIndentNewline();
                                    if (s9 !== peg$FAILED) {
                                      s10 = peg$parseBlock();
                                      if (s10 !== peg$FAILED) {
                                        s11 = peg$parseIndentRemove();
                                        if (s11 !== peg$FAILED) {
                                          peg$reportedPos = s0;
                                          s1 = peg$c47(s3, s8, s10);
                                          s0 = s1;
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.substr(peg$currPos, 5) === peg$c48) {
                        s1 = peg$c48;
                        peg$currPos += 5;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c49); }
                      }
                      if (s1 !== peg$FAILED) {
                        s2 = peg$parse_();
                        if (s2 !== peg$FAILED) {
                          s3 = peg$parseExpression();
                          if (s3 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c50(s3);
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 4) === peg$c51) {
                          s1 = peg$c51;
                          peg$currPos += 4;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c52); }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$currPos;
                          peg$silentFails++;
                          s3 = peg$parseAnyIdentifier();
                          peg$silentFails--;
                          if (s3 === peg$FAILED) {
                            s2 = peg$c19;
                          } else {
                            peg$currPos = s2;
                            s2 = peg$c1;
                          }
                          if (s2 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c53();
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                        if (s0 === peg$FAILED) {
                          s0 = peg$currPos;
                          if (input.substr(peg$currPos, 5) === peg$c54) {
                            s1 = peg$c54;
                            peg$currPos += 5;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c55); }
                          }
                          if (s1 !== peg$FAILED) {
                            s2 = peg$parse_();
                            if (s2 !== peg$FAILED) {
                              s3 = peg$parseIdentifier();
                              if (s3 !== peg$FAILED) {
                                s4 = peg$parse_();
                                if (s4 !== peg$FAILED) {
                                  s5 = peg$currPos;
                                  if (input.substr(peg$currPos, 7) === peg$c56) {
                                    s6 = peg$c56;
                                    peg$currPos += 7;
                                  } else {
                                    s6 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c57); }
                                  }
                                  if (s6 !== peg$FAILED) {
                                    s7 = peg$parse_();
                                    if (s7 !== peg$FAILED) {
                                      s8 = peg$parseAnyIdentifier();
                                      if (s8 !== peg$FAILED) {
                                        s6 = [s6, s7, s8];
                                        s5 = s6;
                                      } else {
                                        peg$currPos = s5;
                                        s5 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s5;
                                      s5 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s5;
                                    s5 = peg$c1;
                                  }
                                  if (s5 === peg$FAILED) {
                                    s5 = peg$c6;
                                  }
                                  if (s5 !== peg$FAILED) {
                                    s6 = peg$parseIndentNewline();
                                    if (s6 !== peg$FAILED) {
                                      s7 = peg$currPos;
                                      s8 = peg$parse__();
                                      if (s8 !== peg$FAILED) {
                                        s9 = peg$parseKeyValuePair();
                                        if (s9 !== peg$FAILED) {
                                          s8 = [s8, s9];
                                          s7 = s8;
                                        } else {
                                          peg$currPos = s7;
                                          s7 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s7;
                                        s7 = peg$c1;
                                      }
                                      if (s7 === peg$FAILED) {
                                        s7 = peg$parseComment();
                                      }
                                      if (s7 !== peg$FAILED) {
                                        s8 = [];
                                        s9 = peg$currPos;
                                        s10 = [];
                                        s11 = peg$currPos;
                                        s12 = peg$parseEOL();
                                        if (s12 !== peg$FAILED) {
                                          s13 = peg$parseIndent();
                                          if (s13 !== peg$FAILED) {
                                            s12 = [s12, s13];
                                            s11 = s12;
                                          } else {
                                            peg$currPos = s11;
                                            s11 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s11;
                                          s11 = peg$c1;
                                        }
                                        if (s11 !== peg$FAILED) {
                                          while (s11 !== peg$FAILED) {
                                            s10.push(s11);
                                            s11 = peg$currPos;
                                            s12 = peg$parseEOL();
                                            if (s12 !== peg$FAILED) {
                                              s13 = peg$parseIndent();
                                              if (s13 !== peg$FAILED) {
                                                s12 = [s12, s13];
                                                s11 = s12;
                                              } else {
                                                peg$currPos = s11;
                                                s11 = peg$c1;
                                              }
                                            } else {
                                              peg$currPos = s11;
                                              s11 = peg$c1;
                                            }
                                          }
                                        } else {
                                          s10 = peg$c1;
                                        }
                                        if (s10 !== peg$FAILED) {
                                          s11 = peg$parseKeyValuePair();
                                          if (s11 === peg$FAILED) {
                                            s11 = peg$parseComment();
                                          }
                                          if (s11 !== peg$FAILED) {
                                            s10 = [s10, s11];
                                            s9 = s10;
                                          } else {
                                            peg$currPos = s9;
                                            s9 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s9;
                                          s9 = peg$c1;
                                        }
                                        while (s9 !== peg$FAILED) {
                                          s8.push(s9);
                                          s9 = peg$currPos;
                                          s10 = [];
                                          s11 = peg$currPos;
                                          s12 = peg$parseEOL();
                                          if (s12 !== peg$FAILED) {
                                            s13 = peg$parseIndent();
                                            if (s13 !== peg$FAILED) {
                                              s12 = [s12, s13];
                                              s11 = s12;
                                            } else {
                                              peg$currPos = s11;
                                              s11 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s11;
                                            s11 = peg$c1;
                                          }
                                          if (s11 !== peg$FAILED) {
                                            while (s11 !== peg$FAILED) {
                                              s10.push(s11);
                                              s11 = peg$currPos;
                                              s12 = peg$parseEOL();
                                              if (s12 !== peg$FAILED) {
                                                s13 = peg$parseIndent();
                                                if (s13 !== peg$FAILED) {
                                                  s12 = [s12, s13];
                                                  s11 = s12;
                                                } else {
                                                  peg$currPos = s11;
                                                  s11 = peg$c1;
                                                }
                                              } else {
                                                peg$currPos = s11;
                                                s11 = peg$c1;
                                              }
                                            }
                                          } else {
                                            s10 = peg$c1;
                                          }
                                          if (s10 !== peg$FAILED) {
                                            s11 = peg$parseKeyValuePair();
                                            if (s11 === peg$FAILED) {
                                              s11 = peg$parseComment();
                                            }
                                            if (s11 !== peg$FAILED) {
                                              s10 = [s10, s11];
                                              s9 = s10;
                                            } else {
                                              peg$currPos = s9;
                                              s9 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s9;
                                            s9 = peg$c1;
                                          }
                                        }
                                        if (s8 !== peg$FAILED) {
                                          s9 = peg$parseIndentRemove();
                                          if (s9 !== peg$FAILED) {
                                            peg$reportedPos = s0;
                                            s1 = peg$c58(s3, s5, s7, s8);
                                            s0 = s1;
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                          if (s0 === peg$FAILED) {
                            s0 = peg$parseForStatement();
                            if (s0 === peg$FAILED) {
                              s0 = peg$parseAssign();
                              if (s0 === peg$FAILED) {
                                s0 = peg$parseExpression();
                                if (s0 === peg$FAILED) {
                                  s0 = peg$parseComment();
                                  if (s0 === peg$FAILED) {
                                    s0 = peg$currPos;
                                    s1 = [];
                                    if (s1 !== peg$FAILED) {
                                      peg$reportedPos = s0;
                                      s1 = peg$c53();
                                    }
                                    s0 = s1;
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseForStatement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11, s12;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c59) {
        s1 = peg$c59;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c60); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parseIdentifier();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s4 = peg$c29;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c6;
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseIdentifier();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c61) {
                  s6 = peg$c61;
                  peg$currPos += 2;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c62); }
                }
                if (s6 === peg$FAILED) {
                  if (input.substr(peg$currPos, 2) === peg$c63) {
                    s6 = peg$c63;
                    peg$currPos += 2;
                  } else {
                    s6 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c64); }
                  }
                }
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$parseRange();
                    if (s8 === peg$FAILED) {
                      s8 = peg$parseExpression();
                    }
                    if (s8 !== peg$FAILED) {
                      s9 = peg$currPos;
                      s10 = peg$parseIndentNewline();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parseBlock();
                        if (s11 !== peg$FAILED) {
                          s12 = peg$parseIndentRemove();
                          if (s12 !== peg$FAILED) {
                            peg$reportedPos = s9;
                            s10 = peg$c65(s11);
                            s9 = s10;
                          } else {
                            peg$currPos = s9;
                            s9 = peg$c1;
                          }
                        } else {
                          peg$currPos = s9;
                          s9 = peg$c1;
                        }
                      } else {
                        peg$currPos = s9;
                        s9 = peg$c1;
                      }
                      if (s9 === peg$FAILED) {
                        s9 = peg$currPos;
                        s10 = peg$parseEOL();
                        if (s10 !== peg$FAILED) {
                          s11 = peg$parseIndent();
                          if (s11 !== peg$FAILED) {
                            s12 = peg$parseForStatement();
                            if (s12 !== peg$FAILED) {
                              peg$reportedPos = s9;
                              s10 = peg$c65(s12);
                              s9 = s10;
                            } else {
                              peg$currPos = s9;
                              s9 = peg$c1;
                            }
                          } else {
                            peg$currPos = s9;
                            s9 = peg$c1;
                          }
                        } else {
                          peg$currPos = s9;
                          s9 = peg$c1;
                        }
                      }
                      if (s9 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c66(s2, s4, s6, s8, s9);
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIndentedBlockOrThenPlusExpresssion() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseIndentNewline();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseBlock();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIndentRemove();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c67(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c68) {
            s2 = peg$c68;
            peg$currPos += 4;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c69); }
          }
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              s4 = peg$parseStatement();
              if (s4 !== peg$FAILED) {
                s5 = peg$parse_();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c70(s4);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseIndentedBlockOrExpresssion() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseIndentNewline();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseBlock();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIndentRemove();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c67(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parse_();
        if (s1 !== peg$FAILED) {
          s2 = peg$parseStatement();
          if (s2 !== peg$FAILED) {
            s3 = peg$parse_();
            if (s3 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c70(s2);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseEOL() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c71) {
        s0 = peg$c71;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c72); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 10) {
          s0 = peg$c73;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c74); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s0 = peg$c75;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c76); }
          }
        }
      }

      return s0;
    }

    function peg$parseIndent() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c77.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c78); }
      }
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        if (peg$c77.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c78); }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = peg$currPos;
        s2 = peg$c79(s1);
        if (s2) {
          s2 = peg$c19;
        } else {
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIndentNewline() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseEOL();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseIndentAdd();
          if (s3 !== peg$FAILED) {
            s4 = peg$parseIndent();
            if (s4 !== peg$FAILED) {
              s1 = [s1, s2, s3, s4];
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIndentAdd() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c77.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c78); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c77.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c78); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = peg$currPos;
        s2 = peg$c80(s1);
        if (s2) {
          s2 = peg$c19;
        } else {
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c81(s1);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIndentRemove() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = [];
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c82();
      }
      s0 = s1;

      return s0;
    }

    function peg$parseComment() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 35) {
        s1 = peg$c83;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c84); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = [];
        s4 = peg$currPos;
        s5 = peg$currPos;
        peg$silentFails++;
        s6 = peg$parseEOL();
        peg$silentFails--;
        if (s6 === peg$FAILED) {
          s5 = peg$c19;
        } else {
          peg$currPos = s5;
          s5 = peg$c1;
        }
        if (s5 !== peg$FAILED) {
          if (input.length > peg$currPos) {
            s6 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s6 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c85); }
          }
          if (s6 !== peg$FAILED) {
            s5 = [s5, s6];
            s4 = s5;
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
        } else {
          peg$currPos = s4;
          s4 = peg$c1;
        }
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$currPos;
          s5 = peg$currPos;
          peg$silentFails++;
          s6 = peg$parseEOL();
          peg$silentFails--;
          if (s6 === peg$FAILED) {
            s5 = peg$c19;
          } else {
            peg$currPos = s5;
            s5 = peg$c1;
          }
          if (s5 !== peg$FAILED) {
            if (input.length > peg$currPos) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c85); }
            }
            if (s6 !== peg$FAILED) {
              s5 = [s5, s6];
              s4 = s5;
            } else {
              peg$currPos = s4;
              s4 = peg$c1;
            }
          } else {
            peg$currPos = s4;
            s4 = peg$c1;
          }
        }
        if (s3 !== peg$FAILED) {
          s3 = input.substring(s2, peg$currPos);
        }
        s2 = s3;
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c86(s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseAssign() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseIdentifier();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseAssignmentOperator();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpression();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c87(s1, s3, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parseExpression();
        if (s1 !== peg$FAILED) {
          s2 = peg$parse_();
          if (s2 !== peg$FAILED) {
            s3 = peg$parseAssignmentOperator();
            if (s3 !== peg$FAILED) {
              s4 = peg$parse_();
              if (s4 !== peg$FAILED) {
                s5 = peg$parseExpression();
                if (s5 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c87(s1, s3, s5);
                  s0 = s1;
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          s1 = peg$parseThisProperty();
          if (s1 !== peg$FAILED) {
            s2 = peg$parse_();
            if (s2 !== peg$FAILED) {
              s3 = peg$parseAssignmentOperator();
              if (s3 !== peg$FAILED) {
                s4 = peg$parse_();
                if (s4 !== peg$FAILED) {
                  s5 = peg$parseExpression();
                  if (s5 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c87(s1, s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        }
      }

      return s0;
    }

    function peg$parseAssignmentOperator() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s1 = peg$c88;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c89); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        if (input.charCodeAt(peg$currPos) === 61) {
          s3 = peg$c88;
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c89); }
        }
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c19;
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c90();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c91) {
          s0 = peg$c91;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c92); }
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c93) {
            s0 = peg$c93;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c94); }
          }
          if (s0 === peg$FAILED) {
            if (input.substr(peg$currPos, 2) === peg$c95) {
              s0 = peg$c95;
              peg$currPos += 2;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c96); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c97) {
                s0 = peg$c97;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c98); }
              }
              if (s0 === peg$FAILED) {
                if (input.substr(peg$currPos, 2) === peg$c99) {
                  s0 = peg$c99;
                  peg$currPos += 2;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c100); }
                }
                if (s0 === peg$FAILED) {
                  if (input.substr(peg$currPos, 3) === peg$c101) {
                    s0 = peg$c101;
                    peg$currPos += 3;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c102); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.substr(peg$currPos, 3) === peg$c103) {
                      s0 = peg$c103;
                      peg$currPos += 3;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c104); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 4) === peg$c105) {
                        s0 = peg$c105;
                        peg$currPos += 4;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c106); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 2) === peg$c107) {
                          s0 = peg$c107;
                          peg$currPos += 2;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c108); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c109) {
                            s0 = peg$c109;
                            peg$currPos += 2;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c110); }
                          }
                          if (s0 === peg$FAILED) {
                            if (input.substr(peg$currPos, 2) === peg$c111) {
                              s0 = peg$c111;
                              peg$currPos += 2;
                            } else {
                              s0 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c112); }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseBinaryOperator() {
      var s0, s1, s2, s3;

      if (input.charCodeAt(peg$currPos) === 43) {
        s0 = peg$c113;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c114); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 45) {
          s0 = peg$c115;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c116); }
        }
        if (s0 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 42) {
            s0 = peg$c117;
            peg$currPos++;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c118); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 47) {
              s0 = peg$c119;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c120); }
            }
            if (s0 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 37) {
                s0 = peg$c121;
                peg$currPos++;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c122); }
              }
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 38) {
                  s0 = peg$c123;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c124); }
                }
                if (s0 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 124) {
                    s0 = peg$c125;
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c126); }
                  }
                  if (s0 === peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 94) {
                      s0 = peg$c127;
                      peg$currPos++;
                    } else {
                      s0 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c128); }
                    }
                    if (s0 === peg$FAILED) {
                      if (input.substr(peg$currPos, 2) === peg$c129) {
                        s0 = peg$c129;
                        peg$currPos += 2;
                      } else {
                        s0 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c130); }
                      }
                      if (s0 === peg$FAILED) {
                        if (input.substr(peg$currPos, 3) === peg$c131) {
                          s0 = peg$c131;
                          peg$currPos += 3;
                        } else {
                          s0 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c132); }
                        }
                        if (s0 === peg$FAILED) {
                          if (input.substr(peg$currPos, 2) === peg$c133) {
                            s0 = peg$c133;
                            peg$currPos += 2;
                          } else {
                            s0 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c134); }
                          }
                          if (s0 === peg$FAILED) {
                            s0 = peg$currPos;
                            if (input.substr(peg$currPos, 2) === peg$c135) {
                              s1 = peg$c135;
                              peg$currPos += 2;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c136); }
                            }
                            if (s1 !== peg$FAILED) {
                              peg$reportedPos = s0;
                              s1 = peg$c137();
                            }
                            s0 = s1;
                            if (s0 === peg$FAILED) {
                              s0 = peg$currPos;
                              if (input.substr(peg$currPos, 2) === peg$c138) {
                                s1 = peg$c138;
                                peg$currPos += 2;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c139); }
                              }
                              if (s1 !== peg$FAILED) {
                                peg$reportedPos = s0;
                                s1 = peg$c140();
                              }
                              s0 = s1;
                              if (s0 === peg$FAILED) {
                                if (input.substr(peg$currPos, 2) === peg$c141) {
                                  s0 = peg$c141;
                                  peg$currPos += 2;
                                } else {
                                  s0 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c142); }
                                }
                                if (s0 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 2) === peg$c143) {
                                    s0 = peg$c143;
                                    peg$currPos += 2;
                                  } else {
                                    s0 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c144); }
                                  }
                                  if (s0 === peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 60) {
                                      s0 = peg$c145;
                                      peg$currPos++;
                                    } else {
                                      s0 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c146); }
                                    }
                                    if (s0 === peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 62) {
                                        s0 = peg$c147;
                                        peg$currPos++;
                                      } else {
                                        s0 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c148); }
                                      }
                                      if (s0 === peg$FAILED) {
                                        s0 = peg$currPos;
                                        if (input.substr(peg$currPos, 3) === peg$c149) {
                                          s1 = peg$c149;
                                          peg$currPos += 3;
                                        } else {
                                          s1 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c150); }
                                        }
                                        if (s1 !== peg$FAILED) {
                                          s2 = peg$currPos;
                                          peg$silentFails++;
                                          s3 = peg$parseIdentifierPart();
                                          peg$silentFails--;
                                          if (s3 === peg$FAILED) {
                                            s2 = peg$c19;
                                          } else {
                                            peg$currPos = s2;
                                            s2 = peg$c1;
                                          }
                                          if (s2 !== peg$FAILED) {
                                            peg$reportedPos = s0;
                                            s1 = peg$c151();
                                            s0 = s1;
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                        if (s0 === peg$FAILED) {
                                          s0 = peg$currPos;
                                          if (input.substr(peg$currPos, 2) === peg$c152) {
                                            s1 = peg$c152;
                                            peg$currPos += 2;
                                          } else {
                                            s1 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c153); }
                                          }
                                          if (s1 !== peg$FAILED) {
                                            s2 = peg$currPos;
                                            peg$silentFails++;
                                            s3 = peg$parseIdentifierPart();
                                            peg$silentFails--;
                                            if (s3 === peg$FAILED) {
                                              s2 = peg$c19;
                                            } else {
                                              peg$currPos = s2;
                                              s2 = peg$c1;
                                            }
                                            if (s2 !== peg$FAILED) {
                                              peg$reportedPos = s0;
                                              s1 = peg$c154();
                                              s0 = s1;
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                          if (s0 === peg$FAILED) {
                                            s0 = peg$currPos;
                                            if (input.substr(peg$currPos, 10) === peg$c155) {
                                              s1 = peg$c155;
                                              peg$currPos += 10;
                                            } else {
                                              s1 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c156); }
                                            }
                                            if (s1 !== peg$FAILED) {
                                              s2 = peg$currPos;
                                              peg$silentFails++;
                                              s3 = peg$parseIdentifierPart();
                                              peg$silentFails--;
                                              if (s3 === peg$FAILED) {
                                                s2 = peg$c19;
                                              } else {
                                                peg$currPos = s2;
                                                s2 = peg$c1;
                                              }
                                              if (s2 !== peg$FAILED) {
                                                peg$reportedPos = s0;
                                                s1 = peg$c157();
                                                s0 = s1;
                                              } else {
                                                peg$currPos = s0;
                                                s0 = peg$c1;
                                              }
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                            if (s0 === peg$FAILED) {
                                              s0 = peg$currPos;
                                              if (input.substr(peg$currPos, 2) === peg$c61) {
                                                s1 = peg$c61;
                                                peg$currPos += 2;
                                              } else {
                                                s1 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c62); }
                                              }
                                              if (s1 !== peg$FAILED) {
                                                s2 = peg$currPos;
                                                peg$silentFails++;
                                                s3 = peg$parseIdentifierPart();
                                                peg$silentFails--;
                                                if (s3 === peg$FAILED) {
                                                  s2 = peg$c19;
                                                } else {
                                                  peg$currPos = s2;
                                                  s2 = peg$c1;
                                                }
                                                if (s2 !== peg$FAILED) {
                                                  peg$reportedPos = s0;
                                                  s1 = peg$c158();
                                                  s0 = s1;
                                                } else {
                                                  peg$currPos = s0;
                                                  s0 = peg$c1;
                                                }
                                              } else {
                                                peg$currPos = s0;
                                                s0 = peg$c1;
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseUnaryOperator() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c159) {
        s1 = peg$c159;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c160); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c19;
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c161();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 6) === peg$c162) {
          s1 = peg$c162;
          peg$currPos += 6;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c163); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$currPos;
          peg$silentFails++;
          s3 = peg$parseIdentifierPart();
          peg$silentFails--;
          if (s3 === peg$FAILED) {
            s2 = peg$c19;
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c164();
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
        if (s0 === peg$FAILED) {
          if (input.substr(peg$currPos, 2) === peg$c165) {
            s0 = peg$c165;
            peg$currPos += 2;
          } else {
            s0 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c166); }
          }
          if (s0 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 43) {
              s0 = peg$c113;
              peg$currPos++;
            } else {
              s0 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c114); }
            }
            if (s0 === peg$FAILED) {
              if (input.substr(peg$currPos, 2) === peg$c167) {
                s0 = peg$c167;
                peg$currPos += 2;
              } else {
                s0 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c168); }
              }
              if (s0 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 45) {
                  s0 = peg$c115;
                  peg$currPos++;
                } else {
                  s0 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c116); }
                }
                if (s0 === peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 126) {
                    s0 = peg$c169;
                    peg$currPos++;
                  } else {
                    s0 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c170); }
                  }
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.substr(peg$currPos, 3) === peg$c171) {
                      s1 = peg$c171;
                      peg$currPos += 3;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c172); }
                    }
                    if (s1 !== peg$FAILED) {
                      s2 = peg$currPos;
                      peg$silentFails++;
                      s3 = peg$parseIdentifierPart();
                      peg$silentFails--;
                      if (s3 === peg$FAILED) {
                        s2 = peg$c19;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c1;
                      }
                      if (s2 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c173();
                        s0 = s1;
                      } else {
                        peg$currPos = s0;
                        s0 = peg$c1;
                      }
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsePostfixOperator() {
      var s0;

      if (input.substr(peg$currPos, 2) === peg$c165) {
        s0 = peg$c165;
        peg$currPos += 2;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c166); }
      }
      if (s0 === peg$FAILED) {
        if (input.substr(peg$currPos, 2) === peg$c167) {
          s0 = peg$c167;
          peg$currPos += 2;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c168); }
        }
      }

      return s0;
    }

    function peg$parseExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      s1 = peg$parseBinaryExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse__();
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 63) {
            s4 = peg$c174;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c175); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse__();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseExpression();
              if (s6 !== peg$FAILED) {
                s7 = peg$parse__();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 58) {
                    s8 = peg$c27;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c28); }
                  }
                  if (s8 !== peg$FAILED) {
                    s9 = peg$parse__();
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parseExpression();
                      if (s10 !== peg$FAILED) {
                        s3 = [s3, s4, s5, s6, s7, s8, s9, s10];
                        s2 = s3;
                      } else {
                        peg$currPos = s2;
                        s2 = peg$c1;
                      }
                    } else {
                      peg$currPos = s2;
                      s2 = peg$c1;
                    }
                  } else {
                    peg$currPos = s2;
                    s2 = peg$c1;
                  }
                } else {
                  peg$currPos = s2;
                  s2 = peg$c1;
                }
              } else {
                peg$currPos = s2;
                s2 = peg$c1;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c6;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c176(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseBinaryExpression() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      s1 = peg$parsePostfixExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        s3 = peg$parse__();
        if (s3 !== peg$FAILED) {
          s4 = peg$parseBinaryOperator();
          if (s4 !== peg$FAILED) {
            s5 = peg$parse__();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseExpression();
              if (s6 !== peg$FAILED) {
                s3 = [s3, s4, s5, s6];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$c1;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 === peg$FAILED) {
          s2 = peg$c6;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c177(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parsePostfixExpression() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseFunctionExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsePostfixOperator();
          if (s3 === peg$FAILED) {
            s3 = peg$c6;
          }
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c178(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseFunctionExpression() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parseValue();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 91) {
          s4 = peg$c179;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c180); }
        }
        if (s4 !== peg$FAILED) {
          s5 = peg$parse__();
          if (s5 !== peg$FAILED) {
            s6 = peg$parseExpression();
            if (s6 !== peg$FAILED) {
              s7 = peg$parse__();
              if (s7 !== peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 93) {
                  s8 = peg$c181;
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c182); }
                }
                if (s8 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c183(s6);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        if (s3 === peg$FAILED) {
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s5 = peg$c184;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c185); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseFunctionExpression();
                if (s7 === peg$FAILED) {
                  s7 = peg$parseIdentifierPart();
                }
                if (s7 !== peg$FAILED) {
                  peg$reportedPos = s3;
                  s4 = peg$c186(s7);
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 40) {
              s4 = peg$c187;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c188); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse__();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseExpressionTuple();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse__();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 41) {
                      s8 = peg$c189;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c190); }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s3;
                      s4 = peg$c191(s6);
                      s3 = s4;
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c1;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          }
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 91) {
            s4 = peg$c179;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c180); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse__();
            if (s5 !== peg$FAILED) {
              s6 = peg$parseExpression();
              if (s6 !== peg$FAILED) {
                s7 = peg$parse__();
                if (s7 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 93) {
                    s8 = peg$c181;
                    peg$currPos++;
                  } else {
                    s8 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c182); }
                  }
                  if (s8 !== peg$FAILED) {
                    peg$reportedPos = s3;
                    s4 = peg$c183(s6);
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$currPos;
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 46) {
                s5 = peg$c184;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c185); }
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse__();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parseFunctionExpression();
                  if (s7 === peg$FAILED) {
                    s7 = peg$parseIdentifierPart();
                  }
                  if (s7 !== peg$FAILED) {
                    peg$reportedPos = s3;
                    s4 = peg$c186(s7);
                    s3 = s4;
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
            if (s3 === peg$FAILED) {
              s3 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 40) {
                s4 = peg$c187;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c188); }
              }
              if (s4 !== peg$FAILED) {
                s5 = peg$parse__();
                if (s5 !== peg$FAILED) {
                  s6 = peg$parseExpressionTuple();
                  if (s6 !== peg$FAILED) {
                    s7 = peg$parse__();
                    if (s7 !== peg$FAILED) {
                      if (input.charCodeAt(peg$currPos) === 41) {
                        s8 = peg$c189;
                        peg$currPos++;
                      } else {
                        s8 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c190); }
                      }
                      if (s8 !== peg$FAILED) {
                        peg$reportedPos = s3;
                        s4 = peg$c191(s6);
                        s3 = s4;
                      } else {
                        peg$currPos = s3;
                        s3 = peg$c1;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$c1;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$c1;
                  }
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            }
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c192(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseValue() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10;

      s0 = peg$currPos;
      s1 = peg$parseUnaryOperator();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpression();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c193(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseHexNumber();
        if (s0 === peg$FAILED) {
          s0 = peg$parseNumber();
          if (s0 === peg$FAILED) {
            s0 = peg$parseLiteral();
            if (s0 === peg$FAILED) {
              s0 = peg$parseThisProperty();
              if (s0 === peg$FAILED) {
                s0 = peg$parseThisToken();
                if (s0 === peg$FAILED) {
                  s0 = peg$parseStringLiteral();
                  if (s0 === peg$FAILED) {
                    s0 = peg$parseRegularExpressionLiteral();
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      s1 = peg$parseIdentifier();
                      if (s1 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c194(s1);
                      }
                      s0 = s1;
                      if (s0 === peg$FAILED) {
                        s0 = peg$currPos;
                        if (input.substr(peg$currPos, 5) === peg$c195) {
                          s1 = peg$c195;
                          peg$currPos += 5;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c196); }
                        }
                        if (s1 !== peg$FAILED) {
                          s2 = peg$currPos;
                          peg$silentFails++;
                          s3 = peg$parseIdentifierPart();
                          peg$silentFails--;
                          if (s3 === peg$FAILED) {
                            s2 = peg$c19;
                          } else {
                            peg$currPos = s2;
                            s2 = peg$c1;
                          }
                          if (s2 !== peg$FAILED) {
                            peg$reportedPos = s0;
                            s1 = peg$c197();
                            s0 = s1;
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                        } else {
                          peg$currPos = s0;
                          s0 = peg$c1;
                        }
                        if (s0 === peg$FAILED) {
                          s0 = peg$currPos;
                          if (input.substr(peg$currPos, 3) === peg$c198) {
                            s1 = peg$c198;
                            peg$currPos += 3;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c199); }
                          }
                          if (s1 !== peg$FAILED) {
                            s2 = peg$parse_();
                            if (s2 !== peg$FAILED) {
                              s3 = peg$parseExpression();
                              if (s3 !== peg$FAILED) {
                                peg$reportedPos = s0;
                                s1 = peg$c200(s3);
                                s0 = s1;
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                          } else {
                            peg$currPos = s0;
                            s0 = peg$c1;
                          }
                          if (s0 === peg$FAILED) {
                            s0 = peg$currPos;
                            if (input.charCodeAt(peg$currPos) === 91) {
                              s1 = peg$c179;
                              peg$currPos++;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c180); }
                            }
                            if (s1 !== peg$FAILED) {
                              s2 = peg$parse__();
                              if (s2 !== peg$FAILED) {
                                s3 = peg$parseExpression();
                                if (s3 === peg$FAILED) {
                                  s3 = peg$c6;
                                }
                                if (s3 !== peg$FAILED) {
                                  s4 = [];
                                  s5 = peg$currPos;
                                  s6 = peg$parse__();
                                  if (s6 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 44) {
                                      s7 = peg$c29;
                                      peg$currPos++;
                                    } else {
                                      s7 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                    }
                                    if (s7 !== peg$FAILED) {
                                      s8 = peg$parse__();
                                      if (s8 !== peg$FAILED) {
                                        s9 = peg$parseExpression();
                                        if (s9 !== peg$FAILED) {
                                          s6 = [s6, s7, s8, s9];
                                          s5 = s6;
                                        } else {
                                          peg$currPos = s5;
                                          s5 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s5;
                                        s5 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s5;
                                      s5 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s5;
                                    s5 = peg$c1;
                                  }
                                  while (s5 !== peg$FAILED) {
                                    s4.push(s5);
                                    s5 = peg$currPos;
                                    s6 = peg$parse__();
                                    if (s6 !== peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 44) {
                                        s7 = peg$c29;
                                        peg$currPos++;
                                      } else {
                                        s7 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                      }
                                      if (s7 !== peg$FAILED) {
                                        s8 = peg$parse__();
                                        if (s8 !== peg$FAILED) {
                                          s9 = peg$parseExpression();
                                          if (s9 !== peg$FAILED) {
                                            s6 = [s6, s7, s8, s9];
                                            s5 = s6;
                                          } else {
                                            peg$currPos = s5;
                                            s5 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s5;
                                          s5 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s5;
                                        s5 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s5;
                                      s5 = peg$c1;
                                    }
                                  }
                                  if (s4 !== peg$FAILED) {
                                    s5 = peg$parse__();
                                    if (s5 !== peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 44) {
                                        s6 = peg$c29;
                                        peg$currPos++;
                                      } else {
                                        s6 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                      }
                                      if (s6 === peg$FAILED) {
                                        s6 = peg$c6;
                                      }
                                      if (s6 !== peg$FAILED) {
                                        s7 = peg$parse__();
                                        if (s7 !== peg$FAILED) {
                                          if (input.charCodeAt(peg$currPos) === 93) {
                                            s8 = peg$c181;
                                            peg$currPos++;
                                          } else {
                                            s8 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c182); }
                                          }
                                          if (s8 !== peg$FAILED) {
                                            peg$reportedPos = s0;
                                            s1 = peg$c201(s3, s4);
                                            s0 = s1;
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                            } else {
                              peg$currPos = s0;
                              s0 = peg$c1;
                            }
                            if (s0 === peg$FAILED) {
                              s0 = peg$currPos;
                              if (input.charCodeAt(peg$currPos) === 123) {
                                s1 = peg$c202;
                                peg$currPos++;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c203); }
                              }
                              if (s1 !== peg$FAILED) {
                                s2 = peg$currPos;
                                s3 = peg$parse__();
                                if (s3 !== peg$FAILED) {
                                  s4 = peg$parseAnyKeyValuePair();
                                  if (s4 !== peg$FAILED) {
                                    s3 = [s3, s4];
                                    s2 = s3;
                                  } else {
                                    peg$currPos = s2;
                                    s2 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s2;
                                  s2 = peg$c1;
                                }
                                if (s2 === peg$FAILED) {
                                  s2 = peg$c6;
                                }
                                if (s2 !== peg$FAILED) {
                                  s3 = [];
                                  s4 = peg$currPos;
                                  s5 = peg$parse__();
                                  if (s5 !== peg$FAILED) {
                                    if (input.charCodeAt(peg$currPos) === 44) {
                                      s6 = peg$c29;
                                      peg$currPos++;
                                    } else {
                                      s6 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                    }
                                    if (s6 === peg$FAILED) {
                                      s6 = peg$c6;
                                    }
                                    if (s6 !== peg$FAILED) {
                                      s7 = peg$parse__();
                                      if (s7 !== peg$FAILED) {
                                        s8 = peg$parseAnyKeyValuePair();
                                        if (s8 !== peg$FAILED) {
                                          s5 = [s5, s6, s7, s8];
                                          s4 = s5;
                                        } else {
                                          peg$currPos = s4;
                                          s4 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s4;
                                        s4 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s4;
                                      s4 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s4;
                                    s4 = peg$c1;
                                  }
                                  while (s4 !== peg$FAILED) {
                                    s3.push(s4);
                                    s4 = peg$currPos;
                                    s5 = peg$parse__();
                                    if (s5 !== peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 44) {
                                        s6 = peg$c29;
                                        peg$currPos++;
                                      } else {
                                        s6 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                      }
                                      if (s6 === peg$FAILED) {
                                        s6 = peg$c6;
                                      }
                                      if (s6 !== peg$FAILED) {
                                        s7 = peg$parse__();
                                        if (s7 !== peg$FAILED) {
                                          s8 = peg$parseAnyKeyValuePair();
                                          if (s8 !== peg$FAILED) {
                                            s5 = [s5, s6, s7, s8];
                                            s4 = s5;
                                          } else {
                                            peg$currPos = s4;
                                            s4 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s4;
                                          s4 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s4;
                                        s4 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s4;
                                      s4 = peg$c1;
                                    }
                                  }
                                  if (s3 !== peg$FAILED) {
                                    s4 = peg$parse__();
                                    if (s4 !== peg$FAILED) {
                                      if (input.charCodeAt(peg$currPos) === 44) {
                                        s5 = peg$c29;
                                        peg$currPos++;
                                      } else {
                                        s5 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c30); }
                                      }
                                      if (s5 === peg$FAILED) {
                                        s5 = peg$c6;
                                      }
                                      if (s5 !== peg$FAILED) {
                                        s6 = peg$parse__();
                                        if (s6 !== peg$FAILED) {
                                          if (input.charCodeAt(peg$currPos) === 125) {
                                            s7 = peg$c204;
                                            peg$currPos++;
                                          } else {
                                            s7 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c205); }
                                          }
                                          if (s7 !== peg$FAILED) {
                                            peg$reportedPos = s0;
                                            s1 = peg$c206(s2, s3);
                                            s0 = s1;
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                              } else {
                                peg$currPos = s0;
                                s0 = peg$c1;
                              }
                              if (s0 === peg$FAILED) {
                                s0 = peg$currPos;
                                if (input.charCodeAt(peg$currPos) === 40) {
                                  s1 = peg$c187;
                                  peg$currPos++;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c188); }
                                }
                                if (s1 !== peg$FAILED) {
                                  s2 = peg$parse_();
                                  if (s2 !== peg$FAILED) {
                                    s3 = peg$parseIdentifierTuple();
                                    if (s3 !== peg$FAILED) {
                                      s4 = peg$parse_();
                                      if (s4 !== peg$FAILED) {
                                        if (input.charCodeAt(peg$currPos) === 41) {
                                          s5 = peg$c189;
                                          peg$currPos++;
                                        } else {
                                          s5 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c190); }
                                        }
                                        if (s5 !== peg$FAILED) {
                                          s6 = peg$parse_();
                                          if (s6 !== peg$FAILED) {
                                            if (input.substr(peg$currPos, 2) === peg$c207) {
                                              s7 = peg$c207;
                                              peg$currPos += 2;
                                            } else {
                                              s7 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c208); }
                                            }
                                            if (s7 !== peg$FAILED) {
                                              s8 = peg$parseIndentNewline();
                                              if (s8 !== peg$FAILED) {
                                                s9 = peg$parseBlock();
                                                if (s9 !== peg$FAILED) {
                                                  s10 = peg$parseIndentRemove();
                                                  if (s10 !== peg$FAILED) {
                                                    peg$reportedPos = s0;
                                                    s1 = peg$c209(s3, s9);
                                                    s0 = s1;
                                                  } else {
                                                    peg$currPos = s0;
                                                    s0 = peg$c1;
                                                  }
                                                } else {
                                                  peg$currPos = s0;
                                                  s0 = peg$c1;
                                                }
                                              } else {
                                                peg$currPos = s0;
                                                s0 = peg$c1;
                                              }
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                } else {
                                  peg$currPos = s0;
                                  s0 = peg$c1;
                                }
                                if (s0 === peg$FAILED) {
                                  s0 = peg$currPos;
                                  if (input.charCodeAt(peg$currPos) === 40) {
                                    s1 = peg$c187;
                                    peg$currPos++;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c188); }
                                  }
                                  if (s1 !== peg$FAILED) {
                                    s2 = peg$parse_();
                                    if (s2 !== peg$FAILED) {
                                      s3 = peg$parseIdentifierTuple();
                                      if (s3 !== peg$FAILED) {
                                        s4 = peg$parse_();
                                        if (s4 !== peg$FAILED) {
                                          if (input.charCodeAt(peg$currPos) === 41) {
                                            s5 = peg$c189;
                                            peg$currPos++;
                                          } else {
                                            s5 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c190); }
                                          }
                                          if (s5 !== peg$FAILED) {
                                            s6 = peg$parse_();
                                            if (s6 !== peg$FAILED) {
                                              if (input.substr(peg$currPos, 2) === peg$c207) {
                                                s7 = peg$c207;
                                                peg$currPos += 2;
                                              } else {
                                                s7 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c208); }
                                              }
                                              if (s7 !== peg$FAILED) {
                                                s8 = peg$parse_();
                                                if (s8 !== peg$FAILED) {
                                                  s9 = peg$parseStatement();
                                                  if (s9 !== peg$FAILED) {
                                                    peg$reportedPos = s0;
                                                    s1 = peg$c210(s3, s9);
                                                    s0 = s1;
                                                  } else {
                                                    peg$currPos = s0;
                                                    s0 = peg$c1;
                                                  }
                                                } else {
                                                  peg$currPos = s0;
                                                  s0 = peg$c1;
                                                }
                                              } else {
                                                peg$currPos = s0;
                                                s0 = peg$c1;
                                              }
                                            } else {
                                              peg$currPos = s0;
                                              s0 = peg$c1;
                                            }
                                          } else {
                                            peg$currPos = s0;
                                            s0 = peg$c1;
                                          }
                                        } else {
                                          peg$currPos = s0;
                                          s0 = peg$c1;
                                        }
                                      } else {
                                        peg$currPos = s0;
                                        s0 = peg$c1;
                                      }
                                    } else {
                                      peg$currPos = s0;
                                      s0 = peg$c1;
                                    }
                                  } else {
                                    peg$currPos = s0;
                                    s0 = peg$c1;
                                  }
                                  if (s0 === peg$FAILED) {
                                    s0 = peg$parseGroupedExpression();
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseKeyValuePair() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$parseIdentifier();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c27;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c28); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpression();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c211(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseAnyKeyValuePair() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseIdentifierPart();
      if (s2 !== peg$FAILED) {
        peg$reportedPos = s1;
        s2 = peg$c212(s2);
      }
      s1 = s2;
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 34) {
          s2 = peg$c213;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c214); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseDoubleStringCharacter();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseDoubleStringCharacter();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 34) {
              s4 = peg$c213;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c214); }
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s1;
              s2 = peg$c212(s3);
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c1;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
        if (s1 === peg$FAILED) {
          s1 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 39) {
            s2 = peg$c215;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c216); }
          }
          if (s2 !== peg$FAILED) {
            s3 = [];
            s4 = peg$parseSingleStringCharacter();
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseSingleStringCharacter();
            }
            if (s3 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 39) {
                s4 = peg$c215;
                peg$currPos++;
              } else {
                s4 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c216); }
              }
              if (s4 !== peg$FAILED) {
                peg$reportedPos = s1;
                s2 = peg$c212(s3);
                s1 = s2;
              } else {
                peg$currPos = s1;
                s1 = peg$c1;
              }
            } else {
              peg$currPos = s1;
              s1 = peg$c1;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c27;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c28); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parseExpression();
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c211(s1, s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseGroupedExpression() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 40) {
        s1 = peg$c187;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c188); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse__();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseExpression();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse__();
            if (s4 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 41) {
                s5 = peg$c189;
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c190); }
              }
              if (s5 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c217(s3);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRange() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8, s9, s10, s11;

      s0 = peg$currPos;
      s1 = peg$parseExpression();
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 58) {
            s3 = peg$c27;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c28); }
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 61) {
              s4 = peg$c88;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c89); }
            }
            if (s4 === peg$FAILED) {
              s4 = peg$c6;
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parseExpression();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    s8 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 58) {
                      s9 = peg$c27;
                      peg$currPos++;
                    } else {
                      s9 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c28); }
                    }
                    if (s9 !== peg$FAILED) {
                      s10 = peg$parse_();
                      if (s10 !== peg$FAILED) {
                        s11 = peg$parseExpression();
                        if (s11 !== peg$FAILED) {
                          s9 = [s9, s10, s11];
                          s8 = s9;
                        } else {
                          peg$currPos = s8;
                          s8 = peg$c1;
                        }
                      } else {
                        peg$currPos = s8;
                        s8 = peg$c1;
                      }
                    } else {
                      peg$currPos = s8;
                      s8 = peg$c1;
                    }
                    if (s8 === peg$FAILED) {
                      s8 = peg$c6;
                    }
                    if (s8 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c218(s1, s4, s6, s8);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$c1;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$c1;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$c1;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$c1;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseNumber() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 45) {
        s1 = peg$c115;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c116); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c6;
      }
      if (s1 !== peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 48) {
          s2 = peg$c219;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c220); }
        }
        if (s2 === peg$FAILED) {
          s2 = peg$currPos;
          if (peg$c221.test(input.charAt(peg$currPos))) {
            s3 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c222); }
          }
          if (s3 !== peg$FAILED) {
            s4 = [];
            if (peg$c223.test(input.charAt(peg$currPos))) {
              s5 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c224); }
            }
            while (s5 !== peg$FAILED) {
              s4.push(s5);
              if (peg$c223.test(input.charAt(peg$currPos))) {
                s5 = input.charAt(peg$currPos);
                peg$currPos++;
              } else {
                s5 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c224); }
              }
            }
            if (s4 !== peg$FAILED) {
              s3 = [s3, s4];
              s2 = s3;
            } else {
              peg$currPos = s2;
              s2 = peg$c1;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 46) {
            s4 = peg$c184;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c185); }
          }
          if (s4 !== peg$FAILED) {
            s5 = [];
            if (peg$c223.test(input.charAt(peg$currPos))) {
              s6 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s6 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c224); }
            }
            if (s6 !== peg$FAILED) {
              while (s6 !== peg$FAILED) {
                s5.push(s6);
                if (peg$c223.test(input.charAt(peg$currPos))) {
                  s6 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s6 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c224); }
                }
              }
            } else {
              s5 = peg$c1;
            }
            if (s5 !== peg$FAILED) {
              s4 = [s4, s5];
              s3 = s4;
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
          if (s3 === peg$FAILED) {
            s3 = peg$c6;
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 101) {
              s5 = peg$c225;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c226); }
            }
            if (s5 !== peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 45) {
                s6 = peg$c115;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c116); }
              }
              if (s6 === peg$FAILED) {
                s6 = peg$c6;
              }
              if (s6 !== peg$FAILED) {
                s7 = [];
                if (peg$c223.test(input.charAt(peg$currPos))) {
                  s8 = input.charAt(peg$currPos);
                  peg$currPos++;
                } else {
                  s8 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c224); }
                }
                if (s8 !== peg$FAILED) {
                  while (s8 !== peg$FAILED) {
                    s7.push(s8);
                    if (peg$c223.test(input.charAt(peg$currPos))) {
                      s8 = input.charAt(peg$currPos);
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c224); }
                    }
                  }
                } else {
                  s7 = peg$c1;
                }
                if (s7 !== peg$FAILED) {
                  s5 = [s5, s6, s7];
                  s4 = s5;
                } else {
                  peg$currPos = s4;
                  s4 = peg$c1;
                }
              } else {
                peg$currPos = s4;
                s4 = peg$c1;
              }
            } else {
              peg$currPos = s4;
              s4 = peg$c1;
            }
            if (s4 === peg$FAILED) {
              s4 = peg$c6;
            }
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c227(s3, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseHexNumber() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 2) === peg$c228) {
        s1 = peg$c228;
        peg$currPos += 2;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c229); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        if (peg$c230.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c231); }
        }
        if (s3 !== peg$FAILED) {
          while (s3 !== peg$FAILED) {
            s2.push(s3);
            if (peg$c230.test(input.charAt(peg$currPos))) {
              s3 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s3 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c231); }
            }
          }
        } else {
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c232();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIdentifier() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$currPos;
      peg$silentFails++;
      s3 = peg$parseReservedWord();
      peg$silentFails--;
      if (s3 === peg$FAILED) {
        s2 = peg$c19;
      } else {
        peg$currPos = s2;
        s2 = peg$c1;
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parseIdentifierPart();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseAnyIdentifier() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parseDigits();
      if (s2 === peg$FAILED) {
        s2 = peg$parseLetters();
        if (s2 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 95) {
            s2 = peg$c233;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c234); }
          }
          if (s2 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 46) {
              s2 = peg$c184;
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c185); }
            }
          }
        }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parseDigits();
          if (s2 === peg$FAILED) {
            s2 = peg$parseLetters();
            if (s2 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 95) {
                s2 = peg$c233;
                peg$currPos++;
              } else {
                s2 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c234); }
              }
              if (s2 === peg$FAILED) {
                if (input.charCodeAt(peg$currPos) === 46) {
                  s2 = peg$c184;
                  peg$currPos++;
                } else {
                  s2 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c185); }
                }
              }
            }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseTypedIdentifier() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$currPos;
      s2 = peg$parseType();
      if (s2 !== peg$FAILED) {
        s3 = [];
        if (input.charCodeAt(peg$currPos) === 32) {
          s4 = peg$c235;
          peg$currPos++;
        } else {
          s4 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c236); }
        }
        if (s4 !== peg$FAILED) {
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            if (input.charCodeAt(peg$currPos) === 32) {
              s4 = peg$c235;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c236); }
            }
          }
        } else {
          s3 = peg$c1;
        }
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$c6;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseIdentifier();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c237(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseType() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 3) === peg$c238) {
        s1 = peg$c238;
        peg$currPos += 3;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c239); }
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseIdentifierPart() {
      var s0, s1;

      s0 = [];
      s1 = peg$parseDigits();
      if (s1 === peg$FAILED) {
        s1 = peg$parseLetters();
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 95) {
            s1 = peg$c233;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c234); }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          s1 = peg$parseDigits();
          if (s1 === peg$FAILED) {
            s1 = peg$parseLetters();
            if (s1 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 95) {
                s1 = peg$c233;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c234); }
              }
            }
          }
        }
      } else {
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseIdentifierTuple() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseTypedIdentifier();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse_();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c29;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse_();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseTypedIdentifier();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse_();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c29;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c30); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse_();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseTypedIdentifier();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c240(s1, s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c241();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseExpressionTuple() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      s0 = peg$currPos;
      s1 = peg$parseExpression();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$currPos;
        s4 = peg$parse__();
        if (s4 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s5 = peg$c29;
            peg$currPos++;
          } else {
            s5 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c30); }
          }
          if (s5 !== peg$FAILED) {
            s6 = peg$parse__();
            if (s6 !== peg$FAILED) {
              s7 = peg$parseExpression();
              if (s7 !== peg$FAILED) {
                s4 = [s4, s5, s6, s7];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        } else {
          peg$currPos = s3;
          s3 = peg$c1;
        }
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$currPos;
          s4 = peg$parse__();
          if (s4 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 44) {
              s5 = peg$c29;
              peg$currPos++;
            } else {
              s5 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c30); }
            }
            if (s5 !== peg$FAILED) {
              s6 = peg$parse__();
              if (s6 !== peg$FAILED) {
                s7 = peg$parseExpression();
                if (s7 !== peg$FAILED) {
                  s4 = [s4, s5, s6, s7];
                  s3 = s4;
                } else {
                  peg$currPos = s3;
                  s3 = peg$c1;
                }
              } else {
                peg$currPos = s3;
                s3 = peg$c1;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$c1;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$c1;
          }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c240(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (s1 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c241();
        }
        s0 = s1;
      }

      return s0;
    }

    function peg$parseDigits() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c223.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c224); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c223.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c224); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseLetters() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (peg$c242.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c243); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (peg$c242.test(input.charAt(peg$currPos))) {
            s2 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c243); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s1 = input.substring(s0, peg$currPos);
      }
      s0 = s1;

      return s0;
    }

    function peg$parse_() {
      var s0, s1;

      s0 = [];
      if (input.charCodeAt(peg$currPos) === 32) {
        s1 = peg$c235;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c236); }
      }
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 9) {
          s1 = peg$c244;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c245); }
        }
        if (s1 === peg$FAILED) {
          s1 = peg$parseComment();
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c235;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c236); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 9) {
            s1 = peg$c244;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c245); }
          }
          if (s1 === peg$FAILED) {
            s1 = peg$parseComment();
          }
        }
      }

      return s0;
    }

    function peg$parse__() {
      var s0, s1;

      s0 = [];
      if (input.charCodeAt(peg$currPos) === 32) {
        s1 = peg$c235;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c236); }
      }
      if (s1 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 9) {
          s1 = peg$c244;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c245); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 13) {
            s1 = peg$c75;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c76); }
          }
          if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 10) {
              s1 = peg$c73;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c74); }
            }
            if (s1 === peg$FAILED) {
              s1 = peg$parseComment();
            }
          }
        }
      }
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        if (input.charCodeAt(peg$currPos) === 32) {
          s1 = peg$c235;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c236); }
        }
        if (s1 === peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 9) {
            s1 = peg$c244;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c245); }
          }
          if (s1 === peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 13) {
              s1 = peg$c75;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c76); }
            }
            if (s1 === peg$FAILED) {
              if (input.charCodeAt(peg$currPos) === 10) {
                s1 = peg$c73;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c74); }
              }
              if (s1 === peg$FAILED) {
                s1 = peg$parseComment();
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseNoop() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c246();
      }
      s0 = s1;

      return s0;
    }

    function peg$parseReservedWord() {
      var s0;

      s0 = peg$parseKeyword();
      if (s0 === peg$FAILED) {
        s0 = peg$parseLiteral();
      }

      return s0;
    }

    function peg$parseKeyword() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 5) === peg$c15) {
        s1 = peg$c15;
        peg$currPos += 5;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c16); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c247) {
          s1 = peg$c247;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c248); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c45) {
            s1 = peg$c45;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c46); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 8) === peg$c17) {
              s1 = peg$c17;
              peg$currPos += 8;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c18); }
            }
            if (s1 === peg$FAILED) {
              if (input.substr(peg$currPos, 8) === peg$c249) {
                s1 = peg$c249;
                peg$currPos += 8;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c250); }
              }
              if (s1 === peg$FAILED) {
                if (input.substr(peg$currPos, 7) === peg$c251) {
                  s1 = peg$c251;
                  peg$currPos += 7;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c252); }
                }
                if (s1 === peg$FAILED) {
                  if (input.substr(peg$currPos, 6) === peg$c159) {
                    s1 = peg$c159;
                    peg$currPos += 6;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c160); }
                  }
                  if (s1 === peg$FAILED) {
                    if (input.substr(peg$currPos, 2) === peg$c253) {
                      s1 = peg$c253;
                      peg$currPos += 2;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c254); }
                    }
                    if (s1 === peg$FAILED) {
                      if (input.substr(peg$currPos, 4) === peg$c9) {
                        s1 = peg$c9;
                        peg$currPos += 4;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c10); }
                      }
                      if (s1 === peg$FAILED) {
                        if (input.substr(peg$currPos, 7) === peg$c255) {
                          s1 = peg$c255;
                          peg$currPos += 7;
                        } else {
                          s1 = peg$FAILED;
                          if (peg$silentFails === 0) { peg$fail(peg$c256); }
                        }
                        if (s1 === peg$FAILED) {
                          if (input.substr(peg$currPos, 3) === peg$c257) {
                            s1 = peg$c257;
                            peg$currPos += 3;
                          } else {
                            s1 = peg$FAILED;
                            if (peg$silentFails === 0) { peg$fail(peg$c258); }
                          }
                          if (s1 === peg$FAILED) {
                            if (input.substr(peg$currPos, 8) === peg$c259) {
                              s1 = peg$c259;
                              peg$currPos += 8;
                            } else {
                              s1 = peg$FAILED;
                              if (peg$silentFails === 0) { peg$fail(peg$c260); }
                            }
                            if (s1 === peg$FAILED) {
                              if (input.substr(peg$currPos, 2) === peg$c261) {
                                s1 = peg$c261;
                                peg$currPos += 2;
                              } else {
                                s1 = peg$FAILED;
                                if (peg$silentFails === 0) { peg$fail(peg$c262); }
                              }
                              if (s1 === peg$FAILED) {
                                if (input.substr(peg$currPos, 10) === peg$c155) {
                                  s1 = peg$c155;
                                  peg$currPos += 10;
                                } else {
                                  s1 = peg$FAILED;
                                  if (peg$silentFails === 0) { peg$fail(peg$c156); }
                                }
                                if (s1 === peg$FAILED) {
                                  if (input.substr(peg$currPos, 2) === peg$c61) {
                                    s1 = peg$c61;
                                    peg$currPos += 2;
                                  } else {
                                    s1 = peg$FAILED;
                                    if (peg$silentFails === 0) { peg$fail(peg$c62); }
                                  }
                                  if (s1 === peg$FAILED) {
                                    if (input.substr(peg$currPos, 3) === peg$c198) {
                                      s1 = peg$c198;
                                      peg$currPos += 3;
                                    } else {
                                      s1 = peg$FAILED;
                                      if (peg$silentFails === 0) { peg$fail(peg$c199); }
                                    }
                                    if (s1 === peg$FAILED) {
                                      if (input.substr(peg$currPos, 6) === peg$c40) {
                                        s1 = peg$c40;
                                        peg$currPos += 6;
                                      } else {
                                        s1 = peg$FAILED;
                                        if (peg$silentFails === 0) { peg$fail(peg$c41); }
                                      }
                                      if (s1 === peg$FAILED) {
                                        if (input.substr(peg$currPos, 6) === peg$c263) {
                                          s1 = peg$c263;
                                          peg$currPos += 6;
                                        } else {
                                          s1 = peg$FAILED;
                                          if (peg$silentFails === 0) { peg$fail(peg$c264); }
                                        }
                                        if (s1 === peg$FAILED) {
                                          if (input.substr(peg$currPos, 4) === peg$c265) {
                                            s1 = peg$c265;
                                            peg$currPos += 4;
                                          } else {
                                            s1 = peg$FAILED;
                                            if (peg$silentFails === 0) { peg$fail(peg$c266); }
                                          }
                                          if (s1 === peg$FAILED) {
                                            if (input.substr(peg$currPos, 5) === peg$c48) {
                                              s1 = peg$c48;
                                              peg$currPos += 5;
                                            } else {
                                              s1 = peg$FAILED;
                                              if (peg$silentFails === 0) { peg$fail(peg$c49); }
                                            }
                                            if (s1 === peg$FAILED) {
                                              if (input.substr(peg$currPos, 3) === peg$c43) {
                                                s1 = peg$c43;
                                                peg$currPos += 3;
                                              } else {
                                                s1 = peg$FAILED;
                                                if (peg$silentFails === 0) { peg$fail(peg$c44); }
                                              }
                                              if (s1 === peg$FAILED) {
                                                if (input.substr(peg$currPos, 6) === peg$c162) {
                                                  s1 = peg$c162;
                                                  peg$currPos += 6;
                                                } else {
                                                  s1 = peg$FAILED;
                                                  if (peg$silentFails === 0) { peg$fail(peg$c163); }
                                                }
                                                if (s1 === peg$FAILED) {
                                                  if (input.substr(peg$currPos, 3) === peg$c267) {
                                                    s1 = peg$c267;
                                                    peg$currPos += 3;
                                                  } else {
                                                    s1 = peg$FAILED;
                                                    if (peg$silentFails === 0) { peg$fail(peg$c268); }
                                                  }
                                                  if (s1 === peg$FAILED) {
                                                    if (input.substr(peg$currPos, 4) === peg$c269) {
                                                      s1 = peg$c269;
                                                      peg$currPos += 4;
                                                    } else {
                                                      s1 = peg$FAILED;
                                                      if (peg$silentFails === 0) { peg$fail(peg$c270); }
                                                    }
                                                    if (s1 === peg$FAILED) {
                                                      if (input.substr(peg$currPos, 5) === peg$c271) {
                                                        s1 = peg$c271;
                                                        peg$currPos += 5;
                                                      } else {
                                                        s1 = peg$FAILED;
                                                        if (peg$silentFails === 0) { peg$fail(peg$c272); }
                                                      }
                                                      if (s1 === peg$FAILED) {
                                                        if (input.substr(peg$currPos, 4) === peg$c273) {
                                                          s1 = peg$c273;
                                                          peg$currPos += 4;
                                                        } else {
                                                          s1 = peg$FAILED;
                                                          if (peg$silentFails === 0) { peg$fail(peg$c274); }
                                                        }
                                                        if (s1 === peg$FAILED) {
                                                          if (input.substr(peg$currPos, 5) === peg$c54) {
                                                            s1 = peg$c54;
                                                            peg$currPos += 5;
                                                          } else {
                                                            s1 = peg$FAILED;
                                                            if (peg$silentFails === 0) { peg$fail(peg$c55); }
                                                          }
                                                          if (s1 === peg$FAILED) {
                                                            if (input.substr(peg$currPos, 5) === peg$c275) {
                                                              s1 = peg$c275;
                                                              peg$currPos += 5;
                                                            } else {
                                                              s1 = peg$FAILED;
                                                              if (peg$silentFails === 0) { peg$fail(peg$c276); }
                                                            }
                                                            if (s1 === peg$FAILED) {
                                                              if (input.substr(peg$currPos, 4) === peg$c277) {
                                                                s1 = peg$c277;
                                                                peg$currPos += 4;
                                                              } else {
                                                                s1 = peg$FAILED;
                                                                if (peg$silentFails === 0) { peg$fail(peg$c278); }
                                                              }
                                                              if (s1 === peg$FAILED) {
                                                                if (input.substr(peg$currPos, 6) === peg$c279) {
                                                                  s1 = peg$c279;
                                                                  peg$currPos += 6;
                                                                } else {
                                                                  s1 = peg$FAILED;
                                                                  if (peg$silentFails === 0) { peg$fail(peg$c280); }
                                                                }
                                                                if (s1 === peg$FAILED) {
                                                                  if (input.substr(peg$currPos, 7) === peg$c56) {
                                                                    s1 = peg$c56;
                                                                    peg$currPos += 7;
                                                                  } else {
                                                                    s1 = peg$FAILED;
                                                                    if (peg$silentFails === 0) { peg$fail(peg$c57); }
                                                                  }
                                                                  if (s1 === peg$FAILED) {
                                                                    if (input.substr(peg$currPos, 6) === peg$c281) {
                                                                      s1 = peg$c281;
                                                                      peg$currPos += 6;
                                                                    } else {
                                                                      s1 = peg$FAILED;
                                                                      if (peg$silentFails === 0) { peg$fail(peg$c282); }
                                                                    }
                                                                    if (s1 === peg$FAILED) {
                                                                      if (input.substr(peg$currPos, 5) === peg$c195) {
                                                                        s1 = peg$c195;
                                                                        peg$currPos += 5;
                                                                      } else {
                                                                        s1 = peg$FAILED;
                                                                        if (peg$silentFails === 0) { peg$fail(peg$c196); }
                                                                      }
                                                                      if (s1 === peg$FAILED) {
                                                                        if (input.substr(peg$currPos, 4) === peg$c51) {
                                                                          s1 = peg$c51;
                                                                          peg$currPos += 4;
                                                                        } else {
                                                                          s1 = peg$FAILED;
                                                                          if (peg$silentFails === 0) { peg$fail(peg$c52); }
                                                                        }
                                                                      }
                                                                    }
                                                                  }
                                                                }
                                                              }
                                                            }
                                                          }
                                                        }
                                                      }
                                                    }
                                                  }
                                                }
                                              }
                                            }
                                          }
                                        }
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$currPos;
        peg$silentFails++;
        s3 = peg$parseIdentifierPart();
        peg$silentFails--;
        if (s3 === peg$FAILED) {
          s2 = peg$c19;
        } else {
          peg$currPos = s2;
          s2 = peg$c1;
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseLiteral() {
      var s0, s1;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 4) === peg$c283) {
        s1 = peg$c283;
        peg$currPos += 4;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c284); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c285) {
          s1 = peg$c285;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c286); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 5) === peg$c287) {
            s1 = peg$c287;
            peg$currPos += 5;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c288); }
          }
          if (s1 === peg$FAILED) {
            if (input.substr(peg$currPos, 9) === peg$c289) {
              s1 = peg$c289;
              peg$currPos += 9;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c290); }
            }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c291(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseThisToken() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      if (input.charCodeAt(peg$currPos) === 64) {
        s2 = peg$c292;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c293); }
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          if (input.charCodeAt(peg$currPos) === 64) {
            s2 = peg$c292;
            peg$currPos++;
          } else {
            s2 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c293); }
          }
        }
      } else {
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c294(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseThisProperty() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$parseThisToken();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseIdentifier();
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c295(s1, s2);
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseStringLiteral() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 34) {
        s2 = peg$c213;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c214); }
      }
      if (s2 !== peg$FAILED) {
        s3 = [];
        s4 = peg$parseDoubleStringCharacter();
        while (s4 !== peg$FAILED) {
          s3.push(s4);
          s4 = peg$parseDoubleStringCharacter();
        }
        if (s3 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 34) {
            s4 = peg$c213;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c214); }
          }
          if (s4 !== peg$FAILED) {
            s2 = [s2, s3, s4];
            s1 = s2;
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 39) {
          s2 = peg$c215;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c216); }
        }
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseSingleStringCharacter();
          while (s4 !== peg$FAILED) {
            s3.push(s4);
            s4 = peg$parseSingleStringCharacter();
          }
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 39) {
              s4 = peg$c215;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c216); }
            }
            if (s4 !== peg$FAILED) {
              s2 = [s2, s3, s4];
              s1 = s2;
            } else {
              peg$currPos = s1;
              s1 = peg$c1;
            }
          } else {
            peg$currPos = s1;
            s1 = peg$c1;
          }
        } else {
          peg$currPos = s1;
          s1 = peg$c1;
        }
      }
      if (s1 !== peg$FAILED) {
        peg$reportedPos = s0;
        s1 = peg$c297(s1);
      }
      s0 = s1;
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c296); }
      }

      return s0;
    }

    function peg$parseDoubleStringCharacter() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 34) {
        s2 = peg$c213;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c214); }
      }
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c298;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c299); }
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c300();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c298;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c299); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseCharacterEscapeSequence();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c301(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseSingleStringCharacter() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (input.charCodeAt(peg$currPos) === 39) {
        s2 = peg$c215;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c216); }
      }
      if (s2 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 92) {
          s2 = peg$c298;
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c299); }
        }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c300();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.charCodeAt(peg$currPos) === 92) {
          s1 = peg$c298;
          peg$currPos++;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c299); }
        }
        if (s1 !== peg$FAILED) {
          s2 = peg$parseCharacterEscapeSequence();
          if (s2 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c301(s2);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      }

      return s0;
    }

    function peg$parseCharacterEscapeSequence() {
      var s0;

      s0 = peg$parseSingleEscapeCharacter();
      if (s0 === peg$FAILED) {
        s0 = peg$parseNonEscapeCharacter();
      }

      return s0;
    }

    function peg$parseSingleEscapeCharacter() {
      var s0, s1;

      if (input.charCodeAt(peg$currPos) === 39) {
        s0 = peg$c215;
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c216); }
      }
      if (s0 === peg$FAILED) {
        if (input.charCodeAt(peg$currPos) === 34) {
          s0 = peg$c213;
          peg$currPos++;
        } else {
          s0 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c214); }
        }
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 92) {
            s1 = peg$c298;
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c299); }
          }
          if (s1 !== peg$FAILED) {
            peg$reportedPos = s0;
            s1 = peg$c302();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.charCodeAt(peg$currPos) === 98) {
              s1 = peg$c303;
              peg$currPos++;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c304); }
            }
            if (s1 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c305();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 102) {
                s1 = peg$c306;
                peg$currPos++;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c307); }
              }
              if (s1 !== peg$FAILED) {
                peg$reportedPos = s0;
                s1 = peg$c308();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.charCodeAt(peg$currPos) === 110) {
                  s1 = peg$c309;
                  peg$currPos++;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c310); }
                }
                if (s1 !== peg$FAILED) {
                  peg$reportedPos = s0;
                  s1 = peg$c311();
                }
                s0 = s1;
                if (s0 === peg$FAILED) {
                  s0 = peg$currPos;
                  if (input.charCodeAt(peg$currPos) === 114) {
                    s1 = peg$c312;
                    peg$currPos++;
                  } else {
                    s1 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c313); }
                  }
                  if (s1 !== peg$FAILED) {
                    peg$reportedPos = s0;
                    s1 = peg$c314();
                  }
                  s0 = s1;
                  if (s0 === peg$FAILED) {
                    s0 = peg$currPos;
                    if (input.charCodeAt(peg$currPos) === 116) {
                      s1 = peg$c315;
                      peg$currPos++;
                    } else {
                      s1 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c316); }
                    }
                    if (s1 !== peg$FAILED) {
                      peg$reportedPos = s0;
                      s1 = peg$c317();
                    }
                    s0 = s1;
                    if (s0 === peg$FAILED) {
                      s0 = peg$currPos;
                      if (input.charCodeAt(peg$currPos) === 118) {
                        s1 = peg$c318;
                        peg$currPos++;
                      } else {
                        s1 = peg$FAILED;
                        if (peg$silentFails === 0) { peg$fail(peg$c319); }
                      }
                      if (s1 !== peg$FAILED) {
                        peg$reportedPos = s0;
                        s1 = peg$c320();
                      }
                      s0 = s1;
                    }
                  }
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parseNonEscapeCharacter() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$parseSingleEscapeCharacter();
      if (s2 === peg$FAILED) {
        s2 = peg$parseEOL();
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c300();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRegularExpressionLiteral() {
      var s0, s1, s2, s3, s4;

      peg$silentFails++;
      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 47) {
        s1 = peg$c119;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c120); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRegularExpressionBody();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 47) {
            s3 = peg$c119;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c120); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parseRegularExpressionFlags();
            if (s4 !== peg$FAILED) {
              peg$reportedPos = s0;
              s1 = peg$c322(s2, s4);
              s0 = s1;
            } else {
              peg$currPos = s0;
              s0 = peg$c1;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c321); }
      }

      return s0;
    }

    function peg$parseRegularExpressionBody() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$parseRegularExpressionFirstChar();
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseRegularExpressionChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseRegularExpressionChar();
        }
        if (s2 !== peg$FAILED) {
          peg$reportedPos = s0;
          s1 = peg$c300();
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRegularExpressionFirstChar() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (peg$c323.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c324); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRegularExpressionNonTerminator();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseRegularExpressionBackslashSequence();
        if (s0 === peg$FAILED) {
          s0 = peg$parseRegularExpressionClass();
        }
      }

      return s0;
    }

    function peg$parseRegularExpressionChar() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (peg$c325.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c326); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRegularExpressionNonTerminator();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseRegularExpressionBackslashSequence();
        if (s0 === peg$FAILED) {
          s0 = peg$parseRegularExpressionClass();
        }
      }

      return s0;
    }

    function peg$parseRegularExpressionBackslashSequence() {
      var s0, s1, s2;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 92) {
        s1 = peg$c298;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c299); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRegularExpressionNonTerminator();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRegularExpressionNonTerminator() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      s2 = peg$parseEOL();
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        if (input.length > peg$currPos) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c85); }
        }
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRegularExpressionClass() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 91) {
        s1 = peg$c179;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c180); }
      }
      if (s1 !== peg$FAILED) {
        s2 = [];
        s3 = peg$parseRegularExpressionClassChar();
        while (s3 !== peg$FAILED) {
          s2.push(s3);
          s3 = peg$parseRegularExpressionClassChar();
        }
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 93) {
            s3 = peg$c181;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c182); }
          }
          if (s3 !== peg$FAILED) {
            s1 = [s1, s2, s3];
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$c1;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }

      return s0;
    }

    function peg$parseRegularExpressionClassChar() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = peg$currPos;
      peg$silentFails++;
      if (peg$c327.test(input.charAt(peg$currPos))) {
        s2 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c328); }
      }
      peg$silentFails--;
      if (s2 === peg$FAILED) {
        s1 = peg$c19;
      } else {
        peg$currPos = s1;
        s1 = peg$c1;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parseRegularExpressionNonTerminator();
        if (s2 !== peg$FAILED) {
          s1 = [s1, s2];
          s0 = s1;
        } else {
          peg$currPos = s0;
          s0 = peg$c1;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$c1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parseRegularExpressionBackslashSequence();
      }

      return s0;
    }

    function peg$parseRegularExpressionFlags() {
      var s0, s1;

      s0 = [];
      s1 = peg$parseIdentifierPart();
      while (s1 !== peg$FAILED) {
        s0.push(s1);
        s1 = peg$parseIdentifierPart();
      }

      return s0;
    }


        function ImportError(message, line) {
            this.message  = message;
            this.line     = line;
            this.name     = "ImportError";
        }

        function StyleError(message, line) {
            this.message  = message;
            this.line     = line;
            this.name     = "StyleError";
        }

        function deprecationWarning(message, line) {
            var warning = 'Deprecation warning at ' + parser.options.filePath + ' line ' + line + ': ' + message;
            console.log(warning.yellow);
        }

        function styleWarning(message, line) {
            if (parser.options.strictStyleMode) {
                var warning = 'Style warning at ' + parser.options.filePath + ' line ' + line + ': ' + message;
                throw new StyleError(message, line);
            }
        }

        peg$subclass(ImportError, Error);

        var fs = require('fs');
        var path = require('path');
        var extend = require('util')._extend;

        var indentStack = [],
            indent = "",
            scopeId = 0,
            parser = this;

        function type (name, options) {

            options = options || {};

            var functions = {
                init: options.init || function () {},
                toJS: options.toJS || function () { return '<' + name + '>'; },
                traverse: options.traverse || function () {},
                remove: function(newParent) {
                    var index = this.parent.children.indexOf(this);
                    if (index === -1) {
                        throw "Compiler Error: remove()"
                    }
                    this.parent.children.splice(index, 1);
                },
                insertAfter: function(sibling) {
                    var index = sibling.parent.children.indexOf(sibling);
                    if (index === -1) {
                        throw "Compiler Error: insertAfter()"
                    }
                    sibling.parent.children.splice(index+1, 0, this);
                }
            }

            for ( key in options ) {
                functions[key] = options[key];
            }

            type[name] = function () {
                this.nodeType = name;
                this.parent = null;
                this.scope = null;
                this.children = [];
                functions.init.apply(this, arguments);
            }
            type[name].prototype = functions;
        }

        type('Program', {
            init: function(block) {
                this.block = block;
                this.children = [block];
            },
            traverse: function () {
                var queue = [this];

                while (queue.length) {

                    var item = queue.shift();

                    if (item.nodeType === 'Block' && item.isScope) {
                        item.scope = item;
                    }

                    if (item !== this && item.traverse) {
                        item.traverse();
                    }

                    for (var i = 0; i < item.children.length; i++) {

                        var child = item.children[i];

                        if (!child)
                            continue;

                        if (!child.nodeType)
                            continue;

                        queue.push(child);
                        child.parent = item;
                        child.scope = item.scope;

                    }

                    if (item.postChildren) {
                        queue.push({
                            traverse: item.postChildren.bind(item),
                            children: [],
                        });
                    }

                }

            },
            toJS: function (options) {

                parser.options = options;

                this.traverse();

                var out = this.block.extractPreImportStatements().map(function(item) {
                    return item.toJS() + '\n';
                }).join('');

                out += this.block.extractNodes('IncludeStatement').map(function(item) {
                    return item.toJS() + '\n';
                }).join('');

                var imports = this.block.extractNodes('ImportStatement');
                var export_ = this.block.extractNodes('ExportStatement');

                if (options.bare) {
                    return this.block.toJS();
                }

                if (export_.length > 1) {
                    throw 'Too many export statements...'
                }
                export_ = export_[0];

                if (options.node) {
                    // Handle imports with node
                    out += imports.map(function(item) {
                        return 'var ' + item.name + ' = require("' + item.path + '");';
                    }).join('\n');

                    out += this.block.toJS();

                    if (export_) {
                        out += '\nmodule.exports = ' + export_.toJS() + ';';
                    }
                    else {
                        out += '\nmodule.exports = {' + this.block.getPublicSymbolsList().map(function(key) {
                            return "'" + key + "': " + key;
                        }).join(',') + '};';
                    }
                }
                else {
                    // Handle imports with require js
                    var pathString = imports.map(function(item) {
                        return '"' + item.path + '"';
                    }).join(', ');

                    var paramString = imports.map(function(item) {
                        return item.name;
                    }).join(', ');


                    var requireFunction = /main\.bs$/.test(options.filePath) ? 'require' : 'define';

                    out += requireFunction + '([' + pathString + '], ';
                    out += 'function(' + paramString + ') \x7b\n"use strict";';
                    out += this.block.toJS();

                    if (export_) {
                        out += '\nreturn ' + export_.toJS() + ';';
                    }
                    else {
                        out += '\nreturn {' + this.block.getPublicSymbolsList().map(function(key) {
                            return "'" + key + "': " + key;
                        }).join(',') + '};';
                    }

                    out += '\n\x7d);';
                }
                return out;
            }
        });

        type('Noop', {
            semicolon: false,
            toJS: function () {
                return '';
            }
        });

        type('Comment', {
            semicolon: false,
            init: function (text) {
                this.text = text;
            },
            toJS: function () {
                if (parser.options.removeComments) {
                    return '';
                }
                return '//' + this.text;
            }
        });

        type('Number', {
            init: function (n) {
                if (n.indexOf('.') === -1 && n.indexOf('e') === -1) {
                    this.value = parseInt(n);
                }
                else {
                    this.value = parseFloat(n);
                }
            },
            toJS: function () {
                return this.value;
            }
        })

        type('Variable', {
            init: function (name) {
                this.name = name;
            },
            toJS: function () {
                return this.name;
            }
        });

        type('Assignment', {
            init: function(operator, left, value) {
                this.operator = operator;
                this.left = left;
                this.value = value;
                this.children = [left, value];
                this.varThisSonOfABitch = false;
            },
            traverse: function () {
                if (!this.left.nodeType) {
                    this.varThisSonOfABitch = !this.scope.symbols[this.left];
                    this.scope.symbols[this.left] = 1;
                }
            },
            toJS: function () {
                var left = this.left.toJS ? this.left.toJS() : this.left;
                var varShit = this.varThisSonOfABitch ? 'var ' : '';
                return varShit + left + ' ' + this.operator + ' ' + this.value.toJS();
            }
        });

        type('If', {
            semicolon: false,
            init: function (expr, ifBody, elifs, elseBody, ternary) {
                this.expression = expr;
                this.ifBody = ifBody;
                this.elseBody = elseBody;
                this.elifs = elifs || [];
                this.children = [expr, ifBody, elseBody].concat(this.elifs);
                this.ternary = !!ternary;
                this.line = line();
            },
            traverse: function() {
                if (this.expression.nodeType === 'Group') {
                    styleWarning('If statements should not have parens in baileyjs, they are not needed.', this.line);
                }
            },
            toJS: function () {

                if (this.ternary) {
                    return this.expression.toJS() +
                           ' ? ' + this.ifBody.toJS() +
                           ' : ' + this.elseBody.toJS();
                }

                var out = 'if (' + this.expression.toJS() + ') {\n    ';
                out += this.ifBody.toJS() + '}';

                for (var i = 0; i < this.elifs.length; i++) {
                    out += ' else ' + this.elifs[i].toJS();
                }

                if (this.elseBody) {
                    out += ' else {\n    ';
                    out += this.elseBody.toJS() + '}';
                }

                return out;
            }
        })

        type('ForLoop', {
            semicolon: false,
            init: function (iterator, item, iterable, body, ofLoop) {
                this.iterator = iterator;
                this.item = item;
                this.iterable = iterable;
                this.iterableLength = null;
                this.body = body;
                this.ofLoop = ofLoop;
                this.children = [iterator, item, iterable, body];
            },
            traverse: function () {
                if (this.iterable.nodeType === 'Range') {
                    this.iterator = this.item;
                }

                if (!this.iterator) {
                    var i = 1;
                    do {
                        this.iterator = '__i' + i++;
                    } while (this.scope.symbols[this.iterator]);
                }

                if (!this.iterableTemp) {
                    var i = 1;
                    do {
                        this.iterableTemp = '__a' + i++;
                    } while (this.scope.symbols[this.iterableTemp]);
                }

                if (!this.iterableLength) {
                    var i = 1;
                    do {
                        this.iterableLength = '__l' + i++;
                    } while (this.scope.symbols[this.iterableLength]);
                }

                this.scope.symbols[this.iterator] = 1;
                this.scope.symbols[this.iterableTemp] = 1;
                this.scope.symbols[this.iterableLength] = 1;
            },
            toJS: function () {
                if (this.ofLoop) {
                    return this.toJSOfLoop();
                }
                if (this.iterable.nodeType === 'Range') {
                    return this.toJSRanged();
                }
                else {
                    return this.toJSListed();
                }
            },
            toJSRanged: function () {

                var step = '',
                    iterator = this.iterator,
                    by = this.iterable.by,
                    comparator = ' <';

                if (by.nodeType === 'Number' && by.value === 0) {
                    step == ''
                }

                else if (by.value === 1) {
                    step = iterator + '++';
                }
                else if (by.value === -1) {
                    step = iterator + '--';
                    comparator = ' >';
                }
                else if (by.value < 0) {
                    step = iterator + ' = ' + iterator + by.toJS();
                    comparator = ' >';
                }
                else {
                    step = iterator + ' = ' + iterator + '+' + by.toJS()
                }

                comparator += this.iterable.equals ? '= ' : ' ';

                return 'for (var ' + iterator + ' = ' + this.iterable.from.toJS() + '; ' +
                    iterator + comparator + this.iterable.to.toJS() + '; ' + step + ') {\n' +
                    this.body.toJS() + '}';
            },
            toJSListed: function () {
                var out = this.toJSBeforeLoop();

                return out +
                    'var ' + this.iterableLength + ' = ' + this.iterableTemp + '.length;' +
                    'for (var ' + this.iterator + ' = 0; ' +
                    this.iterator + ' < ' + this.iterableLength + '; ' + this.iterator + '++) { ' +
                    'var ' + this.item + ' = ' + this.iterableTemp + '[' + this.iterator + '];\n' +
                    this.body.toJS() + '}';
            },
            toJSOfLoop: function () {
                var out = this.toJSBeforeLoop();

                return out + 'for (var ' + this.iterator + ' in ' + this.iterableTemp + ') {' +
                'var ' + this.item + ' = ' + this.iterableTemp + '[' + this.iterator + '];\n' +
                this.body.toJS() + '}';
            },

            toJSBeforeLoop: function () {
                if (this.iterable.nodeType === 'Variable') {
                    this.iterableTemp = this.iterable.toJS();
                }
                else {
                    return 'var ' + this.iterableTemp + ' = ' + this.iterable.toJS() + ';'
                }
                return '';
            }
        });

        type('WhileLoop', {
            semicolon: false,
            init: function (expression, body) {
                this.expression = expression;
                this.body = body;
                this.children = [expression, body];
                this.line = line();
            },
            traverse: function () {
                if (this.expression.nodeType === 'Group') {
                    styleWarning('While statements should not have parens in baileyjs, they are not needed.', this.line);
                }
            },
            toJS: function () {
                return 'while (' + this.expression.toJS() + ') {\n' +
                       this.body.toJS() + '}';
            }
        });

        type('Operator', {
            init: function (op, left, right) {
                this.operator = op;
                this.left = left;
                this.right = right;
                this.children = [left, right];
            },
            toJS: function () {
                return this.left.toJS() + ' ' + this.operator + (this.right ? ' ' + this.right.toJS() : '');
            }
        });

        type('UnaryOperator', {
            init: function (op, right) {
                this.operator = op;
                this.right = right;
                this.children = [right];

                if (this.operator === '-' && this.right.nodeType === 'Number') {
                    this.value = -this.right.value;
                }
            },
            toJS: function () {
                return this.operator + ' ' + this.right.toJS();
            }
        });

        type('ListLiteral', {
            init: function (items) {
                this.items = items;
                this.children = items;
            },
            toJS: function () {
                var items = this.items.map(function(item) {
                    return item.toJS();
                });
                return '[' + items.join(', ') + ']';
            }
        });

        type('ObjectLiteral', {
            init: function () {
                this.keys = [];
                this.values = [];
                this.children = this.values;
            },
            add: function (val) {
                this.keys.push(val.key);
                this.values.push(val.value);
            },
            toJS: function () {
                var out = '{';
                for (var i = 0; i < this.keys.length; i++) {
                    out += "'" + this.keys[i] + "': " + this.values[i].toJS();
                    if (i < this.keys.length - 1) {
                        out += ', ';
                    }
                }
                return out + '}';
            }
        });

        type('ClassStatement', {
            semicolon: false,
            init: function (name, extendFrom) {
                this.name = name;
                this.extendFrom = extendFrom;
                this.values = [];
                this.children = [];
                this.init = null;
            },
            add: function (val) {
                val.value.name = val.key;
                this.children.push(val.value);

                if (val.key === 'init') {
                    this.init = val.value;
                }
                else {
                    this.values.push(val);
                }
            },
            traverse: function() {
                this.scope.symbols[this.name] = 1;
            },
            toJS: function () {
                var name = this.name;
                var out = 'function ' + this.name + ' ';
                var errorIfNotNewed = 'if ((typeof window !== "undefined" && this === window) || (typeof self !== "undefined" && this === self)) { throw new TypeError("Tried to call class ' + name + ' as a regular function. Classes can only be called with the \'new\' keyword."); }';
                if (this.init !== null) {
                    var params = this.init.params.map(function(p) {
                        return p.toJS();
                    });
                    out += '(' + params.join(', ') + ') ';
                    out += '{' + errorIfNotNewed + this.init.body.toJS() + '}'
                }
                else {
                    out += '() {' + errorIfNotNewed + '}';
                }

                if (this.extendFrom) {
                    out += this.name + '.prototype = Object.create(' + this.extendFrom + '.prototype);'
                }

                out += this.values.map(function(item) {
                    return name + '.prototype.' + item.key + ' = ' + item.value.toJS() + ';'
                }).join('\n');
                return out;
            }
        });

        type('LoopControl', {
            init: function (type) {
                this.type = type;
            },
            toJS: function () {
                return this.type;
            }
        });

        type('ImportStatement', {
            semicolon: false,
            init: function (path, name, subImports) {
                this.name = name;
                this.unalteredPath = path;
                this.path = path;
                this.children = subImports || [];
                this.subImports = subImports || [];
                this.line = line();

                // TODO: python style imports are deprecated, remove this replace soon
                if (this.path.indexOf('/') === -1) {
                    this.path = this.path.replace(/\.(?![\.\/])/g, '/');
                }
                if (this.path[0] === '/') {
                    this.path = '.' + this.path;
                }

                if (!name) {
                    if (subImports && subImports.length > 0) {
                        this.name = '__module_' + this.path.replace(/[\/\.\-]/g, '_');
                    }
                    else {
                        this.name = name || this.path.match(/([^!\/]+)$/)[1];
                    }
                }

                if (this.name.indexOf('-') !== -1 && name === undefined) {
                    throw new SyntaxError(
                        'Dashes in import statements make me sad, I do not know what to call the imported variable! \nUse "import ... as ..." to give it a name.', '-', '',
                        offset(), line(), path.indexOf('-') + 8
                    )
                }

                if (this.name.indexOf('.') !== -1 && name === undefined) {
                    throw new SyntaxError(
                        'Dots in plugin import statements make me sad, I do not know what to call the imported variable! \nUse "import ... as ..." to give it a name.', '.', '',
                        offset(), line(), this.path.indexOf('.') + 8
                    )
                }
            },
            toJS: function () {
                return '';
            },
            traverse: function () {
                if (this.unalteredPath.match(/\.(?![\.\/])/) && this.unalteredPath.indexOf('!') === -1) {
                    deprecationWarning('Using . instead of / in imports is deprecated, and will fail in future versions.', this.line);
                }
                if (this.scope.symbols[this.name]) {
                    if (this.subImports.length) {
                        // This module has already been imported? Well cool, let's just forget us
                        this.postChildren = function () {
                            this.remove();
                        }
                        return;
                    }
                    throw new ImportError(
                        'Import "' + this.name + '" conflicts with a previous import defined at line ' + this.scope.symbols[this.name],
                        this.line
                    );
                }
                this.scope.symbols[this.name] = this.line;
            }
        });

        type('SubImportStatement', {
            init: function(name) {
                this.name = name;
            },
            traverse: function () {
                // Hook these declarations to the scope.
                // We don't have to remove ourselves as ImportStatements will be extracted
                this.scope.symbols[this.name] = 1;
                this.parentImport = this.parent;
                this.insertAfter(this.parentImport);
            },
            toJS: function () {
                return 'var ' + this.name + ' = ' + this.parentImport.name + '.' + this.name;
            }
        })

        type('ExportStatement', {
            semicolon: false,
            init: function (expr) {
                this.expr = expr;
                this.children = [expr];
            },
            toJS: function () {
                return this.expr.toJS();
            }
        });

        type('IncludeStatement', {
            init: function (path) {
                // TODO: python style imports are deprecated, remove this replace soon
                this.path = path;
                this.unalteredPath = path;
                if (this.path.indexOf('/') === -1) {
                    this.path = this.path.replace(/\.(?![\.\/])/g, '/');
                }
                if (this.path[0] === '/') {
                    this.path = '..' + this.path;
                }
            },
            traverse: function () {
                if (this.unalteredPath.match(/\.(?![\.\/])/) && this.unalteredPath.indexOf('!') === -1) {
                    deprecationWarning('Using . instead of / in includes is deprecated, and will fail in future versions.', this.line);
                }
            },
            toJS: function () {
                var filePath = path.join(parser.options.root, this.path);

                if (fs.existsSync(filePath + '.bs')) {
                    var options = extend({}, parser.options);
                    options.path = filePath + '.bs';
                    return parser.options.parse(fs.readFileSync(filePath + '.bs', 'utf8'), options );
                }
                if (fs.existsSync(filePath + '.js')) {
                    return fs.readFileSync(filePath + '.js', 'utf8');
                }
                error('Could not find file, tried ' + filePath + '.js and .bs')
            }
        });

        type('Literal', {
            init: function (type) {
                this.type = type;
            },
            toJS: function () {
                return this.type;
            }
        });

        type('StringLiteral', {
            init: function (token, string) {
                this.token = token;
                this.string = string.replace(token, '\\' + token).replace(/\n/g, '\\n');
            },
            toJS: function () {
                return this.token + this.string + this.token;
            }
        });

        type('Block', {
            init: function(statements) {
                this.name = '__scope_' + scopeId++ + '__';
                this.declareName = false;
                this.symbols = {};
                this.statements = statements;
                this.children = statements;
            },
            traverse: function () {
                if (this.parent && this.parent.scope) {
                    this.symbols.__proto__ = this.parent.scope.symbols;
                }

            },
            toJS: function () {

                var out = '';

                if (this.declareName) {
                    out += 'var ' + this.name + ' = this;\n';
                }

                return out + this.statements.map(function (s) {
                    return s.toJS() + (s.semicolon !== false ? ';' : '');
                }).join('\n') + '\n';
            },
            extractNodes: function (type) {
                var nodes = this.statements.filter(function(statement) {
                    return statement.nodeType === type;
                });

                this.statements = this.statements.filter(function(statement) {
                    return statement.nodeType !== type;
                });

                return nodes;
            },
            extractPreImportStatements: function () {

                var list = [],
                    hadImportsOrExport = false;
                for (var i = 0; i < this.statements.length; i++) {
                    var item = this.statements[i];
                    if (item.nodeType === 'ImportStatement' || item.nodeType === 'ExportStatement') {
                        this.statements = this.statements.slice(i);
                        hadImportsOrExport = true;
                        break;
                    }
                    list.push(item);
                }
                if (!hadImportsOrExport) {
                    return [];
                }

                return list;

            },
            getImports: function () {
                return this.statements.filter(function(statement) {
                    return statement.nodeType === 'ImportStatement';
                });
            },
            getPublicSymbolsList: function () {
                return Object.keys(this.symbols).filter(function(key) {
                    return key[0] !== '_';
                });
            },
            getScopeName: function () {
                this.declareName = true;
                return this.name;
            },
            copySymbols: function (list) {
                for (var i = 0; i < list.length; i++) {
                    this.symbols[list[i]] = 1;
                }
            }
        });

        type('Group', {
            init: function(expr) {
                this.expr = expr;
                this.children = [expr];
            },
            toJS: function () {
                return '(' + this.expr.toJS() + ')';
            }
        });

        type('Function', {
            init: function (params, body) {
                this.params = params;
                this.body = body;
                this.children = params.concat([body]);
            },
            traverse: function () {
                if (this.body.nodeType === 'Block') {
                    this.body.copySymbols(this.params.map(function(p) {
                        return p.toJS();
                    }));
                }
                if (!this.name && this.parent.left) {
                    this.name = this.parent.left;
                }
            },
            toJS: function () {
                var params = this.params.map(function (p) {
                    return p.toJS();
                })

                if(typeof this.name === 'object') {
                  if (this.name.nodeType === 'PropertyAccess') {
                    this.name = this.name.accessor.name;
                  }
                }

                return 'function' + (this.name ? ' ' + this.name : '') +
                       '(' + params.join(', ') + ') {\n' + this.body.toJS() + '}';
            }
        });

        type('Return', {
            init: function (body) {
                this.body = body;
                this.children = [body];
            },
            toJS: function () {
                if (this.body === null || this.body.nodeType === 'Noop' ) {
                    return 'return;';
                }

                return 'return ' + this.body.toJS() + (this.body.isScope ? ';' : '');
            }
        });

        type('FunctionCall', {
            init: function (expr, args) {
                this.expr = expr;
                this.args = args;
                this.children = [expr].concat(args);
            },
            toJS: function () {
                var start;
                var expr = this.expr.toJS ? this.expr.toJS() : this.expr;

                // Since we have init as our constructor call...
                if (this.superCall && expr === 'init') {
                    start = 'call(this'
                }
                else if (this.superCall) {
                    start = 'prototype.' + expr + '.call(this';
                }
                else {
                    start = expr + '(';
                }

                if (this.superCall && this.args.length > 0) {
                    start += ',';
                }

                return start + this.args.map(function(item){
                    return item.toJS();
                }).join(', ') + ')';
            }
        });

        type('PropertyAccess', {
            init: function (value, accessor, type) {
                this.value = value;
                this.accessor = accessor;
                this.type = type;
                this.children = [value, accessor];
            },
            toJS: function () {
                if (this.type === '.') {
                    return this.value.toJS() + '.' + (this.accessor.toJS ? this.accessor.toJS() : this.accessor);
                }

                return this.value.toJS() + '[' + this.accessor.toJS() + ']';
            }
        });

        type('ThisToken', {
            init: function(scopeOffset) {
                this.scopeOffset = scopeOffset;
                this.scopeIdentifier = 'UntraversedThisToken';
            },
            traverse: function () {
                this.scopeIdentifier = this.findScopeIdentifier();
            },
            toJS: function () {
                return this.scopeIdentifier;
            },
            findScopeIdentifier: function () {

                if (this.scopeOffset === 0 ) {
                    return 'this';
                }

                var offset = this.scopeOffset + 1;
                var node = this.parent;

                while (node) {

                    if (node.isScope) {
                        offset--;
                    }

                    if (offset === 0) {
                        return node.getScopeName();
                    }

                    node = node.parent;
                }

                throw 'Scope access overflow; not enough scopes to traverse';
            }
        });

        type('NewExpression', {
            init: function(classExpression) {
                this.classExpression = classExpression;
                this.children = [classExpression];
            },
            toJS: function () {
                return 'new ' + this.classExpression.toJS();
            }
        });

        type('Range', {
            init: function(from, to, by, equals) {
                this.from = from;
                this.to = to;
                this.by = by;
                this.children = [from, to, by];
                this.equals = equals;
            }
        });

        type('Throw', {
            init: function(expr) {
                this.expr = expr;
                this.children = [expr];
            },
            toJS: function () {
                return 'throw ' + this.expr.toJS();
            }
        });

        type('TryCatch', {
            semicolon: false,
            init: function(tryBody, catchVar, catchBody) {
                this.tryBody = tryBody;
                this.catchVar = catchVar;
                this.catchBody = catchBody;
                this.children = [tryBody, catchBody];
            },
            toJS: function () {
                return 'try {' + this.tryBody.toJS() + '} catch (' + this.catchVar + ') {' +
                       this.catchBody.toJS() + '}';
            }
        });
        type('SuperToken', {
            init: function () {
                this.offset = offset();
                this.line = line();
                this.column = column();
            },
            traverse: function () {

                // Find the class in which this super resides
                var target = this;
                while (target.nodeType != 'ClassStatement') {
                    target = target.parent;

                    if (!target) {
                        throw new SyntaxError(
                            'super can only be used inside a class statement', '.', '',
                            this.offset, this.line, this.column
                        )
                    }
                }

                this.cls = target;

                // Find the function call
                if (this.parent.nodeType != 'PropertyAccess') {
                    throw new SyntaxError(
                        'super can only be used to access the methods of the superclass like so: super.method()', '.', '',
                        this.offset, this.line, this.column
                    )
                }

                if (this.parent.accessor.nodeType != 'FunctionCall') {
                    throw new SyntaxError(
                        'super only supports accessing methods: super.method()', '.', '',
                        this.offset, this.line, this.column
                    )
                }

                this.parent.accessor.superCall = true;

            },
            toJS: function () {
                return this.cls.extendFrom;
            }
        });

        type('TypedIdentifier', {
            init: function (type, identifier) {
                this.type = type;
                this.identifier = identifier;
            },
            traverse: function () {
                if (this.type === 'int') {
                    if (parser.options.optimize) {
                        var code = this.identifier + ' = ' + this.identifier + '|0';
                    }
                    else {
                        var code = 'if ~~' + this.identifier + ' != ' + this.identifier + '\n' +
                        '    throw new Error("' + this.identifier + ' was not of expected type ' + this.type + '")';
                    }
                    var node = parse(code, {startRule: 'Statement'});
                    this.parent.body.statements.unshift(node);
                }
            },
            toJS: function () {
                return this.identifier;
            }
        });

        type('Regex', {
            init: function(pattern, flags) {
                this.pattern = pattern;
                this.flags = flags;
            },
            toJS: function() {
                return '/' + this.pattern + '/' + this.flags;
            }
        })



    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();

},{"fs":2,"path":4,"util":7}],14:[function(require,module,exports){
var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs'));
var path = require('path');

module.exports.readDirAsync = function readDirAsync(dirName, filter) {
    return fs.readdirAsync(dirName)
        .map(function (fileName) {
            var filePath = path.join(dirName, fileName);
            return fs.statAsync(filePath)
                .then(function(stat) {
                    if (filter && filter(filePath)) return;
                    return stat.isDirectory() ? readDirAsync(filePath) : filePath;
                });
        })
        .reduce(function (a, b) {
            return a.concat(b);
        }, [])
        .then(function (files) {
          i = files.indexOf(undefined)
          while(i !== -1) {
            files.splice(i, 1)
            i = files.indexOf(undefined)
          }
          return files
        });
}

module.exports.checkDir = function checkDir(path, stat) {
    if (stat.isDirectory() && path[path.length-1] !== '/') {
        path += '/';
    }
    return path;
}

module.exports.repeat = function repeat(str, n) {
    return new Array(n + 1).join(str)
}

},{"bluebird":1,"fs":2,"path":4}]},{},[12])(12)
});