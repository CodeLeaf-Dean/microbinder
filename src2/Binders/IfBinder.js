export default function IfBinder(context, readFunc)
{ 
    context._if = false;
    context.bind(readFunc, (v,o) => {
        if(v && !context._if){
            var frag = document.createDocumentFragment();
            context.insertFunc.call(context.$data, context, frag, context.element);
            context.element.appendChild(frag);
            context.commitElement();
            context._if = true;
        } else if(!v && context._if) {
            context.clearElement(0);
            context._if = false;
        }
    });
}