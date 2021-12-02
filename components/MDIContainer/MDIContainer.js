import GridTemplate from './GridTemplate.js'

var Panel = function (root, area) {
    this.root = root;
    this.name = 'mdi-window';
    this.area = area;
}

export default class MDIContainer {
    constructor(mb, params) {
        var self = this;
        this.showGrid = false;
        this.dropping = false;
        this.dropArea = '';
        this.gridTemplate = new GridTemplate(`"w0 w1 w1 w2 w2 w2 w11"
            "w0 w4 w4 w4 w4 w5 w11"
            "w0 w12 w12 w12 w12 w5 w11"
            "w0 w12 w12 w12 w12 w13 w11"
            "w0 w7 w7 w7 w8 w8 w11"
            "w9 w9 w10 w10 w10 w10 w11"`, 
            [100, 100, 50, 50, 75, 50], 
            [150, 100, 150, 50, 150, 100, 50]);

        this.panels = [];

        this.panels.push(new Panel(this, 'w0'));
        this.panels.push(new Panel(this, 'w1'));
        this.panels.push(new Panel(this, 'w2'));
        this.panels.push(new Panel(this, 'w4'));
        this.panels.push(new Panel(this, 'w5'));
        this.panels.push(new Panel(this, 'w7'));
        this.panels.push(new Panel(this, 'w8'));
        this.panels.push(new Panel(this, 'w9'));
        this.panels.push(new Panel(this, 'w10'));
        this.panels.push(new Panel(this, 'w11'));
        this.panels.push(new Panel(this, 'w12'));
        this.panels.push(new Panel(this, 'w13'));

        this.gridTemplateRows = mb.computed(function(){return this.gridTemplate.rowArray.map(r => r + 'px').join(' ')}, this);
        this.gridTemplateColumns = mb.computed(function(){return this.gridTemplate.columnArray.map(r => r + 'px').join(' ')}, this);
        this.gridTemplateAreas = mb.computed(function (){return this.gridTemplate.getAreaString();}, this);

        this.splitAreaX = function (area) {
            var newArea = this.gridTemplate.splitX(area);
            this.panels.push(new Panel(this, newArea));
        }
        this.splitAreaY = function (area) {
            var newArea = this.gridTemplate.splitY(area);
            this.panels.push(new Panel(this, newArea));
        }
        this.removeArea = function (area) {
            this.gridTemplate.removeArea(area);
        }
        this.removeAreaIfEmpty = function(area){
            if(!this.panels.some(x => x.area == area)){
                this.removeArea(area);
            }
        }
    }
}