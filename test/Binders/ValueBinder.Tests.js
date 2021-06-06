import MicroTester from '../MicroTester.js'
import MicroBinder from '../../src2/mb.debug.js'
import BindingContext from '../../src2/BindingContext.js'

var mt = new MicroTester();

export default class ValueBinderTests {

    should_set_initial_value(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        var n1 = document.createElement('INPUT');
        n1.setAttribute('type', 'text');
        
        mb.executeBinding(n1, rootContext, {
            value: ()=>o.name
        }, 0);
        
        mt.Assert('object1', n1.value);
    }

    should_update_value(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        var n1 = document.createElement('INPUT');
        n1.setAttribute('type', 'text');
        
        mb.executeBinding(n1, rootContext, {
            value: ()=>o.name
        }, 0);

        o.name = 'object2';

        mt.Assert('object2', n1.value);
    }

    should_update_bound_object_property(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        var n1 = document.createElement('INPUT');
        n1.setAttribute('type', 'text');
        
        mb.executeBinding(n1, rootContext, {
            value: ()=>o.name
        }, 0);

        n1.value = 'object2';

        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("change", false, true);
        n1.dispatchEvent(evt);
        
        mt.Assert('object2', o.name);
    }

}