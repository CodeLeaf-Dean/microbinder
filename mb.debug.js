class MicroBinder {
    constructor() {
        this._nextBindingId = 1;
        this._bindings = {};
        this._calculatingDependancies = false;
        this._calculatedDependancies = [];
        this.bindObjects = [];
        this.subBinders = {if:1,with:1,foreach:1};
        this.binders = {
            text:(e, m, js)=>mb.bind(m, js, (o,v) => e.innerText = v),
            html:(e, m, js)=>mb.bind(m, js, (o,v) => e.innerHTML = v),
            value:(e, m, js)=>{
                mb.bind(m, js, (o,v) => e.value = v||'');
                e.addEventListener("change", (event) => mb.setValue(m, js, event.target.value));
            },
            textInput:(e, m, js)=>{
                mb.bind(m, js, (o,v) => e.value = v||'');
                e.addEventListener("input", (event) => mb.setValue(m, js, event.target.value));
            },
            checked:(e, m, js)=>{
                mb.bind(m, js, (o,v) => {
                    if(v)e.setAttribute("checked","")
                    else e.removeAttribute("checked","")
                });
                e.addEventListener("change", (event) => mb.setValue(m, js, event.target.checked));
            },
            hasFocus:(e, m, js)=>{
                mb.bind(m, js, (o,v) => v ? e.focus() : e.blur());
                e.addEventListener("focus", (event) => mb.setValue(m, js, true));
                e.addEventListener("blur", (event) => mb.setValue(m, js, false));
            },
            css:(e,m,js)=>{
                // Add a binding for each css class
                for (const key in js) mb.bind(m, js[key], (o,v) => v?e.classList.add(key):e.classList.remove(key));
            },
            attr:(e,m,js)=>{
                // Add a binding for each attribute
                for (const key in js) mb.bind(m, js[key], (o,v) => e.setAttribute(key, v));
            },
            prop:(e,m,js)=>{
                // Add a binding for each property
                for (const key in js) {
                    mb.bind(m, js[key], (o,v) => e[key] = v);
                }
                e.addEventListener("propchange", (event) => {
                    if(js[event.name] != null){
                        mb.setValue(m, js[event.name], event.newValue);
                    }
                });
            },
            props:(e,m,js)=>{
                // Add a binding for the entire object changing
                mb.bind(m, js, (o,obj) => {
                    // Add a binding for each property
                    for (const key in obj) {
                        mb.bind(obj, ()=>obj[key], (o,v) => e[key] = v);
                    }
                });
                e.addEventListener("propchange", (event) => {
                    var obj = js();
                    if(obj[event.name] != null){
                        mb.setValue(obj, ()=>obj[event.name], event.newValue);
                    }
                });
            },
            style:(e,m,js)=>{
                // Add a binding for each style
                for (const key in js)mb.bind(m, js[key], (o,v) => e.style[key]=v);
            },
            visible: (e, m, js)=> mb.bind(m, js, (o,v) => e.style.display = v ? null : "none"),
            click: (e, m, js)=> e.addEventListener("click", (event) => js.call(m, e)),
            submit: (e, m, js)=> e.addEventListener("submit", (event) => js.call(m, e)),
            if: (e, m, js, boi) => {
                e.insertFunc = this.bindObjects[boi-1];
                mb.bind(m, js, (o,v) => {
                    if(v){
                        var frag = document.createDocumentFragment();
                        e.insertFunc.call(m, m, ()=>0, frag, e, null, m.$parent);
                        e.appendChild(frag);
                    } else {
                        e.innerHTML = "";
                    }
                });
            },
            with: (e, m, js, boi) => {
                e.insertFunc = this.bindObjects[boi-1];
                mb.bind(m, js, (o,v) => {
                    e.innerHTML = "";
                    var frag = document.createDocumentFragment();
                        e.insertFunc.call(v, v, ()=>0, frag, e, null, v.$parent);
                        e.appendChild(frag);
                });
            },
            foreach: (e, m, js, boi)=>{ 
                e.insertFunc = this.bindObjects[boi-1];
                var arr = js.call(m);
                e.bindArray = [];
                arr.proxyHandler._bindElements.push(e);
                var frag = document.createDocumentFragment();
                for (let index = 0; index < arr.length; index++) {
                    const item = arr[index];
                    e.insertFunc.call(item, item, index, frag, e, arr.proxyHandler, arr);
                }
                e.appendChild(frag);
            },
            selectedOptions:(e,m,js)=>{
                mb.bind(m, js, (o,v) => {
                    var vs = v.map(s=>s.toString());
                    Array.from(e.options).forEach(o=>o.selected = vs.indexOf(o.value)>-1);
                });
                e.addEventListener("change", (event) => {
                    var selectedOptions = Array.from(event.target.selectedOptions).map((x)=>x.value);
                    mb.setValue(m, js, selectedOptions);
                });
            },
            event:(e,m,js)=>{
                // Add a binding for each event
                for (const key in js) {
                    const element = js[key];
                    e.addEventListener(key, (event) => element.call(m, e));
                }
            },
            enable:(e,m,js)=>{
                mb.bind(m, js, (o,v) => !v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'));      
            },
            disable:(e,m,js)=>{
                mb.bind(m, js, (o,v) => v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'));      
            }
        }
    }

    bind(model, triggerFunc, eventFunc, oldValue){
        this._calculatingDependancies = true;
        this._calculatedDependancies = []
        var newValue = triggerFunc.call(model);
        this._calculatingDependancies = false;
        if(this._calculatedDependancies.length > 0){
            var bindingId = this._nextBindingId++;
            this._bindings[bindingId] = [];
            this._calculatedDependancies.forEach(x=>x.handler._subscribe(x.prop, triggerFunc, eventFunc, bindingId));
        }
        eventFunc(oldValue, newValue);
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

    executeBinding(e, $data, o, boi){
        var stopBindingChildren = false;
        for (var p in o) {
            stopBindingChildren = mb.binders[p](e, $data, o[p], boi) | stopBindingChildren;
        }
    
        return stopBindingChildren;
    }

    indexFunc(e, handler){
        var c = e;
        while(c.bindIndex == null) c = c.parentNode;
        if(mb._calculatingDependancies) mb._calculatedDependancies.push({handler: handler, prop: '$index'});
        return c.bindIndex;
    }

    _buildInsertFunc(e){
        var arr = [];
        arr.maxDepth = 0;
        arr.push("var t = null, $index = null;\n");
        arr.push("var renderedElements = [];\n");
        if(e.toString() === '[object NodeList]')
            e.forEach(n => this._buildInsertFuncVisit(n, arr, 1));
        else 
            this._buildInsertFuncVisit(e,arr,0);
        arr.push("if(!$funcElement.bindArray)$funcElement.bindArray=[];\n");
        arr.push("$funcElement.bindArray[index] = renderedElements;\n");
        return new Function('$data,index,n0,$funcElement,handler,$parent', arr.join(''));
    }

    _buildInsertFuncVisit(e, arr, depth){
        var stop = false;
        if(e.nodeType == 1){
            arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createElement('", e.nodeName ,"');\n");
            if(depth==1){
                arr.push("n", depth ,".bindIndex = index;\n");
                arr.push("$index = mb.indexFunc.bind(null, n", depth ,",handler);\n");
            }
            if(depth > arr.maxDepth)arr.maxDepth = depth;

            if (e.hasAttributes()) {
                var attrs = e.attributes;
                for(let i = attrs.length - 1; i >= 0; i--) {
                    const a = attrs[i].name;
                    const v = attrs[i].value;
                    if(a == 'bind'){
                        // check if the bind object has a binder that controls its children
                        var bindObject = new Function("return " + v)();
                        stop = Object.keys(bindObject).some(r=> Object.keys(this.subBinders).indexOf(r) >= 0);
                        if(stop){
                            this.bindObjects.push(this._buildInsertFunc(e.childNodes));
                        }
                        arr.push("{ let $element = n", depth, ";");
                        arr.push("mb.executeBinding(n", depth, ", $data, ",v,", ", this.bindObjects.length, ");\n");
                        arr.push('}');
                    } else {
                        arr.push("n", depth, ".setAttribute('", a, "', '", v, "');\n");
                    }
                }
            }

            arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
            if(depth-1==0)arr.push("renderedElements.push(n", depth, ");\n\n");
        }
        else if(e.nodeType == 3){
            arr.push("t = document.createTextNode(`", e.nodeValue, "`);\n");
            arr.push("n", depth-1 ,".appendChild(t);\n\n");
            if(depth-1==0)arr.push("renderedElements.push(t);\n\n");
        }
        if(!stop)e.childNodes.forEach(n => this._buildInsertFuncVisit(n, arr, depth+1));
    }

    render(model, target, template){
        var modelProxy = typeof model === 'object' && !model.isProxy ? new Proxy(model, new ObjectHandler()) : model;
        var tempElement = null;
        if(typeof template === "string"){
            var temp = document.getElementById(template);
            if(temp != null){
                tempElement = temp.content ? temp.content.cloneNode(true) : document.createRange().createContextualFragment(temp.innerHTML);
            } else {
                var frag = document.createDocumentFragment();
                frag.innerHTML = template;
                tempElement = frag.content;
            }
        } else {
            tempElement = template;
        }
        if(tempElement == null) tempElement = target || document.body;

        var insertFunc = this._buildInsertFunc(tempElement, modelProxy);
        insertFunc.call(modelProxy, modelProxy, ()=>0, target, target);

        return modelProxy;
    }
}
var mb = new MicroBinder();

class ObjectHandler {
    constructor() {
        this._handler = this;
        this._childProxies = {};
        this._subscribers = {};
        this.$parent = null;
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

    _notifySubscribers(prop, proxy, oldValue, newValue){
        if(this._subscribers[prop] != null){
            var bindingsToRemove = [];
            this._subscribers[prop].forEach(x=>{
                mb.bind(proxy, x._triggerFunc, x._eventFunc, oldValue);
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
        if(prop === "$parent") return this.$parent;
        if(prop === "isProxy") return true;
        if(prop === "proxyObject") return obj;
        //if(prop === "subscribe") return this._subscribe;
        var val = Reflect.get(obj, prop, proxy);
        
        if(mb._calculatingDependancies){
            mb._calculatedDependancies.push({handler: this, prop: prop});
        }

        if(!(this instanceof DateHandler) && mb._settingValue){
            mb._setStack.push((v)=>proxy[prop]=v);
        }

        if (val != null && typeof val === 'object') {
            if(this._childProxies[prop] == null){
                var handler = Object.prototype.toString.call(val) === '[object Date]' ? new DateHandler() : Array.isArray(val) ? new ArrayHandler(prop,proxy) : new ObjectHandler();
                handler.$parent = proxy;
                this._childProxies[prop] = new Proxy(val, handler);
            }
            return this._childProxies[prop];
        }

        return val;
    }

    set(obj, prop, val, proxy) {
        // Dont ever set a property to be a proxy. Unwrap it first.
        if(val!=null&&val['isProxy'])val = val.proxyObject;
        var oldVal = obj[prop];
        var result = Reflect.set(obj, prop, val, proxy);
        
        // If we are setting an object property, clear out the existing childProxy
        if (typeof val === 'object') {
            var currentProxy = this._childProxies[prop];
            delete this._childProxies[prop];

            // If we are replacing an entire array, treat it as emptying the current array, then filling the new one
            if (Array.isArray(val)) {
                var newProxy = proxy[prop];
                if(currentProxy){
                    currentProxy.length = 0;
                    newProxy.proxyHandler._bindElements = currentProxy.proxyHandler._bindElements;
                }
                newProxy.proxyHandler._handleSplice(0,0,val.length, newProxy);
            }
        }
        
        // Notify subscribers of the change
        this._notifySubscribers(prop, proxy, oldVal, val);

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
                    this._notifySubscribers(prop, proxy, original, result);
                }
                return result;
            }.bind(this);
        }
        return val;
    }
    set(obj, prop, val, proxy) {
        return super.set(obj, prop, val, proxy);
    }
}

class ArrayHandler extends ObjectHandler {
    constructor(prop, proxy) {
        super();
        this._childProxies = [];
        this._bindElements = [];
        this._parentProp = prop;
        this._parentProxy = proxy;
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
        this._bindElements.forEach((item)=>{
            var frag = document.createDocumentFragment();
            var insertFunc = item.insertFunc;
            for (let i = startIndex; i < startIndex + pushCount; i++) {
                const m = proxy[i];
                insertFunc.call(m, m, i, frag, item, this, proxy);
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
              
        // Update the bindIndex of the remaining nodes
        this._bindElements.forEach((element) => {
            for (let i = startIndex + pushCount; i < element.bindArray.length; i++) {
                element.bindArray[i].forEach((node)=> node.bindIndex = i);
            }
        });

        this._notifySubscribers('$index', proxy);
        this._parentProxy.proxyHandler._notifySubscribers(this._parentProp, this._parentProxy);
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

class CustomElementHandler extends ObjectHandler {
    constructor() {
        super();
    }
    get(obj, prop, proxy) {
        var val = super.get(obj, prop, proxy);
        if (typeof val === 'function') {
            return function (el) {
                var result = val.apply(obj, arguments);
                return result;
            }.bind(this);
        }
        return val;
    }
}

class MicroBinderHTMLElement extends HTMLElement{
    constructor(template) {
        super();
        this.template = template;
        this.handlingAttributeChange= false;
        this.settingAttribute = false;
        this.proxy = new Proxy(this,new CustomElementHandler());
        this.attributeProperty = {};
        //return new Proxy(this,new ObjectHandler());
    }

    bindAttributes(){
        this.__proto__.constructor.observedAttributes.forEach(name=> {
            // find and store property name that matches the lowercase attribute
            this.attributeProperty[name] = (()=>{for (const key in this) if(key.toLowerCase() == name) return key})();
            let propName = this.attributeProperty[name];
            // read attribute values and set initial property values
            this.proxy[propName] = this.getAttribute(name)||this[propName];
            // when a property changes, update the attribute
            mb.bind(this.proxy, ()=>this.proxy[propName], (oldVal, newVal) => {
                if(oldVal!=newVal){
                    if(!this.handlingAttributeChange){
                        if(newVal== ""){
                            this.removeAttribute(name);
                        } else {
                            this.settingAttribute = true;
                            this.setAttribute(name, newVal);
                            this.settingAttribute = false;
                        }
                    }
                    // fire an event that the property was changed
                    var e = new Event('propchange');
                    e.name = propName;
                    e.newValue = newVal;
                    this.dispatchEvent(e);
                }
            });
        });
    }
    
    disconnectedCallback() {
    }

    adoptedCallback() {
    }

    connectedCallback() {
        mb.render(this.proxy, this, this.template);
        // set the attributes for any properties which are bound
        this.settingAttribute = true;
        this.__proto__.constructor.observedAttributes.forEach(name=> {
            let propName = this.attributeProperty[name];
            var newVal = this[propName];
            if(newVal == ""){
                this.removeAttribute(name);
            } else {
                this.setAttribute(name, newVal);
            }
        });
        this.settingAttribute = false;
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if(!this.settingAttribute){
            this.handlingAttributeChange = true;
            this.proxy[this.attributeProperty[name]] = newValue;
            this.handlingAttributeChange = false;
        }
    }
}