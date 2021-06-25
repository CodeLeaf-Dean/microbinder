import BindingContext from './../BindingContext.js'

export default function ComponentBinder(e, c, js, boi)
{ 
    var jsobj = js();
    var component = c.mb.components[jsobj.name];

    e.$context = c;

    // insertFuncs for components may be using templates from external files which may not be loaded at the point this is called.
    // Use a Promise so the component will render when the template is loaded
    //Promise.resolve(component.insertFunc).then(function(insertFunc) {
        e.insertFunc = component.insertFunc; //insertFunc || 
        var frag = document.createDocumentFragment();
        var model = component.viewModel == null ? c.$data : new component.viewModel(c.mb, jsobj.params);

        model = c.mb.wrap(model);

        var childContext = new BindingContext(c.mb,model,0,c);
        e.insertFunc.call(model, childContext, frag, e);
        e.appendChild(frag);
    //});
}