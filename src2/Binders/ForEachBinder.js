import BindingContext from './../BindingContext.js'

export default function ForEachBinder(e, c, js, boi)
{ 
    e.insertFunc = c.mb.funcGen.bindObjects[boi];
    e.$context = c;
    var arr = js.call(c.$data);
    e.$array = arr;
    e.bindArray = [];
    arr._proxyHandler._bindElements.push(e);
    var frag = document.createDocumentFragment();
    for (let index = 0; index < arr.length; index++) {
        const item = arr[index];
        if(arr.childContexts[index] == null){
            arr.childContexts[index] = new BindingContext(c.mb,item,index,c);
        }
        e.insertFunc.call(item, arr.childContexts[index], frag, e);
    }
    e.appendChild(frag);
}