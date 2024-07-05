export default function ForEachBinder(context, readFunc)
{ 
    context.bind(readFunc, (newValue, oldValue, startIndex, deleteCount, pushCount) => {
        var element = context.element;
        var bindArrayIsNull = element.bindArray == null;

        if(oldValue == null || bindArrayIsNull){
            var frag = document.createDocumentFragment();

            newValue.forEach((item, index) => context.insertFunc.call(this, context.createChildContext(item,index), frag, element));

            // for (let index = 0; index < newValue.length; index++) {
            //     const item = newValue[index];
            //     context.insertFunc.call(this, context.createChildContext(item,index), frag, element);
            // }
            element.appendChild(frag);
            context.commitElement();
        }
        
        if(deleteCount > 0){
            for (let index = 0; index < deleteCount; index++) {
                context.clearElement(startIndex + index);
            }

            // var newArgs = [];
            // newArgs[0] = startIndex;
            // newArgs[1] = deleteCount;
            // for(let na=0;na<pushCount;na++)newArgs[na+2] = [];
            // Array.prototype.splice.apply(element.bindArray, newArgs);
        }
           
        if(pushCount > 0 && !bindArrayIsNull){
            var frag = document.createDocumentFragment();
            var insertAfterElements = element.bindArray[startIndex-1];

            for(let index = startIndex-1; index >= 0 && insertAfterElements == null ;index --){
                insertAfterElements = element.bindArray[index];
            }

            if(insertAfterElements == null){
                newValue.forEach((item, index) => context.insertFunc.call(this, context.createChildContext(item,index), frag, element));
                element.appendChild(frag);
                context.commitElement();
            } else {
                var insertAfterElement = insertAfterElements[insertAfterElements.length-1];
                for (let index = 0; index < pushCount; index++) {
                    const item = newValue[startIndex + index];
                    context.insertFunc.call(this, context.createChildContext(item,startIndex + index), frag, element);
                }

                insertAfterElement.after(frag);
            }
        }
    }, context);
}