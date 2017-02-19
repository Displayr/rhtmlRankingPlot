/** A group of items in rank order plus a label for the group */
class Ranking {
    var label;
    /** Array of unique (per this structure) ids in rank order */
    var items = [];

    /** If values are supplied, they are shown on each ranked item. */
    var values = [];

    /**
     * Indices of values that are tied with the following value
     * E.g. [2, 4, 5] means items 2 and 3 have equal rank and items 4, 5 and 6 all have equal rank.
     */
    var ties;

    constructor(label, items, ties, labels?: string[]) {
        this.label = label;
        this.items = items;
        this.ties = ties || [];
        this.values = labels;
    }
}