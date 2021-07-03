export default function ForEachBinder(mb, context, readFunc)
{ 
    var arr = readFunc.call(context.$data);
    context.element.$array = arr;
    context.element.bindArray = [];
    arr._proxyHandler._bindElements.push(context.element);
    var frag = document.createDocumentFragment();
    for (let index = 0; index < arr.length; index++) {
        const item = arr[index];
        if(arr.childContexts[index] == null){
            arr.childContexts[index] = context.createChildContext(item,index);
        }
        context.insertFunc.call(item, arr.childContexts[index], frag, context.element);
    }
    context.element.appendChild(frag);
}