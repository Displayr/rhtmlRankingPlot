 // TEMPLATE! - update the method signature here
 //  -You will need to update most of this file, as this is where all the specific widget stuff goes
 //  -Simplest way to make a new widget is to extend RhtmlStatefulWidget (which also gives you RhtmlSvgWidget)
 //   then rewrite _processConfig and

import _ from 'lodash';
import RankingDependency from './RankingDependency';
import RhtmlSvgWidget from './rhtmlSvgWidget';
import SvgUtils from './SvgUtils';
import * as d3 from "d3";

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
    // console.log(this.xScale);
    // console.log(this.yScale);


    let testData = [
        {x: 'Strongly disagree', y: 0, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly disagree', y: 9, color: 'red', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 0, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 9, color: 'red', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 0, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 9, color: 'red', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 0, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 9, color: 'red', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 0, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat agree', y: 9, color: 'red', text: 'I am a free spirit.'},
        ];

    this._updateBars(testData);

    let data = [];

  }

  _updateRects(bars) {
      bars.append('rect')
          .attr('class', 'bar-rect')
          .attr('width', (d) => this.xScaleBand.bandwidth())
          .attr('height', (d) => this.yScale(d.y+1) - this.yScale(d.y))
          .attr('fill', (d) => d.color);
  }

  _updateLabels(bars) {
      bars.append('text')
          .attr('class', 'label')
          .attr('color', 'white')
          .text((d) => d.text);
  }

  _updateBars(data) {
    let barsSvg = this.outerSvg.selectAll('.bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', (d) => 'translate(' + this.xScaleBand(d.x) + ',' + this.yScale(d.y + .5) + ')');

    this._updateRects(barsSvg);
    this._updateLabels(barsSvg);
  }

  _updateAxis() {
    // Determine width of largest maxRows
    _.extend(this.maxRows, SvgUtils().getTextSvgDimensions(this.outerSvg, this.maxRows.text));

    this.xScaleBand = d3.scaleBand().range([this.maxRows.width, this.initialWidth]).round([.1, .3]);
    this.xAxis = d3.axisBottom().scale(this.xScaleBand);

    this.xScaleBand.domain(_.map(this.cols, (o) => o.label));


    this.outerSvg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', 'translate(0 ,0)')
        .call(this.xAxis)
        .selectAll('.tick text')
        .call(SvgUtils().wrap, this.xScaleBand.bandwidth());
    d3.select('.x-axis').selectAll('.domain').remove();

    let xAxisBBox = d3.selectAll('.x-axis').node().getBBox();
    let yAxisStart = xAxisBBox.height + xAxisBBox.x;
    this.yAxisStart = yAxisStart;

    this.yScale = d3.scaleLinear()
        .range([yAxisStart, this.initialHeight - 10])
        .domain([1,10.25]);
    this.yAxis = d3.axisLeft()
        .scale(this.yScale)
        .ticks(10, '.')
        .tickFormat((d) => { return d + '.'; });

    let yAxisSvg = this.outerSvg.append('g')
        .attr('class', 'y-axis')
        .call(this.yAxis);
    let yAxisBBox = d3.selectAll('.y-axis').node().getBBox();

    yAxisSvg.attr('transform', 'translate(' + yAxisBBox.width + ',0)');

    // Remove default styling
    d3.select('.y-axis').selectAll('.domain').remove();
    d3.selectAll('.tick line').remove()
  }
}

module.exports = RankingPlot;
