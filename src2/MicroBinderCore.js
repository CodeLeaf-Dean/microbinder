import ObjectHandler from './ProxyHandlers/ObjectHandler.js'
import DateHandler from './ProxyHandlers/DateHandler.js'
import ArrayHandler from './ProxyHandlers/ArrayHandler.js'

export default class MicroBinderCore {
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
        this._calculatedDependancies = []
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
        }

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