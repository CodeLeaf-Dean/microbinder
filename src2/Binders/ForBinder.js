export default function ForBinder(mb, context, readFunc)
{ 
    mb.bind(readFunc, (v,o) => {
        var element = context.element;
        var frag = document.createDocumentFragment();
        var diff = v - o;
        if(diff > 0){
            for (let index = 0; index < diff; index++) {
                context.insertFunc.call(this, context.createChildContext(context.$data,index), frag, element);
            }
        }
        if(diff < 0){
            for (let i = o-1; i >= v; i--) {
                context.clearElement(i);
            }
        }
        element.appendChild(frag);
    }, context);
}