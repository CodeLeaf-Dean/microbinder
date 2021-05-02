import MicroTester from './MicroTester.js'
import MicroBinder from '../src2/MicroBinder.js'

var mt = new MicroTester();

export default class ArrayHandlerTests {

    push_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.length, v => result = v);
        mt.Assert('object1 1', result);
        o.children.push({name:'child2'});
        mt.Assert('object1 2', result);
    }

    map_should_trigger_when_push_called(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1', result);
        o.children.push({name:'child2'});
        mt.Assert('object1 child1,child2', result);
    }

    map_should_trigger_when_child_modified(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2', result);
        o.children[1].name="child3";
        mt.Assert('object1 child1,child3', result);
    }

    splice_should_notify_subscribers_when_inserting(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'}, {name:'child3'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child3', result);
        o.children.splice(1,0,{name:'child2'});
        mt.Assert('object1 child1,child2,child3', result);
    }

    splice_should_notify_subscribers_when_deleting(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'}, {name:'child3'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child3', result);
        o.children.splice(1,1);
        mt.Assert('object1 child1', result);
    }

    splice_should_notify_subscribers_when_replacing(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'}, {name:'child3'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child3', result);
        o.children.splice(1,1,{name:'child2'});
        mt.Assert('object1 child1,child2', result);
    }

    pop_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2', result);
        o.children.pop();
        mt.Assert('object1 child1', result);
    }

    shift_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2', result);
        o.children.shift();
        mt.Assert('object1 child2', result);
    }

    unshift_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2', result);
        o.children.unshift({name:'child0'});
        mt.Assert('object1 child0,child1,child2', result);
    }

    reverse_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'},{name:'child3'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2,child3', result);
        o.children.reverse();
        mt.Assert('object1 child3,child2,child1', result);
    }

    reverse_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child3'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child3,child2', result);
        o.children.sort(function(a, b) {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          });
        mt.Assert('object1 child1,child2,child3', result);
    }

    fill_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'},{name:'child3'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2,child3', result);
        o.children.fill({name:'child1'});
        mt.Assert('object1 child1,child1,child1', result);
    }

    nested_arrays_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { 
            name: 'object1', 
            children:[
                {name:'child1',children:[{name:'grandchild1'}]},
                {name:'child2',children:[]},
                {name:'child3',children:[]}
            ] 
        };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name + '(' + c.children.map(g=>g.name).join() + ')').join(), v => result = v);
        mt.Assert('object1 child1(grandchild1),child2(),child3()', result);
        o.children[1].children.push({name:'grandchild2'});
        mt.Assert('object1 child1(grandchild1),child2(grandchild2),child3()', result);
        o.children[0].children.push({name:'grandchild3'});
        mt.Assert('object1 child1(grandchild1,grandchild3),child2(grandchild2),child3()', result);
    }

    arrays_of_arrays_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { 
            name: 'object1', 
            children:[['a','b','c'],['d','e','f'],['g','h','i']] 
        };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.join(), v => result = v);
        mt.Assert('object1 a,b,c,d,e,f,g,h,i', result);
        o.children[1].push('j');
        mt.Assert('object1 a,b,c,d,e,f,j,g,h,i', result);
        o.children.splice(1,1);
        mt.Assert('object1 a,b,c,g,h,i', result);
    }

    set_length_should_notify_subscribers(){
        var mb = new MicroBinder();
        var o = { name: 'object1', children:[{name:'child1'},{name:'child2'}] };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' ' + o.children.map(c=>c.name).join(), v => result = v);
        mt.Assert('object1 child1,child2', result);
        o.children.length = 1;
        mt.Assert('object1 child1', result);
    }

}