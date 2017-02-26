
class RankingDependency {

  constructor() {
    console.log('RankingDependency constructor');
    this.foo = 'x';
  }

  doThings() {
    return this.foo;
  }
}

module.exports = RankingDependency;
