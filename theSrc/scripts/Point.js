class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

if (typeof(module) !== 'undefined') {
  module.exports = Point;
}