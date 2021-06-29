const MARGIN_SIZE = 6;

export default class MDIWindow {
    constructor(mb, params) {
        this.model = params;
        this.handle = mb.computed(function () {
            var result = this.model.root.gridTemplate.getAreaRowIndex(this.model.area) > 0 ? 't' : '';
            return this.model.root.gridTemplate.getAreaColumnIndex(this.model.area) > 0 ? result + ' l' : result;
        }, this);
        this.areaObject = function () {
            return this.model.root.logicalAreas[this.model.area];
        };
        this.startSize = 0;
        this.startMouseX = null;
        this.startMouseY = null;
        this.columnBeingSized = null;
        this.rowBeingSized = null;
        this.resizeOffset = 0;
        this.originalColumns = [];
        this.originalRows = [];
    }

    handleEvent(e) {
        if (e.type === "mousemove"){
            if(this.startMouseX != null){
                return this.mouseMoveX(e);
            } else {
                return this.mouseMoveY(e);
            }
        } else if(e.type === "mouseup"){
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
        this.resizeOffset = 0;
        if (e.offsetY <= 6 && this.handle().startsWith('t')) {
            this.originalRows = [...this.model.root.gridTemplate.rowArray];
            this.rowBeingSized = this.model.root.gridTemplate.getAreaRowIndex(this.model.area);
            this.startSize = this.model.root.gridTemplate.rowArray[this.rowBeingSized-1];
            this.startMouseY = e.clientY;
            window.addEventListener('mousemove', this);
            window.addEventListener('mouseup', this);
            document.body.style.cursor = 'ns-resize';
        }
        else if (e.offsetX <= 6 && this.handle().endsWith('l')) {
            this.originalColumns = [...this.model.root.gridTemplate.columnArray];
            this.columnBeingSized = this.model.root.gridTemplate.getAreaColumnIndex(this.model.area);
            this.startSize = this.model.root.gridTemplate.columnArray[this.columnBeingSized-1];
            this.startMouseX = e.clientX;
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
        var newColumns = this.model.root.gridTemplate.columnArray;
        var newSize = this.startSize + this.resizeOffset + e.clientX - this.startMouseX;
        var oldSize = newColumns[this.columnBeingSized - 1];
        var newSizeB = newColumns[this.columnBeingSized] + oldSize - newSize;

        if(newSize < MARGIN_SIZE && !this.model.root.gridTemplate.canSwapColumn(this.columnBeingSized)){
            var minSize = this.columnBeingSized > 1 ? MARGIN_SIZE : 0;
            newColumns[this.columnBeingSized - 1] = minSize;
            newColumns[this.columnBeingSized] = newColumns[this.columnBeingSized] + oldSize - minSize;
            return;
        }

        if(newSizeB < MARGIN_SIZE && !this.model.root.gridTemplate.canSwapColumn(this.columnBeingSized+1)){
            newColumns[this.columnBeingSized - 1] = newColumns[this.columnBeingSized] + oldSize - MARGIN_SIZE;
            newColumns[this.columnBeingSized] = MARGIN_SIZE;
            return;
        }

        if (newSize < 0) {
            if(this.model.root.gridTemplate.swapColumn(this.columnBeingSized)){
                this.columnBeingSized = this.model.root.gridTemplate.getAreaColumnIndex(this.model.area);
                newColumns[this.columnBeingSized-1] += newSize;
                newColumns[this.columnBeingSized+1] += newColumns[this.columnBeingSized];
                newColumns[this.columnBeingSized] = -newSize;
                this.startSize = newColumns[this.columnBeingSized-1];
                this.startMouseX = e.clientX;
            }
        } else if (newSizeB < 0) {
            if(this.model.root.gridTemplate.swapColumn(this.columnBeingSized+1)){
                this.columnBeingSized = this.model.root.gridTemplate.getAreaColumnIndex(this.model.area);
                newColumns[this.columnBeingSized-2] += newColumns[this.columnBeingSized-1];
                newColumns[this.columnBeingSized-1] = -newSizeB;
                newColumns[this.columnBeingSized] += newSizeB;
                this.startSize = newColumns[this.columnBeingSized-1];
                this.startMouseX = e.clientX;
            }
        } else {
            newColumns[this.columnBeingSized - 1] = newSize;
            newColumns[this.columnBeingSized] = newSizeB;
        }
    }
    mouseMoveY(e) {
        var newRows = this.model.root.gridTemplate.rowArray;
        var newSize = this.startSize + e.clientY - this.startMouseY;
        var oldSize = newRows[this.rowBeingSized - 1];
        var newSizeB = newRows[this.rowBeingSized] + oldSize - newSize;

        if(newSize < MARGIN_SIZE && !this.model.root.gridTemplate.canSwapRow(this.rowBeingSized)){
            var minSize = this.rowBeingSized > 1 ? MARGIN_SIZE : 0;
            newRows[this.rowBeingSized - 1] = minSize;
            newRows[this.rowBeingSized] = newRows[this.rowBeingSized] + oldSize - minSize;
            return;
        }

        if(newSizeB < MARGIN_SIZE && !this.model.root.gridTemplate.canSwapRow(this.rowBeingSized+1)){
            newRows[this.rowBeingSized - 1] = newRows[this.rowBeingSized] + oldSize - MARGIN_SIZE;
            newRows[this.rowBeingSized] = MARGIN_SIZE;
            return;
        }

        if (newSize < 0) {
            if(this.model.root.gridTemplate.swapRow(this.rowBeingSized)){
                this.rowBeingSized = this.model.root.gridTemplate.getAreaRowIndex(this.model.area);
                newRows[this.rowBeingSized-1] += newSize;
                newRows[this.rowBeingSized+1] += newRows[this.rowBeingSized];
                newRows[this.rowBeingSized] = -newSize;
                this.startSize = this.model.root.gridTemplate.rowArray[this.rowBeingSized-1];
                this.startMouseY = e.clientY;
            }
        } else if (newSizeB < 0) {
            if(this.model.root.gridTemplate.swapRow(this.rowBeingSized+1)){
                this.rowBeingSized = this.model.root.gridTemplate.getAreaRowIndex(this.model.area);
                newRows[this.rowBeingSized-2] += newRows[this.rowBeingSized-1];
                newRows[this.rowBeingSized-1] = -newSizeB;
                newRows[this.rowBeingSized] += newSizeB;
                this.startSize = this.model.root.gridTemplate.rowArray[this.rowBeingSized-1];
                this.startMouseY = e.clientY;
            }
        } else {
            newRows[this.rowBeingSized - 1] = newSize;
            newRows[this.rowBeingSized] = newSizeB;
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