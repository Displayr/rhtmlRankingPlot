 // TEMPLATE! - update the method signature here
 //  -You will need to update most of this file, as this is where all the specific widget stuff goes
 //  -Simplest way to make a new widget is to extend RhtmlStatefulWidget (which also gives you RhtmlSvgWidget)
 //   then rewrite _processConfig and

import _ from 'lodash';
import RankingDependency from './RankingDependency';
import RhtmlSvgWidget from './rhtmlSvgWidget';

class RankingPlot extends RhtmlSvgWidget {

  constructor(el, width, height) {
    super(el, width, height);

    // NB RankingDependency is not used,
    // it simply shows how to import and structure intra project dependencies
    const throwAway = new RankingDependency();
    throwAway.doThings();

    this.state = {
      selected: null
    };

    this.defaultColors = ['red', 'blue', 'green', 'orange'];
  }

  _processConfig() {
    console.log('_processConfig. Change this function in your rhtmlWidget');
    console.log('the config has already been added to the context at @config, you must now "process" it');
    console.log('config:');
    console.log(this.config);

    if (_.has(this.config, 'colors')) {
      if (!_.isArray(this.config.colors)) {
        throw new Error("Invalid config. 'colors' must be array");
      }
      if (this.config.colors.length < 1) {
        throw new Error("Invalid config. 'colors' array must be > 0");
      }
      this.colors = this.config.colors;
    } else {
      this.colors = this.defaultColors;
    }

    // if (_.has(this.config, 'initialState')) {
    //   if (_.has(this.config.initialState, 'selected')) {
    //     this.state = this.config.initialState.selected;
    //   }
    // }
    console.log('here');
    console.log(this.state);
    console.log(this.config);
  }

  _getColor(index) {
    return this.colors[index % this.colors.length];
  }

  _redraw() {
    console.log('_redraw. Change this function in your rhtmlWidget');
    console.log('the outer SVG has already been created and added to the DOM. You should do things with it');
    console.log(this.outerSvg);

    const data = [
      { color: this._getColor(0), name: this._getColor(0), x: 0, y: 0 },
      { color: this._getColor(1), name: this._getColor(1), x: this.initialWidth / 2, y: 0 },
      { color: this._getColor(2), name: this._getColor(2), x: 0, y: this.initialHeight / 2 },
      { color: this._getColor(3), name: this._getColor(3), x: this.initialWidth / 2, y: this.initialHeight / 2 },
    ];

    const allCells = this.outerSvg.selectAll('.node')
      .data(data);

    const enteringCells = allCells.enter()
      .append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${d.x},${d.y})`);

    enteringCells.append('rect')
      .attr('width', this.initialWidth / 2)
      .attr('height', this.initialHeight / 2)
      .attr('class', 'rect');

    enteringCells.append('text')
      .attr('class', () => 'text');


    this._updateText();
    return this._updateRectangles();
  }

  _updateText() {
    this.outerSvg.selectAll('.text')
      .attr('x', () => this.initialWidth / 4) // note this is the midpoint (thats why we divide by 4 not 2)
      .attr('y', () => this.initialHeight / 4) // same midpoint consideration
      .style('text-anchor', 'middle')
      .style('dominant-baseline', 'central')
      .style('fill', 'white')
      .style('font-weight', (d) => {
        if (d.name === this.state.selected) {
          return 900;
        }
        return 200;
      })
      .style('font-size', (d) => {
        if (d.name === this.state.selected) {
          return 60;
        }
        return 18;
      })
      .text(d => d.name)
      .attr('class', d => `text ${d.name}`)
      .on('click', d => this._onClick(d.name));
  }

  _updateRectangles() {
    this.outerSvg.selectAll('.rect')
      .attr('class', d => `rect ${d.name}`)
      .attr('fill', d => d.color)
      .attr('stroke', 'black')
      .attr('stroke-width', (d) => {
        if (d.name === this.state.selected) { return 6; }
        return 0;
      })
      .on('click', d => this._onClick(d.name));
  }

  _onClick(clickedSquareName) {
    this.state.selected = clickedSquareName;
    this._redraw();
  }
}

module.exports = RankingPlot;
