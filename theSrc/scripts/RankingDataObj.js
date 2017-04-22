import _ from 'lodash';

/** A group of items in rank order plus a label for the group */
class RankingDataObj {
    
    _rankItems(rows, cols) {
        console.log(cols);
        console.log(rows);
        
        let rank = [];
        
        _.each(rows, function(row, index) {
           row.push(index);
        });
        
        
        for(let i=0; i<rows[0].length -1; i++) {
            let rankedRowsIds = _.map(_.sortBy(rows, (o) => o[i]), (r) => _.last(r));
            
            // Take the top 10 of each
            let truncateNum = rankedRowsIds.length - 10;
            rankedRowsIds = _.dropRight(rankedRowsIds.reverse(), truncateNum);
            
            _.each(rankedRowsIds, (rankedRowId) => {
                this.rankedItems.push({
                  r:    rankedRowId,
                  c:    this._idToColName(i),
                  text: this._idToRowName(rankedRowId)
                });
            });
            // console.log(_.map(rankedRows, (o) => o[i]));
        }
        console.log(this.rankedItems);
        
        // TODO: Create color class and map onto each box
        // TODO: Calculate ties
        
    }
    
    _idToColName(id) {
        return this.colNames[id].label;
    }
    
    _idToRowName(id) {
        return this.rowNames[id];
    }
    
    constructor(rows, cols) {
        this.rankedItems = [];
        
        
        console.log('RankingDataObj constructor');
        this.colNames = cols;
        this.rowNames = _.keys(rows);
        
        this._rankItems(_.values(rows), cols);
        
        
        // ------------------
        this.label = [];
  
        /** Array of unique (per this structure) ids in rank order */
  
          /**
           * Indices of values that are tied with the following value
           * E.g. [2, 4, 5] means items 2 and 3 have equal rank and items 4, 5 and 6 all have equal rank.
           */
        this.ties = [];
  
        /** If values are supplied, they are shown on each ranked item. */
        this.values = [];
    }
}

module.exports = RankingDataObj;