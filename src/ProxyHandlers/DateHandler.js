import ObjectHandler from './ObjectHandler.js'

export default class DateHandler extends ObjectHandler {
    constructor(mb) {
        super(mb);
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