import BindingContext from './BindingContext.js'
import ObjectHandler from './ProxyHandlers/ObjectHandler.js'

export default class MicroBinder {
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
            text:(e, c, js)=>this.bind(c, js, (o,v) => e.innerText = v),
            html:(e, c, js)=>this.bind(c, js, (o,v) => e.innerHTML = v),
            value:(e, c, js)=>{
                this.bind(c, js, (o,v) => e.value = v||'');
                e.addEventListener("change", (event) => this.setValue(c, js, event.target.value));
            },
            textInput:(e, c, js)=>{
                this.bind(c, js, (o,v) => e.value = v||'');
                e.addEventListener("input", (event) => this.setValue(c, js, event.target.value));
            },
            checked:(e, c, js)=>{
                this.bind(c, js, (o,v) => {
                    if(v)e.setAttribute("checked","")
                    else e.removeAttribute("checked","")
                });
                e.addEventListener("change", (event) => this.setValue(c, js, event.target.checked));
            },
            hasFocus:(e, c, js)=>{
                this.bind(c, js, (o,v) => v ? e.focus() : e.blur());
                e.addEventListener("focus", (event) => this.setValue(c, js, true));
                e.addEventListener("blur", (event) => this.setValue(c, js, false));
            },
            css:(e,c,js)=>{
                // Add a binding for each css class
                var jsobj = js();
                for (const key in jsobj) {
                    this.bind(c, jsobj[key], (o,v) => v?e.classList.add(key):e.classList.remove(key));
                }
            },
            attr:(e,c,js)=>{
                // Add a binding for each attribute
                var jsobj = js();
                for (const key in jsobj) {
                    this.bind(c, jsobj[key], (o,v) => e.setAttribute(key, v));
                }
            },
            prop:(e,c,js)=>{
                // Add a binding for each property
                var jsobj = js();
                var settingValue = false;
                for (const key in jsobj) {
                    this.bind(c, jsobj[key], (o,v) => {
                        if(e.proxy[key] != v){
                            settingValue = true;
                            e.proxy[key] = v;
                            settingValue = false;
                        }
                    });
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
                this.bind(c, js, (o,obj) => {
                    // Add a binding for each property
                    for (const key in obj) {
                        this.bind(obj, ()=>obj[key], (o,v) => {
                            if(e.proxy[key] != v){
                                settingValue = true;
                                e.proxy[key] = v;
                                settingValue = false;
                            }
                        });
                    }
                });
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
                    this.bind(c, jsobj[key], (o,v) => e.style[key]=v);
                }
            },
            visible: (e, c, js)=> this.bind(c, js, (o,v) => e.style.display = v ? null : "none"),
            click: (e, c, js)=> e.addEventListener("click", (event) => js()(c.$data, event)),
            enter:(e, c, js)=>{e.addEventListener("keypress", (event) => {if(event.keyCode === 13){js()(c.$data, event)}});},
            submit: (e, c, js)=> e.addEventListener("submit", (event) => js()(c.$data, event)),
            if: (e, c, js, boi) => {
                e.insertFunc = this.bindObjects[boi];
                e.$context = c;
                e._if = false;
                this.bind(c, js, (o,v) => {
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
                this.bind(c, js, (o,v) => {
                    e.innerHTML = "";
                    var frag = document.createDocumentFragment();
                    //e.insertFunc.call(v, v, 0, frag, e, null, v.$parent);
                    e.insertFunc.call(v, new BindingContext(this,v,0,c), frag, e);
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
                        arr.childContexts[index] = new BindingContext(this,item,index,c);
                    }
                    e.insertFunc.call(item, arr.childContexts[index], frag, e);
                }
                e.appendChild(frag);
            },
            selectedOptions:(e,m,js)=>{
                this.bind(m, js, (o,v) => {
                    var vs = v.map(s=>s.toString());
                    Array.from(e.options).forEach(o=>o.selected = vs.indexOf(o.value)>-1);
                });
                e.addEventListener("change", (event) => {
                    var selectedOptions = Array.from(event.target.selectedOptions).map((x)=>x.value);
                    this.setValue(m, js, selectedOptions);
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
                this.bind(m, js, (o,v) => !v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'));      
            },
            disable:(e,m,js)=>{
                this.bind(m, js, (o,v) => v?e.setAttribute('disabled', ''):e.removeAttribute('disabled'));      
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
            stopBindingChildren = this.binders[p](e, $context, o[p], boi) | stopBindingChildren;
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

    _buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset, nodesExistAlready){
        arr.maxDepth = 0;
        arr.push("\nvar $mb = this;\n");
        arr.push("\nvar t = null;\n"); //, $index = null, $parent = null,$data = null;\n");
        arr.push("var renderedElements = [];\n");

        if(e.toString() === '[object NodeList]'){
            if(nodesExistAlready)
                e.forEach(n => this._executeBindingsFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
            else
                e.forEach(n => this._buildInsertFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
        }
        else {
            if(nodesExistAlready)
                this._executeBindingsFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
            else
                this._buildInsertFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
        }
        arr.push("if($funcElement){\n");
        arr.push("    if(!$funcElement.bindArray)$funcElement.bindArray=[];\n");
        arr.push("    $funcElement.bindArray[$context.$index] = renderedElements;\n");
        arr.push("}\n");
        return arr;
    }

    // _buildInsertFunc(bindObjectArr, e, funcIndex, source, mapObj, offset){
    //     var arr = [];
    //     this._buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset);
    //     return new Function('$context,n0,$funcElement', arr.join(''));
    // }

    _executeBindingsFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        var stop = false;
        if(e.nodeType == 1){
            var bind = e.getAttribute("bind");
            if (bind) {

            }
        }
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
                        var bindObject = new Function("$context", "with($context){with($data){ return " + v + "}}").call(fakeContext.$data, fakeContext);
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
                            bindObjectArr[this.bindObjectCount] = { code: ['\n    $mb.bindObjects[',this.bindObjectCount,'] = ', this._buildInsertFunc(bindObjectArr, e.childNodes, this.bindObjectCount, source, mapObj, true), ';\n']};
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

                        arr.push("$mb.executeBinding(n", depth, ", $context, (function(){with($context){with($data??{}){\nreturn ",v,"// line: ",sourceLine, ", offset: ", offset,", src: ", targetLine,"\n}}}).call($context.$data), ", bindObjectIndex, ");\n");
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

    _buildInsertFuncWithSourceMap(e, sourceName, nodesExistAlready){
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
        
        var arr = [];
        var bindObjectArr = [];
        
        this._buildInsertFuncBody(arr, bindObjectArr, e, 0, source, mapObj, nodesExistAlready);

        
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
                            //mb.render(model.proxyObject, target, xhr.responseText);
                                resolve(this._buildInsertFuncWithSourceMap(xhr.responseText, templateName));
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
                resolve(this._buildInsertFuncWithSourceMap(document.body.childNodes, templateName, true));
            } else {
                resolve(this._buildInsertFuncWithSourceMap(tempElement, templateName));
            }
        });
    }

    makeProxy(model){
        return typeof model === 'object' && !model.isProxy ? new Proxy(model, new ObjectHandler(this)) : model;
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
        var rootContext = new BindingContext(this, modelProxy);
        insertFunc.call(this, rootContext, target);
        return modelProxy;
    }

    render(model, target, template){
       return this.build(target, template).then(insertFunc => {
            return this.run(model, target ?? document.body, insertFunc);
       });
    }
}

/// This class is used to create a js object from the binding string so that we can get a list of its used properties. 
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