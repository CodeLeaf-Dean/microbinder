import ObjectHandler from './ObjectHandler.js'
import BindingContext from './../BindingContext.js'

export default class ArrayHandler extends ObjectHandler {
    constructor(mb, prop, proxy) {
        super(mb);
        this._childProxies = [];
        this._childContexts = [];
        this._bindElements = [];
    }
    
    _handleSplice(startIndex, deleteCount, pushCount, proxy){
        //Update Proxies
        var newArgs = [];
        newArgs[0] = startIndex;
        newArgs[1] = deleteCount;
        for(let na=0;na<pushCount;na++)newArgs[na+2] = null;
        Array.prototype.splice.apply(this._childProxies, newArgs);

        // Update child contexts
        if(this._bindElements.length > 0){
            let element = this._bindElements[0];
            element.$array.childContexts.splice(startIndex,deleteCount);
            for (let i = startIndex; i < startIndex + pushCount; i++) {
                const m = proxy[i];
                element.$array.childContexts.splice(i,0,new BindingContext(this.mb,m,i,element.$context));
            }
            for (let i = startIndex + pushCount; i < element.$array.childContexts.length; i++) {
                element.$array.childContexts[i].$index = i;
            }
        }

        // Remove deleted elements
        this._bindElements.forEach((element) => {
            for (let i = 0; i < deleteCount; i++) {
                element.bindArray[startIndex+i].forEach((node)=>node.remove());
            }
            var newArgs = [];
            newArgs[0] = startIndex;
            newArgs[1] = deleteCount;
            for(let na=0;na<pushCount;na++)newArgs[na+2] = [];
            Array.prototype.splice.apply(element.bindArray, newArgs);
        });

        // Add new elements
        this._bindElements.forEach((item)=>{
            var frag = document.createDocumentFragment();
            var insertFunc = item.insertFunc;
            //var $context = item.$context;
            for (let i = startIndex; i < startIndex + pushCount; i++) {
                const m = proxy[i];
                insertFunc.call(m, item.$array.childContexts[i], frag, item);
            }
            var ba = item.bindArray;
            if(startIndex == null || startIndex >= ba.length){
                item.appendChild(frag); 
            } else {
                if(startIndex == 0){
                    // Add to the start of the target
                    item.prepend(frag);
                } else {
                    var ba = item.bindArray[startIndex-1];
                    var startElement = ba[ba.length-1];
                    var endElement = startElement.nextSibling;
                    item.insertBefore(frag, endElement);
                }
            }
        });
        
        this.parentProxy._proxyHandler._notifySubscribers(this.parentProp, this.parentProxy);
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