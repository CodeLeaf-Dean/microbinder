export default class ObjectHandler {
    constructor(mb) {
        this.mb = mb;
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
        this.mb._bindings[bindingId].push(sub);
    }

    _notifySubscribers(prop, proxy, oldValue, newValue){
        if(this._subscribers[prop] != null){
            var bindingsToRemove = [];
            this._subscribers[prop].forEach(x=>{
                this.mb.bind(proxy, x._triggerFunc, x._eventFunc, oldValue);
                bindingsToRemove.push(x._bindingId);
            });
            bindingsToRemove.forEach(x=>{
                this.mb._bindings[x].forEach(y=>y._subscription().splice(y._subscription().indexOf(y),1));
                delete this.mb._bindings[x];
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
        
        if(this.mb._calculatingDependancies){
            if(!this.mb._calculatedDependancies.find(element => element.handler == this && element.prop == prop)){
                this.mb._calculatedDependancies.push({handler: this, prop: prop});
            }
        }

        if( //!(this instanceof DateHandler) && 
        this.mb._settingValue){
            this.mb._setStack.push((v)=>proxy[prop]=v);
        }

        if (val != null && typeof val === 'object') {
            if(this._childProxies[prop] == null){
                var handler = Object.prototype.toString.call(val) === '[object Date]' ? new DateHandler(this.mb) : Array.isArray(val) ? new ArrayHandler(this.mb,prop,proxy) : new ObjectHandler(this.mb);
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