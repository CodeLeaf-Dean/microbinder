import ObjectHandler from './ProxyHandlers/ObjectHandler.js'

export default class BindingContext{
    constructor(mb, data, index, parentContext) {
        this.mb = mb;
        this.$data = data;
        this.$parentContext = parentContext;
        this._proxy = new Proxy({$index:index}, new ObjectHandler(mb));
        this.bindings = [];
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

    bind(readFunc, writeFunc, bindingContext, oldValue, startIndex, deleteCount, pushCount){
        var binding = this.mb.bind(readFunc, writeFunc, bindingContext, oldValue, startIndex, deleteCount, pushCount);
        this.bindings.push(binding);
        return binding;
    }

    createSiblingContext(){
        return new BindingContext(this.mb, this.$data, this.$index, this.$parentContext);
    }

    createChildContext(data, index){
        return new BindingContext(this.mb, data, index, this);
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

    commitElement(){
        if(this.element.getPreviousSibling){
            var previous = this.getPreviousElement(this.element);
            if(previous == undefined){
                for (let i = this.element.children.length-1; i >= 0; i--) {
                    this.element.parent.insertAdjacentElement('afterbegin', this.element.children[i]);
                }
            } else {
                previous.after(this.element);
            }
        }
    }

    clearElement(index){
        if(this.element instanceof DocumentFragment){
            var toRemove = this.element.bindArray[index];
            this.clearBindArray(toRemove);
        } else {
            this.element.innerHTML = "";
        }
    }

    clearBindArray(toRemove){
        for (let i = 0; i < toRemove.length; i++) {
            if(toRemove[i] instanceof DocumentFragment){
                toRemove[i].$context.clearBindings();
                var br = toRemove[i].bindArray;
                for (let j = 0; j < br.length; j++) {
                    this.clearBindArray(br[j]);
                }
            } else {
                toRemove[i].remove();
            }
        }
        toRemove.length = 0;
    }

    clearBindings(){
        this.bindings.forEach(binding =>{
            binding.unbind();
        });
        this.bindings = [];
    }
}