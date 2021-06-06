import MicroTester from '../MicroTester.js'
import MicroBinder from '../../src2/MicroBinderCore.js'

var mt = new MicroTester();

export default class ObjectHandlerTests {

    wrapped_objects_should_return_isProxy_true(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        mt.Assert(undefined, o._isProxy);
        o = mb.wrap(o);
        mt.Assert(true, o._isProxy);
    }

    unwrapped_objects_should_return_original_object(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        mt.Assert(undefined, o._isProxy);
        o = mb.wrap(o);
        mt.Assert(true, o._isProxy);
        o = mb.unwrap(o);
        mt.Assert(undefined, o._isProxy);
    }

    calling_wrap_twice_should_not_double_wrap(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        mt.Assert(undefined, o._isProxy);
        o = mb.wrap(o);
        o = mb.wrap(o);
        mt.Assert(true, o._isProxy);
        o = mb.unwrap(o);
        mt.Assert(undefined, o._isProxy);
    }

    properties_on_wrapped_objects_should_also_be_wrapped(){
        var mb = new MicroBinder();
        var o = { child: { name: 'object1'} };
        mt.Assert(undefined, o.child._isProxy);
        o = mb.wrap(o);
        mt.Assert(true, o._isProxy);
        mt.Assert(true, o.child._isProxy);
    }

    subscribers_should_be_notified(){
        var mb = new MicroBinder();
        var o = { name: 'object1' };
        o = mb.wrap(o);
        var newName = '';
        var counter = 0;
        o._subscribe('name', (newValue, oldValue)=> {
            newName = newValue;
            counter++;
        });
        o.name = 'object2';
        mt.Assert('object2', newName);
        mt.Assert(1, counter);
    }

    subscribers_on_child_properties_should_be_notified(){
        var mb = new MicroBinder();
        var o = { child: { name: 'object1'} };
        o = mb.wrap(o);
        var newName = '';
        var counter = 0;
        o.child._subscribe('name', (newValue, oldValue)=> {
            newName = newValue;
            counter++;
        });
        o.child.name = 'object2';
        mt.Assert('object2', newName);
        mt.Assert(1, counter);
    }
}