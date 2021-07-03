export default class GridTemplate{
    constructor(areaString, rows, columns){
        this.areaArray = [];
        this.rowArray = rows;
        this.rowCount = 0;
        this.columnArray = columns;
        this.columnCount = 0;
        this.lastAreaIndex = 0;
        this.loadAreaString(areaString);
    }

    loadAreaString(areaString){
        this.areaArray = [];
        
        var rows = areaString.split('\n');
        this.rowCount = rows.length;
        rows.forEach(row => {
            var trimmedRow = row.trim();
            trimmedRow = trimmedRow.replaceAll('"','');
            var columns = trimmedRow.split(' ');
            this.areaArray.push.apply(this.areaArray, columns);
            this.columnCount = columns.length;
        });

        this.lastAreaIndex = this.areaArray.length;
    }

    getAreaString(){
        var rowArray = [];
        var i,j,temparray,chunk = this.columnCount;
        for (i=0,j=this.areaArray.length; i<j; i+=chunk) {
            temparray = this.areaArray.slice(i,i+chunk);
            rowArray.push('"' + temparray.join(' ') + '"');
        }
        return rowArray.join('\n');
    }

    getAreaColumnIndex(area){
        var index = this.areaArray.indexOf(area);
        return index % this.columnCount;
    }

    getAreaRowIndex(area){
        var index = this.areaArray.indexOf(area);
        return Math.floor(index / this.columnCount);
    }
    
    swap(startIndex, endIndex, iterator, accessor, apply){
        var tempArray = [...this.areaArray];
        for (let index = startIndex; index < endIndex; index+=iterator) {
            if(tempArray[index] == tempArray[index - accessor]){
                if(tempArray[index - accessor]  != tempArray[index])return false;
                tempArray[index - accessor] = tempArray[index - accessor - accessor];
            } else {
                if(tempArray[index - accessor]  != tempArray[index - accessor - accessor])return false;
                tempArray[index - accessor] = tempArray[index];
            }
        }
        if(apply)this.areaArray = tempArray;
        return true;
    }

    swapColumn(columnIndex){
        if(columnIndex <= 1 || columnIndex >= this.columnCount) return;
        return this.swap(columnIndex, this.areaArray.length, this.columnCount, 1, true);
    }

    swapRow(rowIndex){
        if(rowIndex <= 1 || rowIndex >= this.rowCount) return;
        return this.swap(rowIndex * this.columnCount, (rowIndex * this.columnCount) + this.columnCount, 1, this.columnCount, true);
    }

    canSwapColumn(columnIndex){
        if(columnIndex <= 1 || columnIndex >= this.columnCount) return;
        return this.swap(columnIndex, this.areaArray.length, this.columnCount, 1, false);
    }

    canSwapRow(rowIndex){
        if(rowIndex <= 1 || rowIndex >= this.rowCount) return;
        return this.swap(rowIndex * this.columnCount, (rowIndex * this.columnCount) + this.columnCount, 1, this.columnCount, false);
    }

    removeArea(area){
        var topLeftIndex = this.areaArray.indexOf(area);
        var bottomRightIndex = this.areaArray.lastIndexOf(area);
        var brX = bottomRightIndex % this.columnCount;
        var brY = Math.floor(bottomRightIndex / this.columnCount);
        var tlX = topLeftIndex % this.columnCount;
        var tlY = Math.floor(topLeftIndex / this.columnCount);
        var topRightIndex =  topLeftIndex + (brX - tlX);
        var bottomLeftIndex =  bottomRightIndex - (brX - tlX);

        var fillLeft = tlX > 0;
        var fillRight = brX < this.columnCount - 1;
        var fillTop = tlY > 0;
        var fillBottom = brY < this.rowCount - 1;

        //  Check top left
        if(tlX > 0 && tlY > 0){
            var tlmX = this.areaArray[topLeftIndex - 1];
            var tlmY = this.areaArray[topLeftIndex - this.columnCount];
            var tlmXY = this.areaArray[topLeftIndex - 1 - this.columnCount];
            if(tlmXY == tlmX){
                fillLeft = false;
            }
            if(tlmXY == tlmY){
                fillTop = false;
            }
        }

        //  Check bottom left
        if(tlX > 0 && brY < this.rowCount - 1){
            var blmX = this.areaArray[bottomLeftIndex - 1];
            var blpY = this.areaArray[bottomLeftIndex + this.columnCount];
            var blmXY = this.areaArray[bottomLeftIndex - 1 + this.columnCount];
            if(blmXY == blmX){
                fillLeft = false;
            }
            if(blmXY == blpY){
                fillBottom = false;
            }
        }

        // Check bottom right
        if(brX < this.columnCount - 1 && brY < this.rowCount - 1){
            var brpX = this.areaArray[bottomRightIndex + 1];
            var brpY = this.areaArray[bottomRightIndex + this.columnCount];
            var brpXY = this.areaArray[bottomRightIndex + 1 + this.columnCount];
            if(brpXY == brpX){
                fillRight = false;
            }
            if(brpXY == brpY){
                fillBottom = false;
            }
        }

        // Check top right
        if(brX < this.columnCount - 1 && tlY > 0){
            var trpX = this.areaArray[topRightIndex + 1];
            var trmY = this.areaArray[topRightIndex - this.columnCount];
            var trpXY = this.areaArray[topRightIndex + 1 - this.columnCount];
            if(trpXY == trpX){
                fillRight = false;
            }
            if(trpXY == trmY){
                fillTop = false;
            }
        }

        if(fillLeft){
            // Remove column tlX
            for (let index = 0; index < this.rowCount; index++) {
                this.areaArray.splice(tlX + (index * (this.columnCount-1)),1);
            }
            this.columnArray[tlX-1] += this.columnArray[tlX];
            this.columnArray.splice(tlX,1);
            this.columnCount -= 1;

            for (let index = 0; index < this.areaArray.length; index++) {
                if(this.areaArray[index] == area){
                    var col = index % this.columnCount;
                    var row = Math.floor(index / this.columnCount);
                    this.areaArray[index] = this.areaArray[(row * this.columnCount) + tlX - 1];
                }
            }
        }
        else if(fillRight){
            // Remove column brX
            for (let index = 0; index < this.rowCount; index++) {
                this.areaArray.splice(brX + (index * (this.columnCount-1)),1);
            }
            this.columnArray[brX+1] += this.columnArray[brX];
            this.columnArray.splice(brX,1);
            this.columnCount -= 1;

            for (let index = 0; index < this.areaArray.length; index++) {
                if(this.areaArray[index] == area){
                    var col = index % this.columnCount;
                    var row = Math.floor(index / this.columnCount);
                    this.areaArray[index] = this.areaArray[(row * this.columnCount) + brX];
                }
            }
        }
        else if(fillTop){
            // Remove row tlY
            this.areaArray.splice(tlY * this.columnCount,this.columnCount);
            this.rowArray[tlY-1] += this.rowArray[tlY];
            this.rowArray.splice(tlY,1);
            this.rowCount -= 1;

            for (let index = 0; index < this.areaArray.length; index++) {
                if(this.areaArray[index] == area){
                    var col = index % this.columnCount;
                    var row = Math.floor(index / this.columnCount);
                    this.areaArray[index] = this.areaArray[((tlY-1)* this.columnCount) + col];
                }
            }
        }
        else if(fillBottom){
            // Remove row brY
            this.areaArray.splice(brY * this.columnCount,this.columnCount);
            this.rowArray[brY+1] += this.rowArray[brY];
            this.rowArray.splice(brY,1);
            this.rowCount -= 1;

            for (let index = 0; index < this.areaArray.length; index++) {
                if(this.areaArray[index] == area){
                    var col = index % this.columnCount;
                    var row = Math.floor(index / this.columnCount);
                    this.areaArray[index] = this.areaArray[((brY)* this.columnCount) + col];
                }
            }
        }
    }

    getAreaWidth(area) {
        var topLeftIndex = this.areaArray.indexOf(area);
        var bottomRightIndex = this.areaArray.lastIndexOf(area);
        var brX = bottomRightIndex % this.columnCount;
        var tlX = topLeftIndex % this.columnCount;

        var total = 0;
        for (var index = tlX; index <= brX; index++) {
            total += this.columnArray[index];
        }
        return total;
    }

    getAreaHeight(area) {
        var topLeftIndex = this.areaArray.indexOf(area);
        var bottomRightIndex = this.areaArray.lastIndexOf(area);
        var brY = Math.floor(bottomRightIndex / this.columnCount);
        var tlY = Math.floor(topLeftIndex / this.columnCount);

        var total = 0;
        for (var index = tlY; index <= brY; index++) {
            total += this.rowArray[index];
        }
        return total;
    }

    splitX(area){
        var dimentions = this.columnArray;
        var newAreas = this.areaArray;
        var newArea = 'a' + this.lastAreaIndex++;

        var panelSize = this.getAreaWidth(area);
        var halfSize = Math.floor(panelSize / 2);

        var splitDimention = null;
        var splitSize = null;

        var tlX = this.areaArray.indexOf(area) % this.columnCount;
        var brX = this.areaArray.lastIndexOf(area) % this.columnCount;
        var totalSize = 0;
        while(totalSize < halfSize){
            totalSize += dimentions[tlX++];
        }
        splitDimention = tlX;
        splitSize = totalSize - halfSize;

        // Insert column after splitDimention
        this.columnCount += 1;
        for (let index = 0; index < this.rowCount; index++) {
            this.areaArray.splice(splitDimention + (index * (this.columnCount)), 0, this.areaArray[splitDimention + (index * (this.columnCount)) - 1]);
        }

        for (var sY = 0; sY < this.rowCount; sY++) {
            if (newAreas[(sY * this.columnCount) + splitDimention] == area) {
                for (var sX = splitDimention; sX <= brX + 1; sX++) {
                    newAreas[(sY * this.columnCount) + sX] = newArea;
                }
            }
        }

        dimentions[splitDimention-1] -= splitSize;
        dimentions.splice(splitDimention, 0, splitSize);
        
        return newArea;
    }

    splitY(area){
        var dimentions = this.rowArray;
        var newAreas = this.areaArray;
        var newArea = 'a' + this.lastAreaIndex++;

        var panelSize = this.getAreaHeight(area);
        var halfSize = Math.floor(panelSize / 2);

        var splitDimention = null;
        var splitSize = null;

        var brY = Math.floor(this.areaArray.lastIndexOf(area) / this.columnCount);
        var tlY = Math.floor(this.areaArray.indexOf(area) / this.columnCount);
        var totalSize = 0;
        while(totalSize < halfSize){
            totalSize += dimentions[tlY++];
        }
        splitDimention = tlY;
        splitSize = totalSize - halfSize;

        // Insert row after splitDimention
        this.rowCount += 1;
        var args = [splitDimention * this.columnCount, 0].concat(this.areaArray.slice((splitDimention-1) * this.columnCount,(splitDimention * this.columnCount)));
        Array.prototype.splice.apply(this.areaArray, args);

        for (var sX = 0; sX < this.columnCount; sX++) {
            if (newAreas[(splitDimention * this.columnCount) + sX] == area) {
                for (var sY = splitDimention; sY <= brY + 1; sY++) {
                    newAreas[(sY * this.columnCount) + sX] = newArea;
                }
            }
        }

        dimentions[splitDimention-1] -= splitSize;
        dimentions.splice(splitDimention, 0, splitSize);
        
        return newArea;
    }
}