import GridTemplate from './GridTemplate.js'

var Panel = function (root, area) {
    this.root = root;
    this.name = 'mdi-window';
    this.area = area;
}

export default class MDIContainer {
    constructor(mb, params) {
        var self = this;

        this.gridTemplate = new GridTemplate(`"w0 w1 w1 w2 w2 w2 w11"
            "w0 w4 w4 w4 w4 w5 w11"
            "w0 w12 w12 w12 w12 w5 w11"
            "w0 w12 w12 w12 w12 w13 w11"
            "w0 w7 w7 w7 w8 w8 w11"
            "w9 w9 w10 w10 w10 w10 w11"`, 
            [100, 100, 50, 50, 75, 50], 
            [150, 100, 150, 50, 150, 100, 50]);

        this.areas = [
            ["w0", "w1", "w1", "w2", "w2", "w2", "w11"],
            ["w0", "w4", "w4", "w4", "w4", "w5", "w11"],
            ["w0", "w12", "w12", "w12", "w12", "w5", "w11"],
            ["w0", "w12", "w12", "w12", "w12", "w13", "w11"],
            ["w0", "w7", "w7", "w7", "w8", "w8", "w11"],
            ["w9", "w9", "w10", "w10", "w10", "w10", "w11"]
        ];

        this.logicalAreas = {};
        
        this.calculateLogicalAreas = function () {
            var result = {};
            var distinctAreas = [...new Set([].concat.apply([], this.areas))];
            distinctAreas.forEach(a => {
                var p = { name: a };
                result[a] = p;
                for (var y = 0; y < this.areas.length; y++) {
                    for (var x = 0; x < this.areas[0].length; x++) {
                        if (this.areas[y][x] == a) {
                            if (p.areaStartX == null) {
                                p.areaStartX = x;
                                p.areaEndX = x;
                            } else {
                                p.areaEndX = x;
                            }
                        } else {
                            if (p.areaStartX != null) {
                                p.areaEndX = x - 1;
                                break;
                            }
                        }
                    }
                    if (p.areaStartX != null) break;
                }
                if (p.areaStartX != null) {
                    for (var y = 0; y < this.areas.length; y++) {
                        if (this.areas[y][p.areaStartX] == a) {
                            if (p.areaStartY == null) {
                                p.areaStartY = y;
                                p.areaEndY = y;
                            } else {
                                p.areaEndY = y;
                            }
                        } else {
                            if (p.areaStartY != null) {
                                p.areaEndY = y - 1;
                                break;
                            }
                        }
                    }
                    if (p.areaEndY == null) p.areaEndY = this.areas.length - 1;
                }
            });
            
            console.log('recalculated logical areas');
            this.logicalAreas = result;
        };

        //this.lastAreaIndex = Object.keys(this.logicalAreas).length;

        //this.rows = [100, 100, 50, 50, 75, 50];
        //this.columns = [150, 100, 150, 50, 150, 100, 50];

        //this.calculateLogicalAreas();

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

        //this.gridTemplateRows = [];
        /*this.gridTemplateRows = function () {

            return this.rows.map(r => r + 'px').join(' ');

            var total = this.rows.reduce((a, b) => a + b, 0);
            var half = total/2;
            var cumulative = 0;
            var auto = false;
            return this.rows.map(r => {
                cumulative += r;
                if(cumulative > half && !auto){
                    auto = true;
                    return 'auto';
                }
                return r + 'px';
            }).join(' ');
        };*/

        this.gridTemplateRows = mb.computed(function(){return this.gridTemplate.rowArray.map(r => r + 'px').join(' ')}, this);
        this.gridTemplateColumns = mb.computed(function(){return this.gridTemplate.columnArray.map(r => r + 'px').join(' ')}, this);
        this.gridTemplateAreas = mb.computed(function (){return this.gridTemplate.getAreaString();}, this);
        
        // var wrappedThis = mb.wrap(this);
        // mb.bind(
        //     (function(){return this.columns.map(r => r + 'px').join(' ')}).bind(wrappedThis), 
        //     (function(v){
        //         if(this.gridTemplateColumns != v){
        //             console.log(v);
        //             this.gridTemplateColumns = v;
        //         }
        //     }).bind(wrappedThis)
        // );

        // mb.bind(
        //     (function(){return this.rows.map(r => r + 'px').join(' ')}).bind(wrappedThis), 
        //     (function(v){this.gridTemplateRows = v;}).bind(wrappedThis)
        // );

        // this.gridTemplateColumns = function () {
        //     return this.columns.map(r => r + 'px').join(' ');

        //     var total = this.columns.reduce((a, b) => a + b, 0);
        //     var half = total/2;
        //     var cumulative = 0;
        //     var auto = false;
        //     return this.columns.map(r => {
        //         cumulative += r;
        //         if(cumulative > half && !auto){
        //             auto = true;
        //             return 'auto';
        //         }
        //         return r + 'px';
        //     }).join(' ');
        // };

        // this.gridTemplateAreas = mb.computed(function () {
        //     return this.areas.map(r => "'" + r.join(' ') + "'").join('\n');
        // }, this);

        this.swapAreasX = function (areasToSwap) {
            areasToSwap.forEach(areaToSwap => {
                for (var sY = areaToSwap.areaStartY; sY <= areaToSwap.areaEndY; sY++) {
                    this.areas[sY][areaToSwap.areaEndX] = this.areas[sY][areaToSwap.areaEndX + 1];
                }

                console.log(areaToSwap);
                //this.logicalAreas[areaToSwap.name].areaEndX -= 1;
                //this.logicalAreas[this.areas[sY][areaToSwap.areaEndX + 1]].areaStartX -= 1;

                for (var key in this.logicalAreas) {
                    if (this.logicalAreas[key].areaStartX == areaToSwap.areaEndX) {
                        var areaToLeft = this.logicalAreas[key];
                        for (var sY = areaToLeft.areaStartY; sY <= areaToLeft.areaEndY; sY++) {
                            if(this.areas[sY][areaToLeft.areaStartX - 1] != areaToSwap.name){
                                this.areas[sY][areaToLeft.areaStartX] = this.areas[sY][areaToLeft.areaStartX - 1];
                                //this.logicalAreas[areaToLeft.name].areaStartX += 1;
                                //this.logicalAreas[areaToSwap.name].areaEndX += 1;
                            }
                        }
                    }
                }
            });
            this.calculateLogicalAreas();
        }

        this.swapAreasY = function (areasToSwap) {
            areasToSwap.forEach(areaToSwap => {
                for (var sX = areaToSwap.areaStartX; sX <= areaToSwap.areaEndX; sX++) {
                    this.areas[areaToSwap.areaEndY][sX] = this.areas[areaToSwap.areaEndY + 1][sX];
                }

                for (var key in this.logicalAreas) {
                    if (this.logicalAreas[key].areaStartY == areaToSwap.areaEndY) {
                        var areaAbove = this.logicalAreas[key];
                        for (var sX = areaAbove.areaStartX; sX <= areaAbove.areaEndX; sX++) {
                            this.areas[areaAbove.areaStartY][sX] = this.areas[areaAbove.areaStartY - 1][sX];
                        }
                    }
                }

            });
            this.calculateLogicalAreas();
        }

        this.getPanelWidth = function (panel) {
            var currentArea = this.logicalAreas[panel.area()];
            var columns = this.columns();
            var totalWidth = 0;
            for (var sX = currentArea.areaStartX; sX <= currentArea.areaEndX; sX++) {
                totalWidth += columns[sX];
            }
            return totalWidth;
        }

        this.getPanelHeight = function (panel) {
            var currentArea = this.logicalAreas[panel.area()];
            var rows = this.rows();
            var totalHeight = 0;
            for (var sY = currentArea.areaStartY; sY <= currentArea.areaEndY; sY++) {
                totalHeight += rows[sY];
            }
            return totalHeight;
        }

        this.splitAreaX = function (panel) {
            var dimentions = this.columns();
            var newAreas = this.areas;
            var currentArea = this.logicalAreas[panel.area()];
            var newArea = 'a' + this.lastAreaIndex++;

            var panelSize = this.getPanelWidth(panel);
            var halfSize = Math.floor(panelSize / 2);

            var splitDimention = null;
            var splitSize = null;

            for (var sY = 0; sY < newAreas.length; sY++) {
                if (newAreas[sY][currentArea.areaEndX] == panel.area()) {
                    var totalSize = 0;
                    for (var sX = currentArea.areaStartX; sX <= currentArea.areaEndX; sX++) {
                        totalSize += dimentions[sX];
                        if (totalSize > halfSize) {
                            if (splitDimention == null) {
                                splitDimention = sX;
                                splitSize = totalSize - halfSize;
                                break;
                            }
                        }
                    }
                }
            }

            for (var sY = 0; sY < newAreas.length; sY++) {
                if (newAreas[sY][splitDimention] == panel.area()) {
                    for (var sX = splitDimention + 1; sX <= currentArea.areaEndX; sX++) {
                        newAreas[sY][sX] = newArea;
                    }
                    newAreas[sY].splice(splitDimention + 1, 0, newArea);
                } else {
                    newAreas[sY].splice(splitDimention + 1, 0, newAreas[sY][splitDimention]);
                }
            }

            this.areas(newAreas);
            panel.area(newArea);

            var originalSize = dimentions[splitDimention];
            dimentions[splitDimention] = splitSize;
            dimentions.splice(splitDimention, 0, originalSize - splitSize);
            this.columns(dimentions);
        }
        this.splitAreaY = function (panel) {
            var dimentions = this.rows();
            var newAreas = this.areas;
            var currentArea = this.logicalAreas[panel.area()];
            var newArea = 'a' + this.lastAreaIndex++;

            var panelSize = this.getPanelHeight(panel);
            var halfSize = Math.floor(panelSize / 2);

            var splitDimention = null;
            var splitSize = null;

            for (var sX = 0; sX < newAreas[0].length; sX++) {
                if (newAreas[currentArea.areaEndY][sX] == panel.area()) {
                    var totalSize = 0;
                    for (var sY = currentArea.areaStartY; sY <= currentArea.areaEndY; sY++) {
                        totalSize += dimentions[sY];
                        if (totalSize > halfSize) {
                            if (splitDimention == null) {
                                splitDimention = sY;
                                splitSize = totalSize - halfSize;
                                break;
                            }
                        }
                    }
                }
            }

            newAreas.splice(splitDimention + 1, 0, []);
            for (var sX = 0; sX < newAreas[0].length; sX++) {
                if (newAreas[splitDimention][sX] == panel.area()) {
                    for (var sY = splitDimention + 1; sY <= currentArea.areaEndY + 1; sY++) {
                        newAreas[sY][sX] = newArea;
                    }
                    newAreas[splitDimention + 1][sX] = newArea;
                } else {
                    newAreas[splitDimention + 1][sX] = newAreas[splitDimention][sX];
                }
            }

            this.areas(newAreas);
            panel.area(newArea);

            var originalSize = dimentions[splitDimention];
            dimentions[splitDimention] = splitSize;
            dimentions.splice(splitDimention, 0, originalSize - splitSize);
            this.rows(dimentions);
        }

        this.removeArea = function (area) {
            var newAreas = this.areas;
            var areaToRemove = this.logicalAreas[area];

            var removeStartRow = areaToRemove.areaStartY > 0;
            var removeEndRow = areaToRemove.areaEndY < newAreas.length - 1;
            var removeStartColumn = true;
            var removeEndColumn = true;

            // Check row above
            if (removeStartRow) {
                for (var sX = 0; sX < newAreas[0].length; sX++) {
                    if (sX < areaToRemove.areaStartX || sX > areaToRemove.areaEndX) {
                        if (newAreas[areaToRemove.areaStartY][sX] != newAreas[areaToRemove.areaStartY - 1][sX]) {
                            removeStartRow = false;
                            break;
                        }
                    }
                }
            }
            // Check row below
            if (removeEndRow) {
                for (var sX = 0; sX < newAreas[0].length; sX++) {
                    if (sX < areaToRemove.areaStartX || sX > areaToRemove.areaEndX) {
                        if (newAreas[areaToRemove.areaEndY][sX] != newAreas[areaToRemove.areaEndY + 1][sX]) {
                            removeEndRow = false;
                            break;
                        }
                    }
                }
            }
            // Check column left
            for (var sY = 0; sY < newAreas.length; sY++) {
                if (sY < areaToRemove.areaStartY || sY > areaToRemove.areaEndY) {
                    if (newAreas[sY][areaToRemove.areaStartX] != newAreas[sY][areaToRemove.areaStartX - 1]) {
                        removeStartColumn = false;
                        break;
                    }
                }
            }
            // Check column right
            for (var sY = 0; sY < newAreas.length; sY++) {
                if (sY < areaToRemove.areaStartY || sY > areaToRemove.areaEndY) {
                    if (newAreas[sY][areaToRemove.areaEndX] != newAreas[sY][areaToRemove.areaEndX + 1]) {
                        removeEndColumn = false;
                        break;
                    }
                }
            }

            if (removeStartRow) {
                newAreas.splice(areaToRemove.areaStartY, 1);
                for (var sY = areaToRemove.areaStartY; sY <= areaToRemove.areaEndY - 1; sY++) {
                    for (var sX = areaToRemove.areaStartX; sX <= areaToRemove.areaEndX; sX++) {
                        newAreas[sY][sX] = newAreas[areaToRemove.areaStartY - 1][sX];
                    }
                }
                var removed = this.rows.splice(areaToRemove.areaStartY, 1);
                this.rows[areaToRemove.areaStartY == 0 ? 0 : areaToRemove.areaStartY - 1] += removed[0];
            }
            else if (removeEndRow) {
                newAreas.splice(areaToRemove.areaEndY, 1);
                for (var sY = areaToRemove.areaStartY; sY <= areaToRemove.areaEndY - 1; sY++) {
                    for (var sX = areaToRemove.areaStartX; sX <= areaToRemove.areaEndX; sX++) {
                        newAreas[sY][sX] = newAreas[areaToRemove.areaEndY][sX];
                    }
                }
                var removed = this.rows.splice(areaToRemove.areaEndY, 1);
                this.rows[areaToRemove.areaEndY] += removed[0];
            }
            if (removeStartColumn) {
                for (var sY = areaToRemove.areaStartY; sY <= areaToRemove.areaEndY; sY++) {
                    for (var sX = areaToRemove.areaStartX; sX <= areaToRemove.areaEndX; sX++) {
                        newAreas[sY][sX] = newAreas[sY][areaToRemove.areaStartX - 1];
                    }
                }
                for (var sY = 0; sY < newAreas.length; sY++) {
                    newAreas[sY].splice(areaToRemove.areaStartX, 1);
                }
                var removed = this.columns.splice(areaToRemove.areaStartX, 1);
                this.columns[areaToRemove.areaStartX == 0 ? 0 : areaToRemove.areaStartX - 1] += removed[0];
            }
            else if (removeEndColumn) {
                for (var sY = areaToRemove.areaStartY; sY <= areaToRemove.areaEndY; sY++) {
                    for (var sX = areaToRemove.areaStartX; sX <= areaToRemove.areaEndX; sX++) {
                        newAreas[sY][sX] = newAreas[sY][areaToRemove.areaEndX + 1];
                    }
                }

                for (var sY = 0; sY < newAreas.length; sY++) {
                    newAreas[sY].splice(areaToRemove.areaEndX, 1);
                }
                var removed = this.columns.splice(areaToRemove.areaEndX, 1);
                this.columns[areaToRemove.areaEndX] += removed[0];
            }

            //this.areas(newAreas);

            this.calculateLogicalAreas();
        }

        
    }
}