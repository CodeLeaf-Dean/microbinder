import MicroBinder from '/src/Compiler.js'

export default new MicroBinder();





// mb.templateClass = function(template){
//     var wrapperClass = class TemplateClass extends MicroBinderHTMLElement{
//         constructor() {
//             super(template);
//             this.useShadow();
//         }
//     };
//     return wrapperClass;
// }