class MicroBinderHTMLElement extends HTMLElement{
    constructor(template) {
        super();
        this.template = template;
        this.handlingAttributeChange= false;
        this.settingAttribute = false;
        this.proxy = new Proxy(this,new CustomElementHandler());
        this.attributeProperty = {};
        this.attributesBound = false;
        //return new Proxy(this,new ObjectHandler());
    }
    useShadow(){
        this.shadow = this.attachShadow({mode: 'open'});
    }

    bindAttributes(){
        this.__proto__.constructor.observedAttributes.forEach(name=> {
            // find and store property name that matches the lowercase attribute
            this.attributeProperty[name] = (()=>{for (const key in this) if(key.toLowerCase() == name) return key})();
            let propName = this.attributeProperty[name];
            // read attribute values and set initial property values
            this.proxy[propName] = this.getAttribute(name)||this[propName];
            // when a property changes, update the attribute
            mb.bind(this.proxy, ()=>this.proxy[propName], (oldVal, newVal) => {
                if(oldVal!=newVal){
                    if(!this.handlingAttributeChange){
                        if(newVal== ""){
                            this.removeAttribute(name);
                        } else {
                            this.settingAttribute = true;
                            this.setAttribute(name, newVal);
                            this.settingAttribute = false;
                        }
                    }
                    // fire an event that the property was changed
                    var e = new Event('propchange');
                    e.name = propName;
                    e.newValue = newVal;
                    this.dispatchEvent(e);
                }
            });
        });
        this.attributesBound = true;
    }
    
    disconnectedCallback() {
    }

    adoptedCallback() {
    }

    connectedCallback() {
        mb.render(this.proxy, this.shadow?this.shadow:this, this.template);
        // set the attributes for any properties which are bound
        if(this.__proto__.constructor.observedAttributes){
            this.settingAttribute = true;
            this.__proto__.constructor.observedAttributes.forEach(name=> {
                let propName = this.attributeProperty[name];
                var newVal = this[propName];
                if(newVal == ""){
                    this.removeAttribute(name);
                } else {
                    this.setAttribute(name, newVal);
                }
            });
            this.settingAttribute = false;
        }
    }
    attributeChangedCallback(name, oldValue, newValue) {
        if(this.attributesBound && !this.settingAttribute){
            this.handlingAttributeChange = true;
            this.proxy[this.attributeProperty[name]] = newValue;
            this.handlingAttributeChange = false;
        }
    }
}