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


    // Determine width of largest maxRows
    _.extend(this.maxRows, SvgUtils().getTextSvgDimensions(this.outerSvg, this.maxRows.text));

    // Determine height of col labels
    this.maxColLabel = _.maxBy(this.cols, (o) => o.length);
    _.extend(this.maxColLabel, SvgUtils().getTextSvgDimensions(this.outerSvg, this.maxColLabel.label));
    let colSpacing = 5;
    let colWidth = (this.initialWidth / this.cols.length) - colSpacing*(this.cols.length - 1) - this.maxRows.width;

    let colHeaderLines = this.maxColLabel.width / colWidth;
    if (colHeaderLines > this.defaultNumColHeaderLines) {
      colHeaderLines = this.defaultNumColHeaderLines;
    }

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
        .call(wrap, x.rangeBand());
    d3.select('.x-axis').selectAll('.domain').remove();

    let xAxisDimensions = d3.selectAll('.x-axis').node().getBBox();
    let yAxisStart = xAxisDimensions.height + xAxisDimensions.x;
    console.log(d3.selectAll('.x-axis').node().getBBox());



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
    d3.select('.y-axis').selectAll('.domain').remove();
    let yAxisDimensions = d3.selectAll('.y-axis').node().getBBox();

    yAxisSvg.attr('transform', 'translate(0' + yAxisDimensions.width + ',' + yAxisStart + ')');

    function wrap(text, width) {
        text.each(function() {
            let text = d3.select(this),
                words = text.text().split(/\s+/).reverse(),
                word,
                line = [],
                lineNumber = 0,
                lineHeight = 1.1, // ems
                y = text.attr("y"),
                dy = parseFloat(text.attr("dy")),
                tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
            while (word = words.pop()) {
                line.push(word);
                tspan.text(line.join(" "));
                if (tspan.node().getComputedTextLength() > width) {
                    line.pop();
                    tspan.text(line.join(" "));
                    line = [word];
                    tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
                }
            }
        });
    }

    // Calculate the positions of the row numbers
    let rowStart = (this.defaultPadding.colLabels.top + this.maxColLabel.height + this.defaultPadding.colLabels.bottom);
    let rowHeight = (this.initialHeight - rowStart) / this.rowsDisplayed;

    let data = [];
    for (let i = 0; i < this.maxRows.text; i++) {
      data.push({
        x: this.defaultPadding.rowNumbering.left + this.maxRows.width,
        y: rowStart + i*rowHeight,
        label: String(i) + '.'
      });
    }

    // let enteringCells = this.outerSvg.selectAll('.node')
    //                         .data(data)
    //                         .enter()
    //                         .append('text')
    //     .attr('class', 'node')
    //     .attr('x', d => d.x)
    //     .attr('y', d => d.y)
    //     .attr('text-anchor', 'end')
    //     .text(d => d.label);

    // TODO: Find positions of the header labels


    // const data = [
    //   { color: this._getColor(0), name: this._getColor(0), x: 0, y: 0 },
    //   { color: this._getColor(1), name: this._getColor(1), x: this.initialWidth / 2, y: 0 },
    //   { color: this._getColor(2), name: this._getColor(2), x: 0, y: this.initialHeight / 2 },
    //   { color: this._getColor(3), name: this._getColor(3), x: this.initialWidth / 2, y: this.initialHeight / 2 },
    // ];
    //
    // const allCells = this.outerSvg.selectAll('.node')
    //   .data(data);
    //
    // const enteringCells = allCells.enter()
    //   .append('g')
    //     .attr('class', 'node')
    //     .attr('transform', d => `translate(${d.x},${d.y})`);
    //
    // enteringCells.append('rect')
    //   .attr('width', this.initialWidth / 2)
    //   .attr('height', this.initialHeight / 2)
    //   .attr('class', 'rect');
    //
    // enteringCells.append('text')
    //   .attr('class', () => 'text');
    //
    //
    // this._updateText();
    // return this._updateRectangles();
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
