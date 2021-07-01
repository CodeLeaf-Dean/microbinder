import MicroBinderCore from './MicroBinderCore.js'
import BindingContext from './BindingContext.js'
import FuncGenerator from './FuncGenerator.js'
import ForBinder from './Binders/ForBinder.js'
import ForEachBinder from './Binders/ForEachBinder.js'
import ComponentBinder from './Binders/ComponentBinder.js'
import IfBinder from './Binders/IfBinder.js'

export default class MicroBinder extends MicroBinderCore {

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
                    if(v)e.setAttribute("checked","")
                    else e.removeAttribute("checked","")
                }, c);
                e.addEventListener("change", (event) => this.setValue(c, js, event.target.checked));
            },
            hasFocus:(e, c, js)=>{
                this.bind(js, (v,o) => v ? e.focus() : e.blur(), c);
                e.addEventListener("focus", (event) => this.setValue(c, js, true));
                e.addEventListener("blur", (event) => this.setValue(c, js, false));
            },
            css:(e,c,js)=>{
                // Add a binding for each css class
                var jsobj = js();
                if(typeof jsobj == "string"){
                    this.bind(js, (v,o) => {
                        if(typeof o == "string"){
                            o.split(' ').forEach(x=>{
                                if(x != "")
                                    e.classList.remove(x)
                            });
                        } else {
                            //debugger;
                        }
                        v.split(' ').forEach(x=>{
                            if(x != "")
                                e.classList.add(x)
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
            enter:(e, c, js)=>{e.addEventListener("keypress", (event) => {if(event.keyCode === 13){js()(c.$data, event)}});},
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
                resolve(insertFunc)
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
        var stopBindingChildren = false;
        for (var p in o) {
            stopBindingChildren = this.binders[p](e, $context, o[p], boi) | stopBindingChildren;
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