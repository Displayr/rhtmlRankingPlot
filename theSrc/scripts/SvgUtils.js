import _ from 'lodash';
import d3 from 'd3';

let SvgUtils = function() {

    return {
        getTextSvgDimensions: function(svg, text) {
            if (_.isNull(svg) || _.isNull(text)) {
                return {}
            }

            svg.append('text')
               .attr('class', 'testElem')
               .attr('x', 10)
               .attr('y', 100)
               .text(text);
            let bb = svg.select('.testElem')[0][0].getBBox();
            svg.select('.testElem').remove();
            return {
                'width': bb.width,
                'height': bb.height
            };
        },

        wrap: function(text, width) {
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
    }
};

if (typeof(module) !== 'undefined') {
    module.exports = SvgUtils;
}