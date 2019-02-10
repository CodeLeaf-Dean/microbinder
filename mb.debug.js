class MicroBinder {
    constructor() {
        this._nextBindingId = 1;
        this._bindings = {};
        this._calculatingDependancies = false;
        this._calculatedDependancies = [];
        this.bindObjects = [];
        this.binders = {
            text:(e, m, js)=>mb.bind(m, js, (v) => e.innerText = v),
            html:(e, m, js)=>mb.bind(m, js, (v) => e.innerHTML = v),
            value:(e, m, js)=>{
                mb.bind(m, js, (v) => e.value = v);
                e.addEventListener("change", (event) => mb.setValue(m, js, event.target.value));
            },
            checked:(e, m, js)=>{
                mb.bind(m, js, (v) => {
                    if(v)e.setAttribute("checked","")
                    else e.removeAttribute("checked","")
                });
                e.addEventListener("change", (event) => mb.setValue(m, js, event.target.checked));
            },
            css:(e,m,js)=>{
                // Add a binding for each css class
                for (const key in js) {
                    const element = js[key];
                    mb.bind(m, element, (v) => v?e.classList.add(key):e.classList.remove(key));      
                }
            },
            attr:(e,m,js)=>{
                // Add a binding for each attribute
                for (const key in js) {
                    const element = js[key];
                    mb.bind(m, element, (v) => e.setAttribute(key, v));      
                }
            },
            style:(e,m,js)=>{
                // Add a binding for each attribute
                for (const key in js) {
                    const element = js[key];
                    mb.bind(m, element, (v) => e.style[key]=v);      
                }
            },
            visible: (e, m, js)=> mb.bind(m, js, (v) => e.style.display = v ? null : "none"),
            click: (e, m, js)=> e.addEventListener("click", (event) => js.call(m, e)),
            foreach: (e, m, js)=>{ 
                var subTemplate = e.innerHTML;
                e.innerHTML = "";
                var arr = js.call(m);
                e.bindArray = [];
                arr.proxyHandler._bindElements.push(e);
            
                var insertFunc = (item, index)=> {
                    var renderedElement = mb.render(item, e, subTemplate, index, m);
                    if(e.bindArray[index]==null)e.bindArray[index] = [];
                    e.bindArray[index] = renderedElement;
                };
                e.insertFunc = insertFunc;
                arr.forEach(insertFunc);
                return true;
            }
        }
    }

    bind(model, triggerFunc, eventFunc){
        this._calculatingDependancies = true;
        this._calculatedDependancies = []
        var newValue = triggerFunc.call(model);
        this._calculatingDependancies = false;
        if(this._calculatedDependancies.length > 0){
            var bindingId = this._nextBindingId++;
            this._bindings[bindingId] = [];
            this._calculatedDependancies.forEach(x=>x.handler._subscribe(x.prop, triggerFunc, eventFunc, bindingId));
        }
        eventFunc(newValue);
    }

    setValue(model, triggerFunc, value){
        this._settingValue = true;
        this._setStack = [];
        var val = triggerFunc.call(model);
        this._settingValue = false;
        if(this._setStack.length > 0){
            this._setStack.pop()(value);
        }
    }

    _executeBinding(e, $data, o){
        var stopBindingChildren = false;
        for (var p in o) {
            stopBindingChildren = mb.binders[p](e, $data, o[p]) | stopBindingChildren;
        }
    
        return stopBindingChildren;
    }

    _indexFunc(e){
        var c = e;
        while(c.bindIndex == null) c = c.parentNode;
        return c.bindIndex;
    }

    _bindElement(modelProxy, e, index, parent, rootElement){
        var stop = false;
        if(e.nodeType == 1 && e.hasAttribute('bind')){
            var t = e.getAttribute('bind');
            e.removeAttribute('bind');
            if(t != null && t.length > 0){

                var tInt = parseInt(t);
                if(!isNaN(tInt)){
                    var bindObject = this.bindObjects[tInt].call(modelProxy,e,modelProxy,()=>this._indexFunc(e), parent, rootElement);
                    stop = this._executeBinding(e, modelProxy, bindObject);
                } else {
                    var bindObject = new Function('$element,$data,$index,$parent,$root', 'return ' + t + ';').call(modelProxy,e,modelProxy,()=>this._indexFunc(e), parent, rootElement);
                    stop = this._executeBinding(e, modelProxy, bindObject);
                }
            }
        }
        if(!stop){
            e.childNodes.forEach(n => this._bindElement(modelProxy, n, index, parent, rootElement));
        } 
    }

    render(model, target, template, index, parent){
        var modelProxy = typeof model === 'object' && !model.isProxy ? new Proxy(model, new ObjectHandler()) : model;
        
        var tempElement = null;
        if(typeof template === "string"){
            var temp = document.getElementById(template);
            if(temp != null){
                if(temp.hasAttribute('src')){
                    loadExternalTemplate(temp, model, target, index, parent);
                    return;
                }
                tempElement = temp.content ? temp.content.cloneNode(true) : document.createRange().createContextualFragment(temp.innerHTML);
            } else {
                tempElement = document.createRange().createContextualFragment(template)
            }
        } else {
            tempElement = template;
        }
        if(tempElement == null) tempElement = target || document.body;
        
        // if there is an index, set the bindIndex for all child nodes of the view
        if(index != null){
            for (let i = 0; i < tempElement.childNodes.length; i++) {
                tempElement.childNodes[i].bindIndex = index;
            }
        }

        this._bindElement(modelProxy, tempElement, index, parent, target || document.body);

        var addedNodes = [];
        if(template != null){
            var ba = target.bindArray;
            if(index == null || index >= ba.length){
                // Add to the end of target
                var lastNodeIndex = target.childNodes.length;
                target.appendChild(tempElement);

                for (let i = lastNodeIndex; i < target.childNodes.length; i++) {
                    addedNodes.push(target.childNodes[i]);
                }
            } else {
                if(index == 0){
                    // Add to the start of the target
                    var originalNodeCount = target.childNodes.length;
                    target.prepend(tempElement);
                    var addedNodeCount = target.childNodes.length - originalNodeCount;
                    for (let i = 0; i < addedNodeCount; i++) {
                        addedNodes.push(target.childNodes[i]);
                    }
                } 
                else {
                    // Add to the middle of the target
                    var ba = target.bindArray[index-1];
                    var startElement = ba[ba.length-1];
                    var endElement = startElement.nextSibling;
                    var inserted = target.insertBefore(tempElement, endElement);

                    var currentElement = startElement.nextSibling;
                    while(currentElement != endElement){
                        addedNodes.push(currentElement);
                        currentElement = currentElement.nextSibling;
                    }
                }
            }
        }

        return index == null? modelProxy : addedNodes;
    }
}
var mb = new MicroBinder();

class ObjectHandler {
    constructor() {
        this._handler = this;
        this._childProxies = {};
        this._subscribers = {};
    }

    _subscribe(prop, triggerFunc, eventFunc, bindingId){
        if(this._subscribers[prop] == null)this._subscribers[prop] = [];
        var propSubscribers = this._subscribers[prop];
        var sub = {
            _subscription:propSubscribers,
            _triggerFunc:triggerFunc,
            _eventFunc:eventFunc,
            _bindingId:bindingId
        };
        propSubscribers.push(sub);
        mb._bindings[bindingId].push(sub);
    }

    _notifySubscribers(prop, proxy){
        if(this._subscribers[prop] != null){
            var bindingsToRemove = [];
            this._subscribers[prop].forEach(x=>{
                mb.bind(proxy, x._triggerFunc, x._eventFunc);
                bindingsToRemove.push(x._bindingId);
            });
            bindingsToRemove.forEach(x=>{
                mb._bindings[x].forEach(y=>y._subscription.splice(y._subscription.indexOf(y),1));
                delete mb._bindings[x];
            });
        }
    }

    get(obj, prop, proxy) {
        if(prop === "proxyHandler") return this;
        if(prop === "isProxy") return true;
        if(prop === "proxyObject") return obj;
        var val = Reflect.get(obj, prop, proxy);
        
        if(mb._calculatingDependancies){
            mb._calculatedDependancies.push({handler: this, prop: prop});
        }

        if(!(this instanceof DateHandler) && mb._settingValue){
            mb._setStack.push((v)=>proxy[prop]=v);
        }

        if (typeof val === 'object') {
            if(this._childProxies[prop] == null){
                this._childProxies[prop] = new Proxy(val, Object.prototype.toString.call(val) === '[object Date]' ? new DateHandler() : Array.isArray(val) ? new ArrayHandler() : new ObjectHandler());
            }
            return this._childProxies[prop];
        }

        return val;
    }

    set(obj, prop, val, proxy) {
        // Dont ever set a property to be a proxy. Unwrap it first.
        if(val['isProxy'])val = val.proxyObject;
        var result = Reflect.set(obj, prop, val, proxy);
        
        // If we are setting an object property, clear out the existing childProxy
        if (typeof val === 'object') {
            var currentProxy = this._childProxies[prop];
            delete this._childProxies[prop];

            // If we are replacing an entire array, treat it as emptying the current array, then filling the new one
            if (Array.isArray(val)) {
                currentProxy.length = 0;
                var newProxy = proxy[prop];
                newProxy.proxyHandler._bindElements = currentArrayProxy.proxyHandler._bindElements;
                newProxy.proxyHandler._handleSplice(0,0,val.length, val);
            }
        }
        
        // Notify subscribers of the change
        this._notifySubscribers(prop, proxy);

        return result;
    }
}

class DateHandler extends ObjectHandler {
    constructor() {
        super();
    }
    get(obj, prop, proxy) {
        var val = super.get(obj, prop, proxy);
        if (typeof val === 'function') {
            return function (el) {
                var original = obj;
                var result = val.apply(obj, arguments);
                if(obj != original){
                    this._notifySubscribers(prop, proxy);
                }
                return result;
            }.bind(this);
        }
        return val;
    }
}

class ArrayHandler extends ObjectHandler {
    constructor() {
        super();
        this._childProxies = [];
        this._bindElements = [];
    }
    
    _handleSplice(startIndex, deleteCount, pushCount, proxy){
        //Update Proxies
        var newArgs = [];
        newArgs[0] = startIndex;
        newArgs[1] = deleteCount;
        for(let na=0;na<pushCount;na++)newArgs[na+2] = null;
        Array.prototype.splice.apply(this._childProxies, newArgs);

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
        for (let i = startIndex; i < startIndex + pushCount; i++) {
            this._bindElements.forEach((item)=>{
                item.insertFunc(proxy[i], i);
            });
        }
        // Update the bindIndex of the remaining nodes
        this._bindElements.forEach((element) => {
            for (let i = startIndex + pushCount; i < element.bindArray.length; i++) {
                element.bindArray[i].forEach((node)=> node.bindIndex = i);
            }
        });
    }

    get(obj, prop, proxy) {
        var val = super.get(obj, prop, proxy);

        if (typeof val === 'function') {
            if(prop === 'splice'){
                return function (el) {
                    var startIndex = arguments[0];
                    if(startIndex > this.length)startIndex = this.length;
                    if(startIndex < -this.length)startIndex = 0;
                    if(startIndex<0)startIndex = this.length + startIndex + 1;
                    var deleteCount = arguments.length == 1 ? this.length - startIndex : arguments[1];
                    if(deleteCount > this.length - startIndex)deleteCount = this.length - startIndex;
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