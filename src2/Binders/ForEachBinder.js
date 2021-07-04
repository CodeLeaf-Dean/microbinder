export default function ForEachBinder(context, readFunc)
{ 
    //var arr = readFunc.call(context.$data);
    //context.element.$array = arr;
    //context.element.bindArray = [];
    //arr._proxyHandler._bindElements.push(context.element);
    // var frag = document.createDocumentFragment();
    // for (let index = 0; index < arr.length; index++) {
    //     const item = arr[index];
    //     if(arr.childContexts[index] == null){
    //         arr.childContexts[index] = context.createChildContext(item,index);
    //     }
    //     context.insertFunc.call(item, arr.childContexts[index], frag, context.element);
    // }
    // context.element.appendChild(frag);

    context.bind(readFunc, (newValue, oldValue, startIndex, deleteCount, pushCount) => {
        var element = context.element;

        if(oldValue == null){
            var frag = document.createDocumentFragment();
            for (let index = 0; index < newValue.length; index++) {
                const item = newValue[index];
                context.insertFunc.call(this, context.createChildContext(item,index), frag, element);
            }
            element.appendChild(frag);
            context.commitElement();
        }
        
        if(deleteCount > 0){
            for (let index = 0; index < deleteCount; index++) {
                context.clearElement(startIndex + index);
            }
            var newArgs = [];
            newArgs[0] = startIndex;
            newArgs[1] = deleteCount;
            for(let na=0;na<pushCount;na++)newArgs[na+2] = [];
            Array.prototype.splice.apply(element.bindArray, newArgs);
        }
           
        if(pushCount > 0){
            var frag = document.createDocumentFragment();
            for (let index = 0; index < pushCount; index++) {
                const item = newValue[startIndex + index];
                context.insertFunc.call(this, context.createChildContext(item,startIndex + index), frag, element);
            }

            var insertAfterElements = element.bindArray[startIndex-1];
            var insertAfterElement = insertAfterElements[insertAfterElements.length-1];
            insertAfterElement.after(frag);
        }
    }, context);
}