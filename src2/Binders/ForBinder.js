import BindingContext from './../BindingContext.js'

export default function ForBinder(e, c, js, boi)
{ 
    e.insertFunc = c.mb.bindObjects[boi];
    e.$context = c;
    c.mb.bind(js, (v,o) => {
        e.insertFunc = c.mb.bindObjects[boi];
        e.$context = c;
        //var arr = js.call(c.$data);
        //e.$array = arr;
        //e.bindArray = [];
        //arr._proxyHandler._bindElements.push(e);
        var frag = document.createDocumentFragment();
        for (let index = 0; index < v; index++) {
            e.insertFunc.call(this, new BindingContext(c.mb,c.$data,index,c), frag, e);
        }
        e.appendChild(frag);
    }, c);
}