
class TemplateDependency {

  constructor() {
    console.log('TemplateDependency constructor');
    this.foo = 'x';
  }

  doThings() {
    return this.foo;
  }
}

module.exports = TemplateDependency;
