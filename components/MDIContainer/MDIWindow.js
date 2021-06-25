export default class MDIWindow {
    constructor(mb, params) {
        this.model = params;
        this.handle = mb.computed(function () {
            var area = this.model.root.logicalAreas[this.model.area];
            if (area == null) return '';
            var result = area.areaStartY > 0 ? 't' : '';
            return area.areaStartX > 0 ? result + ' l' : result;
        }, this);
        this.areaObject = function () {
            return this.model.root.logicalAreas[this.model.area];
        };
        this.startSize = 0;
        this.startMouseX = null;
        this.startMouseY = null;
        this.areasBeingSized = null;
        this.areasBeingSizedB = null;
    }

    handleEvent(e) {
        if (e.type === "mousemove"){
            if(this.startMouseX != null){
                return this.mouseMoveX(e);
            } else {
                return this.mouseMoveY(e);
            }
        } else if(e.type === "mouseup"){
            console.log('up');
            return this.mouseUp();
        }
    }

    mouseUp(e) {
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);
        this.startMouseX = null;
        this.startMouseY = null;
        document.body.style.cursor = 'auto';
    };

    mouseDown(m, e) {
        var area = this.model.root.logicalAreas[this.model.area];
        
        if (e.offsetY <= 6 && this.handle().startsWith('t')) {
            this.startSize = this.model.root.rows[area.areaStartY - 1];
            this.startMouseY = e.clientY;
            this.areasBeingSized = [];
            this.areasBeingSizedB = [];
            for (var key in this.model.root.logicalAreas) {
                var a = this.model.root.logicalAreas[key];
                if (a.areaEndY == area.areaStartY - 1) {
                    this.areasBeingSized.push(key);
                    for (var sX = a.areaStartX; sX <= a.areaEndX; sX++) {
                        this.areasBeingSizedB.push(this.model.root.areas[a.areaEndY + 1][sX]);
                    }
                }
            }
            this.areasBeingSizedB = [...new Set(this.areasBeingSizedB)];
            window.addEventListener('mousemove', this);
            window.addEventListener('mouseup', this);
            document.body.style.cursor = 'ns-resize';
        }
        else if (e.offsetX <= 6 && this.handle().endsWith('l')) {
            this.startSize = this.model.root.columns[area.areaStartX - 1];
            this.startMouseX = e.clientX;
            this.areasBeingSized = [];
            this.areasBeingSizedB = [];
            for (var key in this.model.root.logicalAreas) {
                var a = this.model.root.logicalAreas[key];
                if (a.areaEndX == area.areaStartX - 1) {
                    this.areasBeingSized.push(key);
                    for (var sY = a.areaStartY; sY <= a.areaEndY; sY++) {
                        this.areasBeingSizedB.push(this.model.root.areas[sY][a.areaEndX + 1]);
                    }
                }
            }
            this.areasBeingSizedB = [...new Set(this.areasBeingSizedB)];
            window.addEventListener('mousemove', this, false);
            window.addEventListener('mouseup', this, false);
            document.body.style.cursor = 'ew-resize';
        }
        
        if(e.stopPropagation) e.stopPropagation();
        if(e.preventDefault) e.preventDefault();
        e.cancelBubble=true;
        e.returnValue=false;
        return false;
    }

    mouseMoveX (e) {
        var area = this.model.root.logicalAreas[this.model.area];
        var newColumns = this.model.root.columns;
        var newSize = this.startSize + e.clientX - this.startMouseX;
        var oldSize = newColumns[area.areaStartX - 1];
        var newSizeB = newColumns[area.areaStartX] + oldSize - newSize;

        for (var i = 0; i < this.areasBeingSized.length; i++) {
            var areaBeingSized = this.model.root.logicalAreas[this.areasBeingSized[i]];
            if (areaBeingSized.areaStartX == areaBeingSized.areaEndX && newSize < 6) {
                var minWidth = areaBeingSized.areaStartX == 0 ? 0 : 6;
                newColumns[area.areaStartX - 1] = minWidth;
                newColumns[area.areaStartX] = newColumns[area.areaStartX] + oldSize - minWidth;
                return;
            }
        }
        for (var i = 0; i < this.areasBeingSizedB.length; i++) {
            var areaBeingSizedB = this.model.root.logicalAreas[this.areasBeingSizedB[i]];
            if (areaBeingSizedB.areaStartX == areaBeingSizedB.areaEndX && newSizeB < 6) {
                newColumns[area.areaStartX - 1] = newColumns[area.areaStartX] + oldSize - 6;
                newColumns[area.areaStartX] = 6;
                return;
            }
        }

        if (newSize < 0) {
            newColumns[area.areaStartX - 1] = 0;
            newColumns[area.areaStartX] = newSize + newSizeB;

            var areasToSwap = [];
            for (var key in this.model.root.logicalAreas) {
                if (this.model.root.logicalAreas[key].areaEndX == area.areaStartX - 1) {
                    areasToSwap.push(this.model.root.logicalAreas[key]);
                }
            }

            this.model.root.swapAreasX(areasToSwap);

            area = this.model.root.logicalAreas[this.model.area];
            this.startSize = this.model.root.columns[area.areaStartX - 1];
            this.startMouseX = e.clientX;

            return;
        }
        else if (newSizeB < 0) {
            newColumns[area.areaStartX - 1] = newSize + newSizeB;
            newColumns[area.areaStartX] = 0;

            var areasToSwap = [];
            for (var key in this.model.root.logicalAreas) {
                if (this.model.root.logicalAreas[key].areaEndX == area.areaStartX) {
                    areasToSwap.push(this.model.root.logicalAreas[key]);
                }
            }
            this.model.root.swapAreasX(areasToSwap);
            area = this.model.root.logicalAreas[this.model.area];
            this.startSize = this.model.root.columns[area.areaStartX - 1];
            this.startMouseX = e.clientX;

            return;
        } else {
            newColumns[area.areaStartX - 1] = newSize;
            newColumns[area.areaStartX] = newSizeB;
        }


    }
    mouseMoveY(e) {
        var area = this.model.root.logicalAreas[this.model.area];
        var newRows = this.model.root.rows;
        var newSize = this.startSize + e.clientY - this.startMouseY;
        var oldSize = newRows[area.areaStartY - 1];
        var newSizeB = newRows[area.areaStartY] + oldSize - newSize;

        for (var i = 0; i < this.areasBeingSized.length; i++) {
            var areaBeingSized = this.model.root.logicalAreas[this.areasBeingSized[i]];
            if (areaBeingSized.areaStartY == areaBeingSized.areaEndY && newSize < 6) {
                var minHeight = areaBeingSized.areaStartY == 0 ? 0 : 6;
                newRows[area.areaStartY - 1] = minHeight;
                newRows[area.areaStartY] = newRows[area.areaStartY] + oldSize - minHeight;
                return;
            }
        }

        for (var i = 0; i < this.areasBeingSizedB.length; i++) {
            var areaBeingSizedB = this.model.root.logicalAreas[this.areasBeingSizedB[i]];
            if (areaBeingSizedB.areaStartY == areaBeingSizedB.areaEndY && newSizeB < 6) {
                newRows[area.areaStartY - 1] = newRows[area.areaStartY] + oldSize - 6;
                newRows[area.areaStartY] = 6;
                return;
            }
        }

        if (newSize < 0) {
            newRows[area.areaStartY - 1] = 0;
            newRows[area.areaStartY] = newSize + newSizeB;

            var areasToSwap = [];
            for (var key in this.model.root.logicalAreas) {
                if (this.model.root.logicalAreas[key].areaEndY == area.areaStartY - 1) {
                    areasToSwap.push(this.model.root.logicalAreas[key]);
                }
            }

            this.model.root.swapAreasY(areasToSwap);

            area = this.model.root.logicalAreas[this.model.area];
            this.startSize = this.model.root.rows[area.areaStartY - 1];
            this.startMouseY = e.clientY;

            return;
        }
        else if (newSizeB < 0) {
            newRows[area.areaStartY - 1] = newSize + newSizeB;
            newRows[area.areaStartY] = 0;

            var areasToSwap = [];
            for (var key in this.model.root.logicalAreas) {
                if (this.model.root.logicalAreas[key].areaEndY == area.areaStartY) {
                    areasToSwap.push(this.model.root.logicalAreas[key]);
                }
            }
            this.model.root.swapAreasY(areasToSwap);
            area = this.model.root.logicalAreas[this.model.area];
            this.startSize = this.model.root.rows[area.areaStartY - 1];
            this.startMouseY = e.clientY;

            return;
        } else {
            newRows[area.areaStartY - 1] = newSize;
            newRows[area.areaStartY] = newSizeB;
        }
    }

    splitX() {
        this.model.root.panels.push(new Panel(this.model.root, this.model.area));
        this.model.root.splitAreaX(this.model);
    };
    splitY() {
        this.model.root.panels.push(new Panel(this.model.root, this.model.area));
        this.model.root.splitAreaY(this.model);
    };

    close() {
        var index = this.model.root.panels.indexOf(this.model);
        if (index !== -1) {
            this.model.root.panels.splice(index, 1);
        }

        //this.model.root.panels.remove(this.model);
        this.model.root.removeArea(this.model.area);
    };
}