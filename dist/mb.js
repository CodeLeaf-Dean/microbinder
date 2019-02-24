class MicroBinder{constructor(){this.t=1,this.i={},this.s=!1,this.h=[],this.bindObjects=[],this.subBinders={if:1,with:1,foreach:1},this.binders={text:(t,e,r)=>mb.bind(e,r,e=>t.innerText=e),html:(t,e,r)=>mb.bind(e,r,e=>t.innerHTML=e),value:(t,e,r)=>{mb.bind(e,r,e=>t.value=e||""),t.addEventListener("change",t=>mb.setValue(e,r,t.target.value))},textInput:(t,e,r)=>{mb.bind(e,r,e=>t.value=e||""),t.addEventListener("input",t=>mb.setValue(e,r,t.target.value))},checked:(t,e,r)=>{mb.bind(e,r,e=>{e?t.setAttribute("checked",""):t.removeAttribute("checked","")}),t.addEventListener("change",t=>mb.setValue(e,r,t.target.checked))},hasFocus:(t,e,r)=>{mb.bind(e,r,e=>e?t.focus():t.blur()),t.addEventListener("focus",t=>mb.setValue(e,r,!0)),t.addEventListener("blur",t=>mb.setValue(e,r,!1))},css:(t,e,r)=>{for(const n in r)mb.bind(e,r[n],e=>e?t.classList.add(n):t.classList.remove(n))},attr:(t,e,r)=>{for(const n in r)mb.bind(e,r[n],e=>t.setAttribute(n,e))},style:(t,e,r)=>{for(const n in r)mb.bind(e,r[n],e=>t.style[n]=e)},visible:(t,e,r)=>mb.bind(e,r,e=>t.style.display=e?null:"none"),click:(t,e,r)=>t.addEventListener("click",n=>r.call(e,t)),submit:(t,e,r)=>t.addEventListener("submit",n=>r.call(e,t)),if:(t,e,r,n)=>{t.insertFunc=this.bindObjects[n-1],mb.bind(e,r,r=>{if(r){var n=document.createDocumentFragment();t.insertFunc.call(e,e,()=>0,n,t),t.appendChild(n)}else t.innerHTML=""})},with:(t,e,r,n)=>{t.insertFunc=this.bindObjects[n-1],mb.bind(e,r,e=>{t.innerHTML="";var r=document.createDocumentFragment();t.insertFunc.call(e,e,()=>0,r,t),t.appendChild(r)})},foreach:(t,e,r,n)=>{t.insertFunc=this.bindObjects[n-1];var i=r.call(e);t.bindArray=[],i.proxyHandler.l.push(t);var s=document.createDocumentFragment();for(let e=0;e<i.length;e++){const r=i[e];t.insertFunc.call(r,r,()=>e,s,t)}t.appendChild(s)},selectedOptions:(t,e,r)=>{mb.bind(e,r,e=>{var r=e.map(t=>t.toString());Array.from(t.options).forEach(t=>t.selected=r.indexOf(t.value)>-1)}),t.addEventListener("change",t=>{var n=Array.from(t.target.selectedOptions).map(t=>t.value);mb.setValue(e,r,n)})},event:(t,e,r)=>{for(const n in r){const i=r[n];t.addEventListener(n,r=>i.call(e,t))}},enable:(t,e,r)=>{mb.bind(e,r,e=>e?t.removeAttribute("disabled"):t.setAttribute("disabled",""))},disable:(t,e,r)=>{mb.bind(e,r,e=>e?t.setAttribute("disabled",""):t.removeAttribute("disabled"))}}}bind(t,e,r){this.s=!0,this.h=[];var n=e.call(t);if(this.s=!1,this.h.length>0){var i=this.t++;this.i[i]=[],this.h.forEach(t=>t.handler.u(t.prop,e,r,i))}r(n)}setValue(t,e,r){this.o=!0,this.m=[];e.call(t);this.o=!1,this.m.length>0&&this.m.pop()(r)}executeBinding(t,e,r,n){var i=!1;for(var s in r)i=mb.binders[s](t,e,r[s],n)|i;return i}v(t){for(var e=t;null==e.bindIndex;)e=e.parentNode;return e.bindIndex}p(t){var e=[];return e.maxDepth=0,e.push("var $parent = $data.$parent, t = null;\n"),e.push("var renderedElements = [];\n"),"[object NodeList]"===t.toString()?t.forEach(t=>this.A(t,e,1)):this.A(t,e,0),e.push("if(!$element.bindArray)$element.bindArray=[];\n"),e.push("$element.bindArray[$index()] = renderedElements;\n"),console.log(e.join("")),new Function("$data,$index,n0,$element",e.join(""))}A(t,e,r){var n=!1;1==t.nodeType?(e.push(r>e.maxDepth?"var ":"","n",r," = document.createElement('",t.nodeName,"');\n"),r>e.maxDepth&&(e.maxDepth=r),t.getAttributeNames().forEach(i=>{if("bind"==i){var s=new Function("return "+t.getAttribute(i))();(n=Object.keys(s).some(t=>Object.keys(this.subBinders).indexOf(t)>=0))&&this.bindObjects.push(this.p(t.childNodes)),e.push("mb.executeBinding(n",r,", $data, ",t.getAttribute(i),", ",this.bindObjects.length,");\n")}else e.push("n",r,".setAttribute('",i,"', '",t.getAttribute(i),"');\n")}),e.push("n",r-1,".appendChild(n",r,");\n\n"),r-1==0&&e.push("renderedElements.push(n",r,");\n\n")):3==t.nodeType&&(e.push("t = document.createTextNode(`",t.nodeValue,"`);\n"),e.push("n",r-1,".appendChild(t);\n\n"),r-1==0&&e.push("renderedElements.push(t);\n\n")),n||t.childNodes.forEach(t=>this.A(t,e,r+1))}render(t,e,r){var n="object"!=typeof t||t.isProxy?t:new Proxy(t,new ObjectHandler),i=null;if("string"==typeof r){var s=document.getElementById(r);if(null!=s)i=s.content?s.content.cloneNode(!0):document.createRange().createContextualFragment(s.innerHTML);else{var a=document.createDocumentFragment();a.innerHTML=r,i=a.content}}else i=r;return null==i&&(i=e||document.body),this.p(i,n).call(n,n,()=>0,e,e),n}}var mb=new MicroBinder;class ObjectHandler{constructor(){this.j=this,this.g={},this.$={},this.$parent=null}u(t,e,r,n){null==this.$[t]&&(this.$[t]=[]);var i=this.$[t],s={H:i,O:e,_:r,F:n};i.push(s),mb.i[n].push(s)}I(t,e){if(null!=this.$[t]){var r=[];this.$[t].forEach(t=>{mb.bind(e,t.O,t._),r.push(t.F)}),r.forEach(t=>{mb.i[t].forEach(t=>t.H.splice(t.H.indexOf(t),1)),delete mb.i[t]})}}get(t,e,r){if("proxyHandler"===e)return this;if("$parent"===e)return this.$parent;if("isProxy"===e)return!0;if("proxyObject"===e)return t;var n=Reflect.get(t,e,r);if(mb.s&&mb.h.push({handler:this,prop:e}),this instanceof DateHandler||!mb.o||mb.m.push(t=>r[e]=t),null!=n&&"object"==typeof n){if(null==this.g[e]){var i="[object Date]"===Object.prototype.toString.call(n)?new DateHandler:Array.isArray(n)?new ArrayHandler:new ObjectHandler;i.$parent=r,this.g[e]=new Proxy(n,i)}return this.g[e]}return n}set(t,e,r,n){null!=r&&r.isProxy&&(r=r.proxyObject);var i=Reflect.set(t,e,r,n);if("object"==typeof r){var s=this.g[e];if(delete this.g[e],Array.isArray(r)){var a=n[e];s&&(s.length=0,a.proxyHandler.l=s.proxyHandler.l),a.proxyHandler.k(0,0,r.length,a)}}return this.I(e,n),i}}class DateHandler extends ObjectHandler{constructor(){super()}get(t,e,r){var n=super.get(t,e,r);return"function"==typeof n?function(i){var s=t,a=n.apply(t,arguments);return t!=s&&this.I(e,r),a}.bind(this):n}}class ArrayHandler extends ObjectHandler{constructor(){super(),this.g=[],this.l=[]}k(t,e,r,n){var i=[];i[0]=t,i[1]=e;for(let t=0;t<r;t++)i[t+2]=null;Array.prototype.splice.apply(this.g,i),this.l.forEach(n=>{for(let r=0;r<e;r++)n.bindArray[t+r].forEach(t=>t.remove());var i=[];i[0]=t,i[1]=e;for(let t=0;t<r;t++)i[t+2]=[];Array.prototype.splice.apply(n.bindArray,i)}),this.l.forEach(e=>{var i=document.createDocumentFragment(),s=e.insertFunc;for(let a=t;a<t+r;a++){const t=n[a];s.call(t,t,()=>a,i,e)}var a=e.bindArray;if(null==t||t>=a.length)e.appendChild(i);else if(0==t)e.prepend(i);else{var h=(a=e.bindArray[t-1])[a.length-1].nextSibling;e.insertBefore(i,h)}}),this.l.forEach(e=>{for(let n=t+r;n<e.bindArray.length;n++)e.bindArray[n].forEach(t=>t.bindIndex=n)})}get(t,e,r){var n=super.get(t,e,r);return"function"==typeof n?"splice"===e?function(e){var n=arguments[0];n>this.length&&(n=this.length),n<-this.length&&(n=0),n<0&&(n=this.length+n+1);var i=1==arguments.length?this.length-n:arguments[1];i>this.length-n&&(i=this.length-n);var s=Array.prototype.splice.apply(t,arguments);return this.k(n,i,arguments.length-2,r),s}.bind(this):"push"===e?function(e){var n=t.length,i=Array.prototype.push.apply(t,arguments);return this.k(n,0,arguments.length,r),i}.bind(this):"pop"===e?function(){if(0!=t.length){var e=t.length,n=Array.prototype.pop.apply(t,arguments);return this.k(e-1,1,0,r),n}}.bind(this):"shift"===e?function(){if(0!=t.length){var e=Array.prototype.shift.apply(t,arguments);return this.k(0,1,0,r),e}}.bind(this):"unshift"===e?function(e){var n=Array.prototype.unshift.apply(t,arguments);return this.k(0,0,1,r),n}.bind(this):"reverse"===e||"sort"==e?function(n){var i=Array.prototype[e].apply(t,arguments);return this.k(0,t.length,t.length,r),i}.bind(this):"fill"===e?function(e){var n=arguments[1]||0,i=arguments[2]||t.length;n<0&&(n=ob.length+n),i<0&&(i=ob.length+i);var s=Array.prototype.fill.apply(t,arguments);return this.k(n,i,i-n,r),s}.bind(this):n.bind(r):n}set(t,e,r,n){var i=t.length,s=Reflect.set(t,e,r,n);return"length"===e?i>r&&this.k(r,i-r):t.length===i?this.k(parseInt(e),1,1,t):this.k(parseInt(e),0,1,t),s}}