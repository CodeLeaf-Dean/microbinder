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
        var mapObj = {root:[],offset:[]};
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
            source = temp.innerHTML;
        }
        
        var arr = [];
        var bindObjectArr = [];
        
        this.buildInsertFuncBody(arr, bindObjectArr, e, 0, source, mapObj, nodesExistAlready);

        
        var lineOffset = arr.join('').match(/\n/g).length + 3;
        mapObj.root.length = lineOffset;

        for (let i = 0; i < bindObjectArr.length; i++) {
            const element = bindObjectArr[i];
            arr.push("// Offset: ", lineOffset);
            if(mapObj.offset[i] == undefined)mapObj.offset[i] = [];
            mapObj.offset[i].length = (element.code.join('').match(/\n/g)||[]).length;
            lineOffset += mapObj.offset[i].length;
            arr = arr.concat(element.code);
        }

        arr.push("\n");
        //arr.push("//# sourceMappingURL=data:text/plain;base64,");
        
        const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

        const BIT_MASKS = {
            LEAST_FOUR_BITS: 0b1111,
            LEAST_FIVE_BITS: 0b11111,
            CONTINUATION_BIT: 0b100000,
            SIGN_BIT: 0b1,
        };

        function base64VlqEncode(integers) {
            return integers
                .map(vlqEncode)
                .map(base64Encode)
                .join('');
        }

        function vlqEncode(x) {
            if (x === 0) {
                return [0];
            }
            let absX = Math.abs(x);
            const sextets = [];
            while (absX > 0) {
                let sextet = 0;
                if (sextets.length === 0) {
                sextet = x < 0 ? 1 : 0; // set the sign bit
                sextet |= (absX & BIT_MASKS.LEAST_FOUR_BITS) << 1; // shift one ot make space for sign bit
                absX >>>= 4;
                } else {
                sextet = absX & BIT_MASKS.LEAST_FIVE_BITS;
                absX >>>= 5;
                }
                if (absX > 0) {
                sextet |= BIT_MASKS.CONTINUATION_BIT;
                }
                sextets.push(sextet);
            }
            return sextets;
        }

        function base64Encode(vlq) {
            return vlq.map(s => BASE64_ALPHABET[s]).join('');
        }

        var mappings = "";
        var pos = 0;
        for (let i = 0; i < mapObj.root.length; i++) {
            const element = mapObj.root[i];
            if(element != undefined){
                var diff = element - pos;
                mappings = mappings + base64VlqEncode([0,0,diff,0]);
                pos += diff;
            }
            mappings = mappings + ";"
        }

        for (let i = 0; i < mapObj.offset.length; i++) {
            const maps = mapObj.offset[i];
            for (let j = 0; j < maps.length; j++) {
                const element = maps[j];
                if(element != undefined){
                    var diff = element - pos;
                    mappings = mappings + base64VlqEncode([0,0,diff,0]);
                    pos += diff;
                }
                mappings = mappings + ";"
            }
        }

        var sourceMap = 
        {
            "version": 3,
            "sources": [
                sourceName + ".template"
            ],
            "names": [],
            "mappings": mappings,
            "sourcesContent": [source]
        };

        //arr.push(btoa(JSON.stringify(sourceMap)));
        //arr.push("\n");
        //arr.push("//# sourceURL=" + sourceName + ".template.js");

        var f = new Function('$context,n0,$funcElement', arr.join(''));
        console.log(f);
        return f;
    }

    buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset, nodesExistAlready){
        arr.maxDepth = 0;
        arr.push("\nvar $mb = $context.mb;\n");
        arr.push("\nvar t = null;\n"); //, $index = null, $parent = null,$data = null;\n");
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
        arr.push("    $funcElement.bindArray[$context.$index] = renderedElements;\n");
        arr.push("}\n");
        return arr;
    }

    buildInsertFunc(bindObjectArr, e, funcIndex, source, mapObj, offset){
        var arr = [];
        this.buildInsertFuncBody(arr, bindObjectArr, e, funcIndex, source, mapObj, offset);
        var f = new Function('$context,n0,$funcElement', arr.join(''));
        console.log(f);
        return f;
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
                arr.push(depth > arr.maxDepth ? "var " : "", "n", depth ," = document.createDocumentFragment();\n");
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
                            this.mb.bindObjects.push(this.buildInsertFunc(bindObjectArr, e.childNodes, this.mb.bindObjects.length + 1));
                            this.mb.bindObjectCount ++;
                            bindObjectIndex = this.mb.bindObjectCount;
                            bindObjectArr[bindObjectIndex] = { code: ['\n    $mb.bindObjects[',this.mb.bindObjectCount,'] = ', this.buildInsertFunc(bindObjectArr, e.childNodes, this.mb.bindObjectCount, source, mapObj, true), ';\n']};
                        }
                        arr.push("{");

                        var sourceLine = 0;
                        var targetLine = 0;
                        if(source){
                            // Get the line number for this element
                            var contentBefore = source.substr(0, source.indexOf(e.outerHTML))
                            targetLine = (contentBefore.match(/\n/g)||[]).length;
                            sourceLine = arr.join('').match(/\n/g).length + 3;// TODO: Perf
                            
                            if(offset){
                                if(mapObj.offset[funcIndex] == undefined){
                                    mapObj.offset[funcIndex] = [];
                                }
                                mapObj.offset[funcIndex][sourceLine] = targetLine;
                            } else {
                                mapObj.root[sourceLine] = targetLine;
                            }
                        }

                        arr.push("$mb.executeBinding(n", depth, ", $context, (function(){with($context){with($data??{}){\nreturn ",v,"// line: ",sourceLine, ", offset: ", offset,", src: ", targetLine,"\n}}}).call($context.$data), ", bindObjectIndex, ");\n");

                        if(e.nodeName == 'VIRTUAL'){
                            
                        }
                        arr.push('}\n');
                    } else if(a == 'class'){
                        arr.push("n", depth, ".classList.add('", v, "');\n");
                    } else {
                        arr.push("n", depth, ".setAttribute('", a, "', '", v, "');\n");
                    }
                }
            }

            if(e.nodeName == 'VIRTUAL'){
                if(depth-1==0)arr.push("renderedElements.push.apply(renderedElements, Array.from(n", depth, ".childNodes));\n\n");
                arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
            } else {
                arr.push("n", depth-1 ,".appendChild(n", depth ,");\n\n");
                if(depth-1==0)arr.push("renderedElements.push(n", depth, ");\n\n");
            }
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