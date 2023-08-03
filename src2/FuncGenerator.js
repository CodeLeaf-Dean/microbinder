import SourceMapGenerator from './SourceMap/SourceMapGenerator.js'

export default class FuncGenerator  {
    constructor(mb) {
        this.defaultBinders = [
            {match:"input[type=text]",binder:"textInput"},
            {match:"ul",binder:"foreach"},
            {match:"button",binder:"click"}
        ];
        this.mb = mb;
    }
    
    generateRootInsertFunc(template){
        return new Promise((resolve, reject) => {
            var tempElement = null;
            var templateName = "unnamed-template";
            if(typeof template === "string"){
                var temp = document.getElementById(template);
                if(temp != null){
                    if(temp.nodeName == 'LINK'){
                        templateName = temp.href;
                        var xhr = new XMLHttpRequest();
                        xhr.open("GET",temp.href);
                        xhr.onreadystatechange = (function () {
                            if(xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
                                resolve(this.buildInsertFuncWithSourceMap(xhr.responseText, templateName));
                            }
                        }).bind(this);
                        xhr.send();
                        return;
                    } else {
                        templateName = template;
                        tempElement = temp.content ? temp.content.cloneNode(true) : document.createRange().createContextualFragment(temp.innerHTML);
                    }
                } else {
                    var frag = document.createElement('template');
                    frag.innerHTML = template;
                    tempElement = frag.content;
                }
            } else {
                tempElement = template;
            }

            if(tempElement == null){
                resolve(this.buildInsertFuncWithSourceMap(document.body.childNodes, templateName, true));
            } else {
                resolve(this.buildInsertFuncWithSourceMap(tempElement, templateName));
            }
        });
    }

    buildInsertFuncWithSourceMap(e, sourceName, nodesExistAlready){
        var source;
        var mapObj = {root:[],offset:[],maps:[]};
        if(e.toString() === '[object NodeList]'){
            source = Array.prototype.reduce.call(e, function(html, node) {
                return html + ( node.outerHTML || node.nodeValue );
            }, "");
        }
        else if(typeof e == "string"){
            var frag = document.createElement('template');
            frag.innerHTML = e;
            e = frag.content;
            source = frag.innerHTML;
        }
        else {
            var temp = document.createElement('div');
            temp.appendChild( e.cloneNode(true) );
            source = temp.innerHTML.replace(/&amp;/g, "&");
        }
        
        var arr = [];
        var bindObjectArr = [];
        
        this.mb.bindObjectCount ++;
        this.buildInsertFuncBody(arr, bindObjectArr, e, 0, source, mapObj, nodesExistAlready);

        /*
        var map = new SourceMapGenerator({
            file: sourceName + ".template.map"
        });
        
        map.setSourceContent(sourceName + ".template.map", source);

        for (let i = 0; i < mapObj.maps.length; i++) {
            var m = mapObj.maps[i];
            map.addMapping({
                generated: {
                    line: m.newLine,
                    column: m.newColumn
                },
                source: sourceName + ".template.map",
                original: {
                    line: m.originalLine,
                    column: m.originalColumn
                },
                name: m.name
            });
        }

        arr.push("\n");
        arr.push("//# sourceMappingURL=data:text/plain;base64,");
        arr.push(btoa(map.toString()));
        arr.push("\n");

        arr.push("//# sourceURL=" + sourceName + ".template.js");
        arr.push("\n");
        */

        var f = new Function('$context,n0,$funcElement', arr.join(''));
        //console.log(f);
        return f;
    }

    buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset, nodesExistAlready){
        arr.maxDepth = 0;
        arr.push("\nvar $mb = $context.mb;\n");
        arr.push("\nvar t = null;\n"); //, $index = null, $parent = null,$data = null;\n");
        arr.push("\nvar prev = null;\n"); 
        arr.push("\nvar $bindingContext = null;\n"); 
        arr.push("var renderedElements = [];\n");

        if(e.toString() === '[object NodeList]'){
            if(nodesExistAlready)
                e.forEach(n => this.executeBindingsFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
            else
                e.forEach(n => this.buildInsertFuncVisit(n, arr, bindObjectArr, 1, funcIndex, source, mapObj, offset));
        }
        else {
            if(nodesExistAlready)
                this.executeBindingsFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
            else
                this.buildInsertFuncVisit(e, arr, bindObjectArr, 0, funcIndex, source, mapObj, offset);
        }
        arr.push("if($funcElement){\n");
        arr.push("    if(!$funcElement.bindArray)$funcElement.bindArray=[];\n");
        arr.push("    $funcElement.bindArray[$context.$index || 0] = renderedElements;\n");
        arr.push("}\n");
        return arr;
    }

    executeBindingsFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        var stop = false;
        if(e.nodeType == 1){
            var bind = e.getAttribute("bind");
            if (bind) {

            }
        }
    }

    buildInsertFuncVisit(e, arr, bindObjectArr, depth, funcIndex, source, mapObj, offset){
        var stop = false;
        if(e.nodeType == 1){
            if(e.nodeName == 'VIRTUAL'){
                arr.push("prev = ", "n", depth ,";\n");
                arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createDocumentFragment();\n");
                arr.push("n", depth ,".prev = prev;\n");
                arr.push("n", depth ,".parent = ", "n", depth -1, ";\n");
                arr.push("n", depth ,".getPreviousSibling = function(){return this.prev};\n");
            } else {
                arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createElement('", e.nodeName ,"');\n");
            }
            if(depth > arr.maxDepth)arr.maxDepth = depth;

            //arr.push("$context.$element = n", depth ,";\n");

            if (e.hasAttributes()) {
                var attrs = e.attributes;
                for(let i = attrs.length - 1; i >= 0; i--) {
                    const a = attrs[i].name;
                    var v = attrs[i].value;
                    if(a == 'bind'){
                        // If the bind attribute does not contain a colon then it is a single property accessor that uses the default binder
                        if(v.indexOf(":") == -1){
                            var defaultBinder = this.getDefaultBinder(e);
                            v = "{" + defaultBinder + ":" + v + "}";
                        }
                        if(!v.startsWith("{")) v = "{" + v + "}";
                        // Wrap all bind attribute object propeties with functions
                        var fakeContext = {$data:new FunctionTester(),$index: ()=>0};
                        var bindObject = new Function("$context", "with($context){with($data){ return " + v + "}}").call(fakeContext.$data, fakeContext);
                        for (const key in bindObject) {
                            v = v.replace(new RegExp(key + "\s*:"), key + ": ()=> ");
                        }

                        // check if the bind object has a binder that controls its children
                        stop = Object.keys(bindObject).some(r=> Object.keys(this.mb.subBinders).indexOf(r) >= 0);
                        var bindObjectIndex = funcIndex;
                        if(stop){
                            this.mb.bindObjectCount++;
                            bindObjectIndex = this.mb.bindObjectCount;
                            arr.push("$mb.bindObjects[" + bindObjectIndex + "] = (function anonymous($context,n0,$funcElement) {");
                            this.buildInsertFuncBody(arr, bindObjectArr, e.childNodes, bindObjectIndex, source, mapObj, offset);
                            arr.push("})\n");
                            arr.push("// ========================");
                            arr.push("\n");
                        }
                        arr.push("{");

                        var debugMapping = "";
                        if(source){
                            var eOuterHTML = e.outerHTML.replace(/&amp;/g, "&");
                            for (const key in bindObject) {
                                var newMatch = v.match(new RegExp(key + "\s*:"));
  
                                var newLine = 0;
                                var newColumn = 8 + newMatch.index + key.length + 6;
                                var originalLine = 0;
                                var orignalColumn = 0;

                                // Get the line number for this element
                                var contentBefore = source.substr(0, source.indexOf(eOuterHTML));
                                originalLine = (contentBefore.match(/\n/g)||[]).length + 1;

                                newLine = arr.join('').match(/\n/g).length + 5;// TODO: Perf

                                var contentOnLineBeforeElementStart = contentBefore.split('\n').slice(-1)[0].length;
                                var indexInElementTag = eOuterHTML.indexOf("bind=") + 6;
                                orignalColumn = contentOnLineBeforeElementStart + indexInElementTag;

                                var orignalMatch = eOuterHTML.match(new RegExp(key + "\s*:"));
                                if(orignalMatch){
                                    orignalColumn = contentOnLineBeforeElementStart + orignalMatch.index + key.length + 1;
                                }

                                mapObj.maps.push({newLine: newLine, newColumn: newColumn, originalLine: originalLine, originalColumn: orignalColumn, name: key});
                                debugMapping = debugMapping + "line: " + newLine + ", column: " + newColumn + ", originalline: " + originalLine + ", orignalColumn: " + orignalColumn;
                            }
                        }

                        arr.push("$bindingContext = $context.createSiblingContext();\n");
                        arr.push("$mb.executeBinding(n", depth, ", $bindingContext, (function(){with($bindingContext){with($data??{}){\nreturn ",v,"// " + debugMapping,"\n}}}).call($bindingContext.$data), ", bindObjectIndex, ");\n");
                        if(e.nodeName == 'VIRTUAL'){
                            
                        }
                        arr.push('}\n');
                    } else if(a == 'class'){
                        arr.push("n", depth, ".classList.add('", v.split(' ').join("','"), "');\n");
                    } else {
                        arr.push("n", depth, ".setAttribute('", a, "', '", v, "');\n");
                    }
                }
            }

            // if(e.nodeName == 'VIRTUAL'){
            //     if(depth-1==0)arr.push("renderedElements.push.apply(renderedElements, Array.from(n", depth, ".childNodes));\n\n");
            //     arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
            // } else {
                arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
                if(depth-1==0)arr.push("renderedElements.push(n", depth, ");\n\n");
            //}
        }
        else if(e.nodeType == 3){
            arr.push("t = document.createTextNode(`", e.nodeValue.replace(/\\/g, "\\\\"), "`);\n");
            arr.push("n", depth-1 ,".appendChild(t);\n\n");
            if(depth-1==0)arr.push("renderedElements.push(t);\n\n");
        }
        if(!stop)e.childNodes.forEach(n => this.buildInsertFuncVisit(n, arr, bindObjectArr, depth+1, funcIndex, source, mapObj, offset));
    }

    getDefaultBinder(e){
        for (let i = 0; i < this.defaultBinders.length; i++) {
            const d = this.defaultBinders[i];
            if(e.matches(d.match)) return d.binder;
        }
        return "text";
    }
}

/// This class is used to create a js object from the binding string so that we can get a list of its used properties. 
function FunctionTester() {
    this.has = function(obj, prop) {
        return true;
    }
    this.get = function(obj, prop, proxy) {
        if(prop == Symbol.unscopables) 
            return {};
        if(prop == Symbol.toPrimitive || prop == "toString")
            return ()=>"";
        return new FunctionTester();
    }
    this.set = function(obj, prop, val, proxy) {}
    this.apply = function(obj, thisArg, argumentsList) {
        return new FunctionTester();
    }

    return new Proxy(function() {}, this);
}