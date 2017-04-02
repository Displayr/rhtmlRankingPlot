/** A group of items in rank order plus a label for the group */
class RankingDataObj {
    
    constructor(rows, cols) {
        console.log('lksjdfds');
        console.log(cols);
        console.log(rows);
        
        
        
        // ------------------
        this.label = [];
  
        /** Array of unique (per this structure) ids in rank order */
        this.items = [];
  
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