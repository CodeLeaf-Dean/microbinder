export default class ObjectHandler {
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

    _notifySubscribers(prop, oldValue, newValue){
        if(this._subscribers[prop] != null){
            for (var i = this._subscribers[prop].length - 1; i >= 0; i--) {
                this._subscribers[prop][i]._eventFunc(newValue, oldValue);
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