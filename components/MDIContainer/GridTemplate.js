export default class GridTemplate{
    constructor(areaString, rows, columns){
        this.areaArray = [];
        this.rowArray = rows;
        this.rowCount = 0;
        this.columnArray = columns;
        this.columnCount = 0;
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
}