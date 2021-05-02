import ObjectHandler from './ProxyHandlers/ObjectHandler.js'
import DateHandler from './ProxyHandlers/DateHandler.js'
import ArrayHandler from './ProxyHandlers/ArrayHandler.js'

export default class MicroBinder {
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

        var handler = Object.prototype.toString.call(model) === '[object Date]' ? new DateHandler(this) : Array.isArray(model) ? new ArrayHandler(this,null,model) : new ObjectHandler(this);
        return new Proxy(model, handler);
    }

    unwrap(model){
        if(!model._isProxy)
            return model;

        return model._proxyObject;
    }

    bind(readFunc, writeFunc, oldValue){
        this._calculatingDependancies = true;
        this._calculatedDependancies = []
        var newValue = readFunc.call(); //$context.$data);
        this._calculatingDependancies = false;
        if(this._calculatedDependancies.length > 0){
            var bindingId = this._nextBindingId++;
            this._bindings[bindingId] = [];
            this._calculatedDependancies.forEach(x=>{
                var sub = x.handler._subscribe(x.prop, (n,o)=>{
                    this._bindings[bindingId].forEach(y=>y._subscription().splice(y._subscription().indexOf(y),1));
                    delete this._bindings[bindingId];
                    this.bind(readFunc, writeFunc, o);
                }, readFunc, bindingId);
                if(sub) this._bindings[bindingId].push(sub);
            });
        }
        writeFunc(newValue, oldValue);
    }
}