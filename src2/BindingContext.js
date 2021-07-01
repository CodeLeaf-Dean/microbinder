import ObjectHandler from './ProxyHandlers/ObjectHandler.js'

export default class BindingContext{
    constructor(mb, data, index, parentContext) {
        this.mb = mb;
        this.$data = data;
        this.$parentContext = parentContext;
        this._proxy = new Proxy({$index:index}, new ObjectHandler(mb));
    }

    get $parent() {
        return this.$parentContext.$data;
    }

    get $index() {
        if(this.mb._calculatingDependancies) this.mb._calculatedDependancies.push({handler: this._proxy.proxyHandler, prop: '$index'});
        return this._proxy.$index;;
    }
    set $index(value) {
        this._proxy.$index = value;
    }

    getPreviousElement(e){
        if(e.getPreviousSibling){
            var prev = e.getPreviousSibling();

            if(prev && prev.getPreviousSibling){
                if(!prev.bindArray || prev.bindArray.length == 0 || prev.bindArray[prev.bindArray.length-1].length == 0){
                    return this.getPreviousElement(prev);
                } else {
                    var arr = prev.bindArray[prev.bindArray.length-1];
                    return arr[arr.length-1];
                }
            } else {
                return prev;
            }

        }
    }
}