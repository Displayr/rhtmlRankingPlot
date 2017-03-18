class Flow {

    constructor(id, positions) {
        this.id = id;
        this.positions = positions;
    }
}

if (typeof(module) !== 'undefined') {
  module.exports = Flow;
}