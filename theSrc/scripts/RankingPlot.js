 // TEMPLATE! - update the method signature here
 //  -You will need to update most of this file, as this is where all the specific widget stuff goes
 //  -Simplest way to make a new widget is to extend RhtmlStatefulWidget (which also gives you RhtmlSvgWidget)
 //   then rewrite _processConfig and

import _ from 'lodash';
import RankingDependency from './RankingDependency';
import RhtmlSvgWidget from './rhtmlSvgWidget';
import SvgUtils from './SvgUtils';
import d3 from 'd3';

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

    this.rowsDisplayed = 10;

    this.defaultColors = ['red', 'blue', 'green', 'orange'];
    this.defaultRows = {};
    this.defaultCols = [];
    this.defaultPadding = {
      'rowNumbering': {
        'left': 10,
        'right': 10
      },

      'colLabels': {
        'top': 10,
        'bottom': 10
      }
    };
    this.defaultNumColHeaderLines = 3;

  }

  _processConfig() {
    console.log('_processConfig');
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
    if (_.has(this.config, 'cols')) {
      if (!_.isArray(this.config.cols)) {
        throw new Error("Invalid config. 'cols' must be array");
      }
      if (this.config.cols < 1) {
        throw new Error("Invalid config. 'cols' array must be > 0");
      }
      this.cols = [];
      for(let i = 0; i < this.config.cols.length; i++) {
        this.cols.push( {
          'label': this.config.cols[i],
          'length': this.config.cols[i].length
        });
      }
    } else {
      this.cols = this.defaultCols;
    }

    if (_.has(this.config, 'rows')) {
      if (!_.isObject(this.config.rows)) {
        throw new Error("Invalid config. 'rows' must be an Object");
      }
      this.rows = this.config.rows;
    } else {
      this.rows = this.defaultRows;
    }
    this.maxRows = {'text': _.keys(this.rows).length};

  }

  _getColor(index) {
    return this.colors[index % this.colors.length];
  }

  _redraw() {
    console.log('_redraw');
    console.log(this.outerSvg);
    console.log('------------');
    this._updateAxis();



    let data = [];

    // let enteringCells = this.outerSvg.selectAll('.node')
    //                         .data(data)
    //                         .enter()
    //                         .append('text')
    //     .attr('class', 'node')
    //     .attr('x', d => d.x)
    //     .attr('y', d => d.y)
    //     .attr('text-anchor', 'end')
    //     .text(d => d.label);

  }

  _updateAxis() {
    let x = d3.scale.ordinal().rangeRoundBands([0, this.initialWidth], .1, .3);
    let xAxis = d3.svg.axis()
        .scale(x)
        .orient('bottom');

    x.domain(_.map(this.cols, (o) => o.label));

    this.outerSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', 'translate(0,0)')
        .call(xAxis)
        .selectAll('.tick text')
        .call(SvgUtils().wrap, x.rangeBand());
    d3.select('.x-axis').selectAll('.domain').remove();

    let xAxisBBox = d3.selectAll('.x-axis').node().getBBox();
    let yAxisStart = xAxisBBox.height + xAxisBBox.x;


    let y = d3.scale.linear().range([0,this.initialHeight - yAxisStart - 10 ]);
    let yAxis = d3.svg.axis()
        .scale(y)
        .orient('left')
        .ticks(10, '.')
        .tickFormat((d) => { return d + '.'; });

    y.domain([1,10]);
    let yAxisSvg = this.outerSvg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis);
    let yAxisBBox = d3.selectAll('.y-axis').node().getBBox();

    d3.select('.y-axis').selectAll('.domain').remove();
    yAxisSvg.attr('transform', 'translate(0' + yAxisBBox.width + ',' + yAxisStart + ')');
  }
}

module.exports = RankingPlot;
