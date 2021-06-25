import MicroTester from '../MicroTester.js'
import MicroBinder from '../../src2/mb.debug.js'
import BindingContext from '../../src2/BindingContext.js'

var mt = new MicroTester();

export default class IfBinderTests {

    should_set_initial_content_if_true(){
        var mb = new MicroBinder();
        var o = { name: 'object1', visible: true };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        mb.bindObjects[0] = (function anonymous($context,n0,$funcElement) {
            var e = document.createElement('p');
            n0.appendChild(e);
        });

        var n1 = document.createElement('div');
        
        mb.executeBinding(n1, rootContext, {
            if: ()=>o.visible
        }, 0);
        
        mt.Assert(true, n1.hasChildNodes());
    }

    should_not_set_initial_content_if_false(){
        var mb = new MicroBinder();
        var o = { name: 'object1', visible: false };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        mb.bindObjects[0] = (function anonymous($context,n0,$funcElement) {
            var e = document.createElement('p');
            n0.appendChild(e);
        });

        var n1 = document.createElement('div');
        
        mb.executeBinding(n1, rootContext, {
            if: ()=>o.visible
        }, 0);
        
        mt.Assert(false, n1.hasChildNodes());
    }

    should_remove_children_when_updated_to_false(){
        var mb = new MicroBinder();
        var o = { name: 'object1', visible: true };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        mb.bindObjects[0] = (function anonymous($context,n0,$funcElement) {
            var e = document.createElement('p');
            n0.appendChild(e);
        });

        var n1 = document.createElement('div');
        
        mb.executeBinding(n1, rootContext, {
            if: ()=>o.visible
        }, 0);
        
        mt.Assert(true, n1.hasChildNodes());

        o.visible = false;

        mt.Assert(false, n1.hasChildNodes());
    }

    should_add_children_when_updated_to_true(){
        var mb = new MicroBinder();
        var o = { name: 'object1', visible: false };
        o = mb.wrap(o);

        var rootContext = new BindingContext(mb, o);

        mb.bindObjects[0] = (function anonymous($context,n0,$funcElement) {
            var e = document.createElement('p');
            n0.appendChild(e);
        });

        var n1 = document.createElement('div');
        
        mb.executeBinding(n1, rootContext, {
            if: ()=>o.visible
        }, 0);
        
        mt.Assert(false, n1.hasChildNodes());

        o.visible = true;

        mt.Assert(true, n1.hasChildNodes());
    }

}