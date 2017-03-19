 // TEMPLATE! - update the method signature here
 //  -You will need to update most of this file, as this is where all the specific widget stuff goes
 //  -Simplest way to make a new widget is to extend RhtmlStatefulWidget (which also gives you RhtmlSvgWidget)
 //   then rewrite _processConfig and

import _ from 'lodash';
import RankingDependency from './RankingDependency';
import RhtmlSvgWidget from './rhtmlSvgWidget';
import SvgUtils from './SvgUtils';
import Point from './Point.js';
import Flow from './Flow.js';
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
      },

      'col': {
        'side': 5
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
          'id': i,
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

    let testInputData = [
      
    ]

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
        {x: 'Somewhat disagree', y: 0, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 1, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 5, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 7, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Somewhat disagree', y: 9, color: 'red', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 0, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 1, color: 'green', text: 'I am a free spirit.'},
        {x: 'Neither agree or disagree', y: 2, color: 'blue', text: 'I am a free spirit.'},
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
        {x: 'Strongly agree', y: 0, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 1, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 2, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 3, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 4, color: 'brown', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 5, color: 'blue', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 6, color: 'purple', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 7, color: 'yellow', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 8, color: 'green', text: 'I am a free spirit.'},
        {x: 'Strongly agree', y: 9, color: 'red', text: 'I am a free spirit.'},
        ];

    let f = new Flow('0',
      [
        new Point(this._mapColNumToName(0),0),
        new Point(this._mapColNumToName(1),1),
        new Point(this._mapColNumToName(2),2)
      ]
    );
    this._renderFlow(f, 1);
    this._updateBars(testData);

    let data = [];

  }
  
  _mapColNumToName(colNum) {
    return (_.find(this.cols, (o) => o.id == colNum)).label;
  }
  
  _renderFlow(flow, opacity) {
      let id = flow.id;
      let plot = this.outerSvg;
      // let colour = this._flowColour(id);
      let colour = 'blue';
      // let hilight_colour = RankingPlot._highlightColour(colour);
      let highlight = function () {
          d3.select(this).attr('fill', 'yellow'); //hilight_colour);
      };
      let unhighlight = function () {
          let colour = d3.select(this).attr('flow-colour');
          d3.select(this).attr('fill', colour);
      };
      // let animate = this.lastRankings != null;
      // let path = animate ? this._renderPreviousPath(flow) : this._renderFlowPath(flow.items);
      let path = this._renderFlowPath(flow.positions);
      let path_node = plot.append("path")
          .attr('flow-id', id)
          .attr('flow-colour', colour)
          .attr('fill', colour)
          .attr('d', path)
          .style("opacity", opacity);

      // let on_mouseover = function (d, i) {
      //     plot.selectAll("[flow-id='" + id + "']").transition()
      //         .ease('cubic-out')
      //         .duration(200)
      //         .each(highlight);
      // };
      // let on_mouseout = function (d, i) {
      //     plot.selectAll("[flow-id='" + id + "']").transition()
      //         .ease('cubic-out')
      //         .duration(200)
      //         .each(unhighlight);
      // };
//     if (animate)
//         path_node.transition()
//             .duration(this.displaySettings.animationDuration)
//             .attr('d', this._renderFlowPath(flow.items))
//             // Add mouseover event handlers after the transition
//             // so that they don't interfere with the transition.
//             .each('end', function () {
//                 d3.select(this)
//                     .on('mouseover', on_mouseover)
//                     .on('mouseout', on_mouseout)
//             });
//     else
//         path_node
//             .on('mouseover', on_mouseover)
//             .on('mouseout', on_mouseout);
//     }
  }

  /** Generate the string of SVG path commands to render a flow. */
  _renderFlowPath(flow) {
    return SvgUtils().renderPath(this._makeFlowPath(flow), true);
  }
  
  /** Trace the path around a flow.
   * If renderFirstItem / renderLastItem are set to false,
   * the connection to the first / last item are added, but the item itself is not rendered. */
  _makeFlowPath(flow, renderFirstItem = true, renderLastItem = true) {
    let item_width = this._itemWidth;
    let item_height = this._itemHeight;
    
    let path = [];
    
    let start_i = renderFirstItem ? 0 : 1;
    let end_i   = flow.length - (renderLastItem ? 0 : 1);
    
    if (!renderFirstItem) {
      let item = flow[0];
      // Add top right corner of the first item.
      let pos = this._itemPosition(item.x, item.y);
      path.push(new Point(pos.x + item_width, pos.y));
    }
    
    // Add points for the top edge of the flow in left to right order.
    for (let i = start_i; i < end_i; i++) {
      let item = flow[i];
      // Add a line segment for the top of the i-th item.
      let pos = this._itemPosition(item.x, item.y);
      path.push(pos, new Point(pos.x + item_width, pos.y));
    }
    
    if (!renderLastItem) {
      let item = flow[length - 1];
      // Extend the path to the leftmost edge of the last item.
      let pos = this._itemPosition(item.x, item.y);
      path.push(pos, new Point(pos.x, pos.y + item_height));
    }
    
    // Add points for the bottom edge of the flow in right to left order.
    for (let i = end_i - 1; i >= start_i; i--) {
      let item = flow[i];
      // Add a line segment for the bottom of the i-th item.
      let pos = this._itemPosition(item.x, item.y);
      pos.y += item_height;
      path.push(new Point(pos.x + item_width, pos.y), pos);
    }
    
    if (!renderFirstItem) {
      let item = flow[0];
      // Add bottom right corner of the first item.
      let pos = this._itemPosition(item.x, item.y);
      path.push(new Point(pos.x + item_width, pos.y + item_width));
    }
    return path;
  }

  _updateRects(bars) {
    bars.append('rect')
        .attr('class', 'bar-rect')
        .attr('width', (d) => this._itemWidth)
        .attr('height', (d) => this._itemHeight)
        .attr('fill', (d) => d.color);
  }

  _updateLabels(bars) {
      let textSvg = bars.append('text')
                        .attr('fill', 'black')
                        .attr('class', 'label-text');

      textSvg.append('tspan')
          .attr('class', 'label-tspan')
          .text((d) => d.text);

      // Move label down to accommodate height
      let labelHeight = d3.select('.label-text').node().getBBox().height;
      d3.selectAll('.label-text')
        .attr('transform', 'translate(0,' + labelHeight + ')');

      SvgUtils().addEllipsisToTspan(d3.selectAll('.label-tspan'), this._itemWidth);
  }

  _itemPosition(col, row) {
    return new Point(this.xScaleBand(col), this.yScale(row + .5));
  }
  
  _updateBars(data) {
    let barsSvg = this.outerSvg.selectAll('.bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'bar')
        .attr('transform', (d) => {
          let pos = this._itemPosition(d.x, d.y);
          return 'translate(' + pos.x + ',' + pos.y + ')';
        });
  
    this._updateRects(barsSvg);
    this._updateLabels(barsSvg);
  }

  _updateAxis() {
    // Determine width of largest maxRows
    _.extend(this.maxRows, SvgUtils().getTextSvgDimensions(this.outerSvg, this.maxRows.text));

    this.xScaleBand = d3.scaleBand()
                        .range([this.maxRows.width, this.initialWidth])
                        .domain(_.map(this.cols, (o) => o.label))
                        .round([.1, .3]);
    this.xAxis = d3.axisBottom().scale(this.xScaleBand);

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
    d3.selectAll('.tick line').remove();
  
    this._itemHeight = this.yScale(1) - this.yScale(0);
    this._itemWidth = this.xScaleBand.bandwidth() - this.defaultPadding.col.side;
  }
}

module.exports = RankingPlot;
