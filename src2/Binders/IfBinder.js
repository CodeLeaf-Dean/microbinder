import BindingContext from './../BindingContext.js'

export default function IfBinder(e, c, js, boi)
{ 
    e.insertFunc = c.mb.bindObjects[boi];
    e.$context = c;
    e._if = false;


    c.mb.bind(js, (v,o) => {
        if(v && !e._if){
            var frag = document.createDocumentFragment();
            e.insertFunc.call(c.$data, c, frag, e);

            e.appendChild(frag);

            if(e.getPreviousSibling){
                var previous = c.getPreviousElement(e);
                if(previous == undefined){
                    for (let i = e.children.length-1; i >= 0; i--) {
                        e.parent.insertAdjacentElement('afterbegin', e.children[i]);
                    }
                } else {
                    previous.after(e);
                }
            }

            e._if = true;
        } else if(!v && e._if) {
            if(e.getPreviousSibling){
                var toRemove = e.bindArray[0];
                for (let i = 0; i < toRemove.length; i++) {
                    toRemove[i].remove();
                }
                e.bindArray[0] = [];
            } else {
                e.innerHTML = "";
            }
            e._if = false;
        }
    });
}