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
