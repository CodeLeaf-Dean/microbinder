import MicroTester from './MicroTester.js'
import MicroBinder from '../src2/MicroBinder.js'

var mt = new MicroTester();

export default class BindTests {
    bind_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);
        var newName = null;
        mb.bind(()=>o.name, v => newName = v);
        mt.Assert('object1', newName);
        o.name = 'object2';
        mt.Assert('object2', newName);
    }

    bind_should_notify_subscribers_multiple_properties(){
        var mb = new MicroBinder();
        var o = { firstName: 'first1', lastName: 'last1' };
        o = mb.wrap(o);
        var newName = null;
        mb.bind(()=>o.firstName + ' ' + o.lastName, v => newName = v);
        mt.Assert('first1 last1', newName);
        o.firstName = 'first2';
        mt.Assert('first2 last1', newName);
        o.lastName = 'last2';
        mt.Assert('first2 last2', newName);
    }

    bind_should_notify_multiple_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);

        var newName1 = null;
        mb.bind(()=>o.name, v => newName1 = v);
        mt.Assert('object1', newName1);

        var newName2 = null;
        mb.bind(()=>o.name, v => newName2 = v);
        mt.Assert('object1', newName2);

        o.name = 'object2';
        mt.Assert('object2', newName1);
        mt.Assert('object2', newName2);
    }

    bind_should_notify_subscribers_of_child_object_property_changes(){
        var mb = new MicroBinder();
        var o = { name: 'object1', child: { name: 'child1'} };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' parent of ' + o.child.name, v => result = v);
        mt.Assert('object1 parent of child1', result);
        o.name = 'object2';
        mt.Assert('object2 parent of child1', result);
        o.child.name = 'child2';
        mt.Assert('object2 parent of child2', result);
    }

    bind_should_notify_subscribers_of_child_object_changes(){
        var mb = new MicroBinder();
        var o = { name: 'object1', child: { name: 'child1'} };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' parent of ' + o.child.name, v => result = v);
        mt.Assert('object1 parent of child1', result);
        o.name = 'object2';
        mt.Assert('object2 parent of child1', result);
        o.child = { name: 'child2'};
        mt.Assert('object2 parent of child2', result);
    }

    bind_should_allow_multiple_objects(){
        var mb = new MicroBinder();
        var o1 = { name: 'object1' };
        var o2 = { name: 'object2' };
        o1 = mb.wrap(o1);
        o2 = mb.wrap(o2);
        var result = null;
        mb.bind(()=>o1.name + ' and ' + o2.name, v => result = v);
        mt.Assert('object1 and object2', result);
        o1.name = 'object3';
        mt.Assert('object3 and object2', result);
        o2.name = 'object4';
        mt.Assert('object3 and object4', result);
    }

    bind_should_allow_setting_wrapped_objects(){
        var mb = new MicroBinder();
        var o1 = { name: 'object1', child: { name: 'child1'} };
        var o2 = { name: 'object2', child: { name: 'child2'} };
        o1 = mb.wrap(o1);
        o2 = mb.wrap(o2);
        var result = null;
        mb.bind(()=>o2.name + ' parent of ' + o2.child.name, v => result = v);
        var o1ChildName = null;
        mb.bind(()=>o1.child.name, v => o1ChildName = v);
        mt.Assert('object2 parent of child2', result);
        o2.child = o1.child;
        mt.Assert('object2 parent of child1', result);
        // Now that o1 and o2 point to the same child, changing its name should notify both sets of subscribers
        o2.child.name = 'child3';
        mt.Assert('object2 parent of child3', result);
        mt.Assert('child3', o1.child.name);
        mt.Assert('child3', o1ChildName);
        o1.child.name = 'child4';
        mt.Assert('object2 parent of child4', result);
    }

    bind_should_notify_subscribers_of_null_values(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);
        var newName = null;
        mb.bind(()=>o.name, v => newName = v);
        mt.Assert('object1', newName);
        o.name = null;
        mt.Assert(null, newName);
    }

    bind_should_allow_calculations(){
        var mb = new MicroBinder();
        var o = { name: 'object1', a: 1, b: 2 };
        o = mb.wrap(o);
        var calc = null;
        mb.bind(()=>o.a + o.b, v => calc = v);
        mt.Assert(3, calc);
        o.a = 2;
        mt.Assert(4, calc);
    }

    bindings_should_be_reevaluated_on_subscribers_notified(){
        var mb = new MicroBinder();
        var o = { type: 1, a:'A', b:'B', c:'C' };
        o = mb.wrap(o);
        var result = '';
        mb.bind(()=>{
            if(o.type == 1){
                return o.a;
            } else if(o.type == 2){
                return o.a + ' ' + o.b;
            } else {
                return o.c;
            }
        }, v => result = v);
        mt.Assert('A', result);
        o.type = 2;
        mt.Assert('A B', result);
        o.type = 3;
        mt.Assert('C', result);
        o.b = 'BB';
        mt.Assert('C', result);
        o.type = 2;
        mt.Assert('A BB', result);
    }
}