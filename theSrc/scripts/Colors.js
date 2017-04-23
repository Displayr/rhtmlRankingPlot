import _ from 'lodash';

class Colors {
  
  constructor(rowLabels, colorWheel = null) {
    let defaultColorWheel = [
      '#5B9BD5',
      '#ED7D31',
      '#A5A5A5',
      '#1EC000',
      '#4472C4',
      '#70AD47',
      '#255E91',
      '#9E480E',
      '#636363',
      '#997300',
      '#264478',
      '#43682B',
      '#FF2323'
    ];
   
    if (_.isNull(colorWheel)) {
      this._colorWheel = defaultColorWheel;
    } else {
      this._colorWheel = colorWheel;
    }
    
    this._rowLabelToColor = {};
    
    _.each(rowLabels, (label, i) => {
      let colorWheelIndex = i % this._colorWheel.length;
      this._rowLabelToColor[label] = this._colorWheel[colorWheelIndex];
    });
    
  }
  
  getColor(rowLabel) {
    return this._rowLabelToColor[rowLabel];
  }
  
}

module.exports = Colors;