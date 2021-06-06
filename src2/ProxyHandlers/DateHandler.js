import ObjectHandler from './ObjectHandler.js'

export default class DateHandler extends ObjectHandler {
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