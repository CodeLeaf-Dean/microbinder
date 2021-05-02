import MicroTester from './MicroTester.js'
import MicroBinder from '../src2/MicroBinder.js'

var mt = new MicroTester();

export default class DateHandlerTests {

    subscribers_should_be_notified_of_replacement_dates(){
        var mb = new MicroBinder();
        var o = { name: 'object1', lastUpdated: new Date(2000,0,1) };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' lastUpdated ' + o.lastUpdated.toLocaleDateString("en-GB"), v => result = v);
        mt.Assert('object1 lastUpdated 01/01/2000', result);
        o.lastUpdated = new Date(2000,0,2);
        mt.Assert('object1 lastUpdated 02/01/2000', result);
    }

    subscribers_should_be_notified_of_date_adjustments(){
        var mb = new MicroBinder();
        var o = { name: 'object1', lastUpdated: new Date(2000,0,1) };
        o = mb.wrap(o);
        var result = null;
        mb.bind(()=>o.name + ' lastUpdated ' + o.lastUpdated.toLocaleDateString("en-GB"), v => result = v);
        mt.Assert('object1 lastUpdated 01/01/2000', result);
        o.lastUpdated.setMonth(1);
        mt.Assert('object1 lastUpdated 01/02/2000', result);
    }

}