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
        this.left = 0;
        this.top = 0;
        this.width = null;
        this.height = null;
        this.startLeft = 0;
        this.startTop = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.currentEvent = null;
        this.currentOperation = null;
        this.dragging = false;
    }

    handleEvent(e) {
        if (e.type === "mousemove"){
            if(this.currentEvent == 'resizingX'){
                return this.mouseResizeX(e);
            } else if(this.currentEvent == 'resizingY'){
                return this.mouseResizeY(e);
            } else if(this.currentEvent == 'resizing'){
                return this.mouseResize(e);
            } else if(this.currentEvent == 'moving'){
                return this.headerMouseMove(e);
            }
        } else if(e.type === "mouseup"){
            return this.mouseUp();
        }
        else if(e.type === "mouseenter"){
            debugger;
        }
    }

    mouseUp(e) {
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);
        this.startMouseX = null;
        this.startMouseY = null;
        this.currentEvent = null;
        if(this.model.root.dropping == true && this.model.root.dropArea != ''){
            this.model.area = this.model.root.dropArea;
        }
        this.dragging = false;
        this.model.root.dropping = false;
        document.body.style.cursor = 'auto';
    };

    mouseEnter(e){
        if(this.model.root.dropping){
            this.model.root.dropArea = this.model.area;
        }
    }

    mouseLeave(e){
        if(this.model.root.dropping){
            this.model.root.dropArea = '';
        } else if(this.currentEvent == null) {
            document.body.style.cursor = 'auto';
        }
    }

    mouseDown(m, e) {
        if((e.target == e.currentTarget || e.target.parentElement == e.currentTarget)){
            // If we are a floating window
            if(this.model.area == ""){
                this.currentEvent = 'resizing';
                this.currentOperation = "";
                this.startLeft = this.left;
                this.startTop = this.top;
                this.startWidth = this.width;
                this.startHeight = this.height;
                this.startMouseX = e.clientX;
                this.startMouseY = e.clientY;
                this.currentOperation = this.getResizeOperationFromMousePosition(e);
                window.addEventListener('mousemove', this);
                window.addEventListener('mouseup', this);
            } else {
                this.resizeOffset = 0;
                if (e.offsetY <= MARGIN_SIZE && this.handle().startsWith('t')) {
                    this.currentEvent = 'resizingY';
                    this.originalRows = [...this.model.root.gridTemplate.rowArray];
                    this.rowBeingSized = this.model.root.gridTemplate.getAreaRowIndex(this.model.area);
                    this.startSize = this.model.root.gridTemplate.rowArray[this.rowBeingSized-1];
                    this.startMouseY = e.clientY;
                    window.addEventListener('mousemove', this);
                    window.addEventListener('mouseup', this);
                    document.body.style.cursor = 'ns-resize';
                }
                else if (e.offsetX <= MARGIN_SIZE && this.handle().endsWith('l')) {
                    this.currentEvent = 'resizingX';
                    this.originalColumns = [...this.model.root.gridTemplate.columnArray];
                    this.columnBeingSized = this.model.root.gridTemplate.getAreaColumnIndex(this.model.area);
                    this.startSize = this.model.root.gridTemplate.columnArray[this.columnBeingSized-1];
                    this.startMouseX = e.clientX;
                    window.addEventListener('mousemove', this, false);
                    window.addEventListener('mouseup', this, false);
                    document.body.style.cursor = 'ew-resize';
                }
            }
            
            if(e.stopPropagation) e.stopPropagation();
            if(e.preventDefault) e.preventDefault();
            e.cancelBubble=true;
            e.returnValue=false;
            return false;
        }
    }

    mouseResizeX(e) {
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
    mouseResizeY(e) {
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
    mouseResize(e){
        var newX = this.startLeft + e.clientX - this.startMouseX;
        var newY = this.startTop + e.clientY - this.startMouseY;

        if(this.currentOperation.endsWith('w')){
        	this.left = newX;
            this.width = this.startWidth + this.startLeft - newX;
        }
        if(this.currentOperation.endsWith('e')){
        	this.width = this.startWidth + newX - this.startLeft;
        }
        if(this.currentOperation.startsWith('n')){
        	this.top = newY;
            this.height = this.startHeight + this.startTop - newY;
        }
        if(this.currentOperation.startsWith('s')){
        	this.height = this.startHeight + newY - this.startTop;
        }
    }

    splitX() {
        this.model.root.splitAreaX(this.model.area);
    };
    splitY() {
        this.model.root.splitAreaY(this.model.area);
    };

    headerMouseDown(m, e){
        var rect = e.target.parentElement.parentElement.getBoundingClientRect();
        var style = getComputedStyle(e.target.parentElement.parentElement);
        this.top = rect.top;
        this.left = rect.left;
        this.width = rect.width; //- parseInt(style.paddingLeft) - parseInt(style.paddingRight);
        this.height = rect.height; // - parseInt(style.paddingTop) - parseInt(style.paddingBottom);

        if(this.model.area != ""){
            this.left -= 3;
            this.top -= 3;
            var currentArea = this.model.area;
            this.model.area = "";
            this.model.root.removeAreaIfEmpty(currentArea);
        } else {
            this.width -= parseInt(style.paddingLeft) + parseInt(style.paddingRight);
            this.height -= parseInt(style.paddingTop) + parseInt(style.paddingBottom);
        }
        
        this.startLeft = this.left;
        this.startTop = this.top;
        this.startMouseX = e.clientX;
        this.startMouseY = e.clientY;
        this.currentEvent = 'moving';
        window.addEventListener('mousemove', this);
        window.addEventListener('mouseup', this);
        document.body.style.cursor = 'grabbing';
        this.dragging = true;
        this.model.root.dropping = true;

        if(e.stopPropagation) e.stopPropagation();
        if(e.preventDefault) e.preventDefault();
        e.cancelBubble=true;
        e.returnValue=false;
        return false;
    }

    headerMouseMove(e){
        this.left = this.startLeft + e.clientX - this.startMouseX;
        this.top = this.startTop + e.clientY - this.startMouseY;
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
            this.model.root.dropAreaPosition = 'endX';
        } else if(-recenteredX>Math.abs(recenteredY) && -recenteredX > fillX){
            this.model.root.dropAreaPosition = 'startX';
        } else if(recenteredY>Math.abs(recenteredX) && recenteredY > fillY){
            this.model.root.dropAreaPosition = 'endY';
        } else if(-recenteredY>Math.abs(recenteredX) && -recenteredY > fillY){
            this.model.root.dropAreaPosition = 'startY';
        } else {
            this.model.root.dropAreaPosition = 'fill';
        }
    }

    mouseMove(m, e){
        if(this.model.root.dropping){
            this.dropAreaMouseMove(e);
        } else if(this.model.area == "" && this.currentEvent == null){
            this.frameMouseMove(e);
        }
    }

    getResizeOperationFromMousePosition(e){
        var currentMarginSize = MARGIN_SIZE;
        if(e.target.parentElement == e.currentTarget){
            currentMarginSize = 3;
        }

        var rect = e.target.getBoundingClientRect();
        var operation = "";
        if (e.layerY <= currentMarginSize) {
            operation = "n";
        } else if (e.layerY >= rect.height - currentMarginSize) {
            operation = "s";
        }
        
        if (e.layerX <= currentMarginSize) {
            operation += "w";
        } else if (e.layerX >= rect.width - currentMarginSize) {
            operation += "e";
        }

        return operation;
    }

    frameMouseMove(e){
        if((e.target == e.currentTarget || e.target.parentElement == e.currentTarget) && !this.model.root.dropping){
            var operation = this.getResizeOperationFromMousePosition(e);
            
            if(operation == 'n' || operation == 's'){
                document.body.style.cursor = 'ns-resize';
            } else if(operation == 'e' || operation == 'w'){
                document.body.style.cursor = 'ew-resize';
            } else if(operation == 'ne' || operation == 'sw'){
                document.body.style.cursor = 'nesw-resize';
            } else if(operation == 'se' || operation == 'nw'){
                document.body.style.cursor = 'nwse-resize';
            } else {
                document.body.style.cursor = 'auto';
            }
        } else {
            document.body.style.cursor = 'auto';
        }
    }

    close() {
        var index = this.model.root.panels.indexOf(this.model);
        if (index !== -1) {
            this.model.root.panels.splice(index, 1);
        }

        //this.model.root.panels.remove(this.model);
        this.model.root.removeArea(this.model.area);
    };
}