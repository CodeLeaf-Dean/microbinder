class MicroBinder {
    constructor() {
        this._nextBindingId = 1;
        this._bindings = {};
        this._calculatingDependancies = false;
        this._calculatedDependancies = [];
        this.bindObjects = [];
        this.bindObjectCount = -1;
        this.defaultBinders = [
            {match:"input[type=text]",binder:"textInput"},
            {match:"ul",binder:"foreach"},
            {match:"button",binder:"click"}
        ];
        this.subBinders = {if:1,with:1,foreach:1};
        this.binders = {
            text:(e, c, js)=>mb.bind(c, js, (o,v) => e.innerText = v),
            html:(e, c, js)=>mb.bind(c, js, (o,v) => e.innerHTML = v),
            value:(e, c, js)=>{
                mb.bind(c, js, (o,v) => e.value = v||'');
                e.addEventListener("change", (event) => mb.setValue(c, js, event.target.value));
            },
            textInput:(e, c, js)=>{
                mb.bind(c, js, (o,v) => e.value = v||'');
                e.addEventListener("input", (event) => mb.setValue(c, js, event.target.value));
            },
            checked:(e, c, js)=>{
                mb.bind(c, js, (o,v) => {
                    if(v)e.setAttribute("checked","")
                    else e.removeAttribute("checked","")
                });
                e.addEventListener("change", (event) => mb.setValue(c, js, event.target.checked));
            },
            hasFocus:(e, c, js)=>{
                mb.bind(c, js, (o,v) => v ? e.focus() : e.blur());
                e.addEventListener("focus", (event) => mb.setValue(c, js, true));
                e.addEventListener("blur", (event) => mb.setValue(c, js, false));
            },
            css:(e,c,js)=>{
                // Add a binding for each css class
                var jsobj = js();
                for (const key in jsobj) {
                    mb.bind(c, jsobj[key], (o,v) => v?e.classList.add(key):e.classList.remove(key));
                }
            },
            attr:(e,c,js)=>{
                // Add a binding for each attribute
                var jsobj = js();
                for (const key in jsobj) {
                    mb.bind(c, jsobj[key], (o,v) => e.setAttribute(key, v));
                }
            },
            prop:(e,c,js)=>{
                // Add a binding for each property
                var jsobj = js();
                for (const key in jsobj) {
                    mb.bind(c, jsobj[key], (o,v) => e[key] = v);
                }
                e.addEventListener("propchange", (event) => {
                    if(js[event.name] != null){
                        mb.setValue(c, jsobj[event.name], event.newValue);
                    }
                });
            },
            props:(e,c,js)=>{
                // Add a binding for the entire object changing
                mb.bind(c, js, (o,obj) => {
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
            style:(e,c,js)=>{
                // Add a binding for each style
                var jsobj = js();
                for (const key in jsobj){
                    mb.bind(c, jsobj[key], (o,v) => e.style[key]=v);
                }
            },
            visible: (e, c, js)=> mb.bind(c, js, (o,v) => e.style.display = v ? null : "none"),
            click: (e, c, js)=> e.addEventListener("click", (event) => js()(c.$data, event)),
            enter:(e, c, js)=>{e.addEventListener("keypress", (event) => {if(event.keyCode === 13){js()(c.$data, event)}});},
            submit: (e, c, js)=> e.addEventListener("submit", (event) => js()(c.$data, event)),
            if: (e, c, js, boi) => {
                e.insertFunc = this.bindObjects[boi];
                e.$context = c;
                e._if = false;
                mb.bind(c, js, (o,v) => {
                    if(v && !e._if){
                        var frag = document.createDocumentFragment();
                        e.insertFunc.call(c.$data, c, frag, e);
                        e.appendChild(frag);
                        e._if = true;
                    } else if(!v && e._if) {
                        e.innerHTML = "";
                        e._if = false;
                    }
                });
            },
            with: (e, c, js, boi) => {
                e.insertFunc = this.bindObjects[boi];
                e.$context = c;
                mb.bind(c, js, (o,v) => {
                    e.innerHTML = "";
                    var frag = document.createDocumentFragment();
                    //e.insertFunc.call(v, v, 0, frag, e, null, v.$parent);
                    e.insertFunc.call(v, new BindingContext(v,0,c), frag, e);
                    e.appendChild(frag);
                });
            },
            foreach: (e, c, js, boi)=>{ 
                e.insertFunc = this.bindObjects[boi];
                e.$context = c;
                var arr = js.call(c.$data);
                e.$array = arr;
                e.bindArray = [];
                arr.proxyHandler._bindElements.push(e);
                var frag = document.createDocumentFragment();
                for (let index = 0; index < arr.length; index++) {
                    const item = arr[index];
                    if(arr.childContexts[index] == null){
                        arr.childContexts[index] = new BindingContext(item,index,c);
                    }
                    e.insertFunc.call(item, arr.childContexts[index], frag, e);
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
                var jsobj = js();
                for (const key in jsobj) {
                    const element = jsobj[key];
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

    bind($context, triggerFunc, eventFunc, oldValue){
        this._calculatingDependancies = true;
        this._calculatedDependancies = []
        var newValue = triggerFunc.call($context.$data);
        this._calculatingDependancies = false;
        if(this._calculatedDependancies.length > 0){
            var bindingId = this._nextBindingId++;
            this._bindings[bindingId] = [];
            this._calculatedDependancies.forEach(x=>x.handler._subscribe(x.prop, triggerFunc, eventFunc, bindingId));
        }
        eventFunc(oldValue, newValue);
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

    executeBinding(e, $context, o, boi){
        var stopBindingChildren = false;
        for (var p in o) {
            stopBindingChildren = mb.binders[p](e, $context, o[p], boi) | stopBindingChildren;
        }
    
        return stopBindingChildren;
    }

    _getDefaultBinder(e){
        for (let i = 0; i < this.defaultBinders.length; i++) {
            const d = this.defaultBinders[i];
            if(e.matches(d.match)) return d.binder;
        }
        return "text";
    }

    _buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset){
        arr.maxDepth = 0;
        arr.push("\nvar t = null;\n"); //, $index = null, $parent = null,$data = null;\n");
        arr.push("var renderedElements = [];\n");

        if(e.toString() === '[object NodeList]'){
            e.forEach(n => this._buildInsertFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
        }
        else {
            this._buildInsertFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
        }
        arr.push("if($funcElement){\n");
        arr.push("    if(!$funcElement.bindArray)$funcElement.bindArray=[];\n");
        arr.push("    $funcElement.bindArray[$context.$index] = renderedElements;\n");
        arr.push("}\n");
        return arr;
    }

    _buildInsertFunc(bindObjectArr, e, funcIndex, source, mapObj, offset){
        var arr = [];
        this._buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset);
        return new Function('$context,n0,$funcElement', arr.join(''));
    }

    _buildInsertFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        var stop = false;
        if(e.nodeType == 1){
            arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createElement('", e.nodeName ,"');\n");
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
                            var defaultBinder = this._getDefaultBinder(e);
                            v = "{" + defaultBinder + ":" + v + "}";
                        }
                        if(!v.startsWith("{")) v = "{" + v + "}";
                        // Wrap all bind attribute object propeties with functions
                        var fakeContext = {$data:new Proxy(function() {}, new FunctionTester()),$index: ()=>0};
                        var bindObject = new Function("$context", "with($context){with($data){ return " + v + "}}")(fakeContext);
                        for (const key in bindObject) {
                            v = v.replace(new RegExp(key + "\s*:"), key + ": ()=> ");
                        }

                        // check if the bind object has a binder that controls its children
                        stop = Object.keys(bindObject).some(r=> Object.keys(this.subBinders).indexOf(r) >= 0);
                        var bindObjectIndex = funcIndex;
                        if(stop){
                            //this.bindObjects.push(this._buildInsertFunc(e.childNodes, this.bindObjects.length + 1));
                            this.bindObjectCount ++;
                            bindObjectIndex = this.bindObjectCount;
                            bindObjectArr[this.bindObjectCount] = { code: ['\n    mb.bindObjects[',this.bindObjectCount,'] = ', this._buildInsertFunc(bindObjectArr, e.childNodes, this.bindObjectCount, source, mapObj, true), ';\n']};
                        }
                        arr.push("{");

                        var sourceLine = 0;
                        var targetLine = 0;
                        if(source){
                            // Get the line number for this element
                            var contentBefore = source.substr(0, source.indexOf(e.outerHTML))
                            targetLine = (contentBefore.match(/\n/g)??[]).length;
                            sourceLine = arr.join('').match(/\n/g).length + 3;// TODO: Perf
                            
                            if(offset){
                                if(mapObj.offset[funcIndex] == undefined){
                                    mapObj.offset[funcIndex] = [];
                                }
                                mapObj.offset[funcIndex][sourceLine] = targetLine;
                            } else {
                                mapObj.root[sourceLine] = targetLine;
                            }
                        }

                        arr.push("mb.executeBinding(n", depth, ", $context, (function(){with($context){with($data??{}){\nreturn ",v,"// line: ",sourceLine, ", offset: ", offset,", src: ", targetLine,"\n}}}).call($context.$data), ", bindObjectIndex, ");\n");
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
            arr.push("t = document.createTextNode(`", e.nodeValue.replace(/\\/g, "\\\\"), "`);\n");
            arr.push("n", depth-1 ,".appendChild(t);\n\n");
            if(depth-1==0)arr.push("renderedElements.push(t);\n\n");
        }
        if(!stop)e.childNodes.forEach(n => this._buildInsertFuncVisit(n, arr, bindObjectArr, depth+1, funcIndex, source, mapObj, offset));
    }

    _buildInsertFuncWithSourceMap(e, sourceName){
        var source;
        var mapObj = {root:[],offset:[]};
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
            source = temp.innerHTML;
        }
        
        var arr = ["function mb_start(){\n"];
        var bindObjectArr = [];
        
        this._buildInsertFuncBody(arr, bindObjectArr, e, 0, source, mapObj);

        arr.push("};");
        var lineOffset = arr.join('').match(/\n/g).length + 3;
        mapObj.root.length = lineOffset;

        for (let i = 0; i < bindObjectArr.length; i++) {
            const element = bindObjectArr[i];
            arr.push("// Offset: ", lineOffset);
            if(mapObj.offset[i] == undefined)mapObj.offset[i] = [];
            mapObj.offset[i].length = (element.code.join('').match(/\n/g)??[]).length;
            lineOffset += mapObj.offset[i].length;
            arr = arr.concat(element.code);
        }

        arr.push("\nmb_start();");

        arr.push("\n");
        arr.push("//# sourceMappingURL=data:text/plain;base64,");
        
        const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        const BIT_MASKS = {
            LEAST_FOUR_BITS: 0b1111,
            LEAST_FIVE_BITS: 0b11111,
            CONTINUATION_BIT: 0b100000,
            SIGN_BIT: 0b1,
        };

        function base64VlqEncode(integers) {
            return integers
                .map(vlqEncode)
                .map(base64Encode)
                .join('');
        }

        function vlqEncode(x) {
            if (x === 0) {
                return [0];
            }
            let absX = Math.abs(x);
            const sextets = [];
            while (absX > 0) {
                let sextet = 0;
                if (sextets.length === 0) {
                sextet = x < 0 ? 1 : 0; // set the sign bit
                sextet |= (absX & BIT_MASKS.LEAST_FOUR_BITS) << 1; // shift one ot make space for sign bit
                absX >>>= 4;
                } else {
                sextet = absX & BIT_MASKS.LEAST_FIVE_BITS;
                absX >>>= 5;
                }
                if (absX > 0) {
                sextet |= BIT_MASKS.CONTINUATION_BIT;
                }
                sextets.push(sextet);
            }
            return sextets;
        }

        function base64Encode(vlq) {
            return vlq.map(s => BASE64_ALPHABET[s]).join('');
        }

        var mappings = "";
        var pos = 0;
        for (let i = 0; i < mapObj.root.length; i++) {
            const element = mapObj.root[i];
            if(element != undefined){
                var diff = element - pos;
                mappings = mappings + base64VlqEncode([0,0,diff,0]);
                pos += diff;
            }
            mappings = mappings + ";"
        }

        for (let i = 0; i < mapObj.offset.length; i++) {
            const maps = mapObj.offset[i];
            for (let j = 0; j < maps.length; j++) {
                const element = maps[j];
                if(element != undefined){
                    var diff = element - pos;
                    mappings = mappings + base64VlqEncode([0,0,diff,0]);
                    pos += diff;
                }
                mappings = mappings + ";"
            }
        }

        var sourceMap = 
        {
            "version": 3,
            "sources": [
                sourceName + ".template"
            ],
            "names": [],
            "mappings": mappings,
            "sourcesContent": [source]
        };

        arr.push(btoa(JSON.stringify(sourceMap)));
        arr.push("\n");
        arr.push("//# sourceURL=" + sourceName + ".template.js");

        return new Function('$context,n0,$funcElement', arr.join(''));
    }

    _generateRootInsertFunc(target, template){
        return new Promise((resolve, reject) => {
            var tempElement = null;
            var templateName = "microbinder-root-template";
            if(typeof template === "string"){
                var temp = document.getElementById(template);
                if(temp != null){
                    if(temp.nodeName == 'LINK'){
                        templateName = temp.href;
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET",temp.href);
                        xhr.onreadystatechange = (function () {
                            if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                            //mb.render(model.proxyObject, target, xhr.responseText);
                                resolve(this._buildInsertFuncWithSourceMap(xhr.responseText));
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
            if(tempElement == null) tempElement = target || document.body.childNodes;
            if(target == null) target = document.body;

            resolve(this._buildInsertFuncWithSourceMap(tempElement, templateName));
        });
    }

    makeProxy(model){
        return typeof model === 'object' && !model.isProxy ? new Proxy(model, new ObjectHandler()) : model;
    }

    build(target, template){
        return new Promise((resolve, reject) => {
            this._generateRootInsertFunc(target, template).then(insertFunc => {
                resolve(insertFunc)
            }).catch(err => reject(err));
        });
        // var insertFunc = this._generateRootInsertFunc(target, template);
        // return insertFunc;
    }

    run(model, target, insertFunc){
        var modelProxy = this.makeProxy(model);
        var rootContext = new BindingContext(modelProxy);
        insertFunc.call(modelProxy, rootContext, target);
        return modelProxy;
    }

    render(model, target, template){
       return this.build(target, template).then(insertFunc => {
            return this.run(model, target ?? document.body, insertFunc);
       });
    }
}
var mb = new MicroBinder();

/// This class is used to create a js object from the binding string so that we can get a list of its used properties. 
/// The alternative to this approach would be to use regular expressions or a code parser
class FunctionTester {
    has(obj, prop) {return true;}
    get(obj, prop, proxy) {
        if(prop == Symbol.unscopables) 
            return {};
        if(prop == Symbol.toPrimitive || prop == "toString")
            return ()=>"";
        return proxy;
    }
    set(obj, prop, val, proxy) {}
    apply(obj, thisArg, argumentsList) {return this;}
}

class ObjectHandler {
    constructor() {
        this._handler = this;
        this._childProxies = {};
        this._subscribers = {};
        this.parentProxy = null;
    }

    _subscribe(prop, triggerFunc, eventFunc, bindingId){
        if(this._subscribers[prop] == null)this._subscribers[prop] = [];
        var propSubscribers = this._subscribers[prop];
        var sub = {
            _subscription:()=>this._subscribers[prop],
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
                mb._bindings[x].forEach(y=>y._subscription().splice(y._subscription().indexOf(y),1));
                delete mb._bindings[x];
            });
        }
    }

    get(obj, prop, proxy) {
        if(prop === "proxyHandler") return this;
        if(prop === "parentProxy") return this.parentProxy;
        if(prop === "isProxy") return true;
        if(prop === "proxyObject") return obj;
        //if(prop === "subscribe") return this._subscribe;
        var val = Reflect.get(obj, prop, proxy);
        
        if(mb._calculatingDependancies){
            if(!mb._calculatedDependancies.find(element => element.handler == this && element.prop == prop)){
                mb._calculatedDependancies.push({handler: this, prop: prop});
            }
        }

        if(!(this instanceof DateHandler) && mb._settingValue){
            mb._setStack.push((v)=>proxy[prop]=v);
        }

        if (val != null && typeof val === 'object') {
            if(this._childProxies[prop] == null){
                var handler = Object.prototype.toString.call(val) === '[object Date]' ? new DateHandler() : Array.isArray(val) ? new ArrayHandler(prop,proxy) : new ObjectHandler();
                handler.parentProxy = proxy;
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
        this._childContexts = [];
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

        // Update child contexts
        if(this._bindElements.length > 0){
            let element = this._bindElements[0];
            element.$array.childContexts.splice(startIndex,deleteCount);
            for (let i = startIndex; i < startIndex + pushCount; i++) {
                const m = proxy[i];
                element.$array.childContexts.splice(i,0,new BindingContext(m,i,element.$context));
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
        
        this._parentProxy.proxyHandler._notifySubscribers(this._parentProp, this._parentProxy);
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

class BindingContext{
    constructor(data, index, parentContext) {
        this.$data = data;
        this.$parentContext = parentContext;
        this._proxy = new Proxy({$index:index}, new ObjectHandler());
    }

    get $parent() {
        return this.$parentContext.$data;
    }

    get $index() {
        if(mb._calculatingDependancies) mb._calculatedDependancies.push({handler: this._proxy.proxyHandler, prop: '$index'});
        return this._proxy.$index;;
    }
    set $index(value) {
        this._proxy.$index = value;
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
        this.attributesBound = false;
        //return new Proxy(this,new ObjectHandler());
    }
    useShadow(){
        this.shadow = this.attachShadow({mode: 'open'});
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
        this.attributesBound = true;
    }
    
    disconnectedCallback() {
    }

    adoptedCallback() {
    }

    connectedCallback() {
        mb.render(this.proxy, this.shadow?this.shadow:this, this.template);
        // set the attributes for any properties which are bound
        if(this.__proto__.constructor.observedAttributes){
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
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if(this.attributesBound && !this.settingAttribute){
            this.handlingAttributeChange = true;
            this.proxy[this.attributeProperty[name]] = newValue;
            this.handlingAttributeChange = false;
        }
    }
}

mb.templateClass = function(template){
    var wrapperClass = class TemplateClass extends MicroBinderHTMLElement{
        constructor() {
            super(template);
            this.useShadow();
        }
    };
    return wrapperClass;
}