export default function ForBinder(context, readFunc)
{ 
    context.bind(readFunc, (v,o) => {
        var element = context.element;
        var frag = document.createDocumentFragment();
        var diff = v - (o || 0);
        if(diff > 0){
            for (let index = 0; index < diff; index++) {
                context.insertFunc.call(this, context.createChildContext(context.$data,index + (o||0)), frag, element);
            }

            if(o == null){
                element.appendChild(frag);
            } else {
                var insertAfterElements = element.bindArray[o-1];
                var insertAfterElement = insertAfterElements[insertAfterElements.length-1];
                insertAfterElement.after(frag);
            }
        }
        if(diff < 0){
            for (let i = o-1; i >= v; i--) {
                context.clearElement(i);
            }
        }
    }, context);
}