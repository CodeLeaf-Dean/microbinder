import MicroTester from './MicroTester.js'
import GridTemplate from '../components/MDIContainer/GridTemplate.js'

var mt = new MicroTester();

export default class MDITests 
{
    constructor(){
        this.startAreaString =  `"w0 w1 w1 w2 w2 w2 w11"
"w0 w4 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
    }

    can_load_from_string(){
        var gridTemplate = new GridTemplate(this.startAreaString)
        var expectedAreas = ["w0","w1","w1","w2","w2","w2","w11","w0","w4","w4","w4","w4","w5","w11","w0","w12","w12","w12","w12","w5","w11","w0","w12","w12","w12","w12","w13","w11","w0","w7","w7","w7","w8","w8","w11","w9","w9","w10","w10","w10","w10","w11"];
        mt.Assert(expectedAreas, gridTemplate.areaArray);
    }

    can_save_to_string(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
    }

    can_get_area_column_index(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        mt.Assert(0, gridTemplate.getAreaColumnIndex("w0"));
        mt.Assert(1, gridTemplate.getAreaColumnIndex("w1"));
        mt.Assert(3, gridTemplate.getAreaColumnIndex("w2"));
        mt.Assert(1, gridTemplate.getAreaColumnIndex("w4"));
        mt.Assert(5, gridTemplate.getAreaColumnIndex("w5"));
        mt.Assert(1, gridTemplate.getAreaColumnIndex("w7"));
        mt.Assert(4, gridTemplate.getAreaColumnIndex("w8"));
        mt.Assert(0, gridTemplate.getAreaColumnIndex("w9"));
        mt.Assert(2, gridTemplate.getAreaColumnIndex("w10"));
        mt.Assert(6, gridTemplate.getAreaColumnIndex("w11"));
        mt.Assert(1, gridTemplate.getAreaColumnIndex("w12"));
        mt.Assert(5, gridTemplate.getAreaColumnIndex("w13"));
    }

    can_get_area_row_index(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        mt.Assert(0, gridTemplate.getAreaRowIndex("w0"));
        mt.Assert(0, gridTemplate.getAreaRowIndex("w1"));
        mt.Assert(0, gridTemplate.getAreaRowIndex("w2"));
        mt.Assert(1, gridTemplate.getAreaRowIndex("w4"));
        mt.Assert(1, gridTemplate.getAreaRowIndex("w5"));
        mt.Assert(4, gridTemplate.getAreaRowIndex("w7"));
        mt.Assert(4, gridTemplate.getAreaRowIndex("w8"));
        mt.Assert(5, gridTemplate.getAreaRowIndex("w9"));
        mt.Assert(5, gridTemplate.getAreaRowIndex("w10"));
        mt.Assert(0, gridTemplate.getAreaRowIndex("w11"));
        mt.Assert(2, gridTemplate.getAreaRowIndex("w12"));
        mt.Assert(3, gridTemplate.getAreaRowIndex("w13"));
    }

    can_not_swap_column_0_or_1(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        gridTemplate.swapColumn(0);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
        gridTemplate.swapColumn(1);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
    }

    can_swap_column_2(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        var expected =  `"w0 w0 w1 w2 w2 w2 w11"
"w0 w0 w4 w4 w4 w5 w11"
"w0 w0 w12 w12 w12 w5 w11"
"w0 w0 w12 w12 w12 w13 w11"
"w0 w0 w7 w7 w8 w8 w11"
"w9 w10 w10 w10 w10 w10 w11"`;
        gridTemplate.swapColumn(2);
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_swap_column_3(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        var expected =  `"w0 w1 w2 w2 w2 w2 w11"
"w0 w4 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w8 w8 w11"
"w9 w9 w9 w10 w10 w10 w11"`;
        gridTemplate.swapColumn(3);
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_swap_column_4(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        var expected =  `"w0 w1 w1 w1 w2 w2 w11"
"w0 w4 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w8 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
        gridTemplate.swapColumn(4);
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_swap_column_5(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        var expected =  `"w0 w1 w1 w2 w2 w2 w11"
"w0 w4 w4 w4 w5 w5 w11"
"w0 w12 w12 w12 w5 w5 w11"
"w0 w12 w12 w12 w13 w13 w11"
"w0 w7 w7 w7 w7 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
        gridTemplate.swapColumn(5);
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_not_swap_column_6(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        gridTemplate.swapColumn(6);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
    }

    can_not_swap_column_7(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        gridTemplate.swapColumn(7);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
    }

    can_not_swap_row_2(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        gridTemplate.swapRow(2);
        mt.Assert(this.startAreaString, gridTemplate.getAreaString());
    }

    can_swap_row_3(){
        var gridTemplate = new GridTemplate(this.startAreaString);
        var expected =  `"w0 w1 w1 w2 w2 w2 w11"
"w0 w4 w4 w4 w4 w5 w11"
"w0 w4 w4 w4 w4 w13 w11"
"w0 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
        gridTemplate.swapRow(3);
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_area_fill_left(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w1 w1 w1 w1 w11"
"w0 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w13 w11"
"w0 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w11"`;
        gridTemplate.removeArea("w2");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_area_fill_right(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w2 w2 w2 w2 w11"
"w0 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w13 w11"
"w0 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w11"`;
        gridTemplate.removeArea("w1");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_area_fill_top(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w1 w1 w2 w2 w2 w11"
"w0 w4 w4 w4 w4 w5 w11"
"w0 w4 w4 w4 w4 w13 w11"
"w0 w7 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
        gridTemplate.removeArea("w12");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_area_fill_bottom(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w1 w1 w2 w2 w2 w11"
"w0 w12 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w11"`;
        gridTemplate.removeArea("w4");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_area_w8(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w1 w1 w2 w2 w11"
"w0 w4 w4 w4 w5 w11"
"w0 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w7 w11"
"w9 w9 w10 w10 w10 w11"`;
        gridTemplate.removeArea("w8");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_remove_first_area(){
        var gridTemplate = new GridTemplate(`"w1 w2 w2 w2"
"w4 w4 w4 w5"
"w12 w12 w12 w5"
"w12 w12 w12 w13"
"w7 w7 w8 w8"`, [10,10,10,10],[10,10,10,10]);
        var expected =  `"w2 w2 w2"
"w4 w4 w5"
"w12 w12 w5"
"w12 w12 w13"
"w7 w8 w8"`;
        gridTemplate.removeArea("w1");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

    can_split_x(){
        var gridTemplate = new GridTemplate(this.startAreaString, [10,10,10,10,10,10], [10,10,10,10,10,10,10]);
        var expected =  `"w0 w1 w1 w1 w2 w2 w2 w11"
"w0 w4 w4 a42 a42 a42 w5 w11"
"w0 w12 w12 w12 w12 w12 w5 w11"
"w0 w12 w12 w12 w12 w12 w13 w11"
"w0 w7 w7 w7 w7 w8 w8 w11"
"w9 w9 w10 w10 w10 w10 w10 w11"`;
        gridTemplate.splitX("w4");
        mt.Assert(expected, gridTemplate.getAreaString());
    }

}