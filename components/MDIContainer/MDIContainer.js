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
        this.dropAreaPosition = '';
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

        this.dropAreaHandle = mb.computed(function () {
            var result = this.gridTemplate.getAreaRowIndex(this.dropArea) > 0 ? 't' : '';
            result = this.gridTemplate.getAreaColumnIndex(this.dropArea) > 0 ? result + ' l' : result;
            result += ' ' + this.dropAreaPosition;
            return result;
        }, this);

        this.emptyArea = mb.computed(function () {
            var areas = [...this.gridTemplate.areaArray];

            for (let index = 0; index < this.gridTemplate.areaArray.length; index++) {
                const element = this.gridTemplate.areaArray[index];
                if(this.panels.find(p => p.area == element) != null){
                    delete areas[index];
                }
            }
            
            return areas.find(a => a != null);
        }, this);
    }

    mouseEnter(e){
        if(this.dropping){
            this.dropArea = this.emptyArea();
            this.dropAreaPosition = 'fill';
        }
    }

    mouseLeave(e){
        if(this.dropping){
            this.dropArea = '';
        }
    }

    mouseMove(m, e){
        if(this.dropping){
            this.dropArea = this.emptyArea();
            this.dropAreaMouseMove(e);
        }
    }

    dropAreaMouseMove(e){
        var rect = e.currentTarget.getBoundingClientRect();
        var halfWidth = rect.width / 2;
        var halfHeight = rect.height / 2;
        var aspectRatio = rect.height / rect.width;
        var recenteredX = (e.layerX-halfWidth)*aspectRatio;
        var recenteredY = e.layerY-halfHeight;
        var fillX = (rect.width / 6)*aspectRatio;
        var fillY = (rect.height / 6);

        if(recenteredX>Math.abs(recenteredY) && recenteredX > fillX){
            this.dropAreaPosition = 'endX';
        } else if(-recenteredX>Math.abs(recenteredY) && -recenteredX > fillX){
            this.dropAreaPosition = 'startX';
        } else if(recenteredY>Math.abs(recenteredX) && recenteredY > fillY){
            this.dropAreaPosition = 'endY';
        } else if(-recenteredY>Math.abs(recenteredX) && -recenteredY > fillY){
            this.dropAreaPosition = 'startY';
        } else {
            this.dropAreaPosition = 'fill';
        }
    }
}