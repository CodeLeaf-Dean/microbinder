import ObjectHandler from 'ObjectHandler.js'

export default class CustomElementHandler extends ObjectHandler {
    constructor(mb) {
        super(mb);
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