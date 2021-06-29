export default class MicroTester {
    constructor() {
        this.Assert = function(expected, actual){
            if(JSON.stringify(expected) != JSON.stringify(actual)){
                throw new Error( 'Expected "' + expected + '" actual "' + actual + '"');
            }
        };
    }

    Run(tests){
        var success = 0;
        var total = 0;
        console.group('Running ' + tests.__proto__.constructor.name);
        Object.getOwnPropertyNames(tests.__proto__).forEach(prop =>{
            if(prop != "constructor") {
                this.Assert = this.Assert.bind(prop);
                try{
                    tests[prop].call(tests);
                    console.log('%c Pass %c ' + prop.replaceAll('_',' ') + ' ', 'background: forestgreen; color: #FFF; font-weight: bold;border-radius: 4px;', 'background: lightgray; color: #000;border-radius: 4px;margin-left:5px;');
                    success++;
                } catch (ex) {
                    console.log('%c Fail %c ' + prop.replaceAll('_',' ') + ' ', 'background: crimson; color: #FFF; font-weight: bold;border-radius: 4px;', 'background: lightgray; color: #000;border-radius: 4px;margin-left:5px;', ex);
                }
                total++;
            }
        });
        console.groupEnd();
        console.log(tests.__proto__.constructor.name, 'Results:', success, '/', total, 'tests passed.');
    }
}