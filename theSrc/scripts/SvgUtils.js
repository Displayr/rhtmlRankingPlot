import _ from 'lodash';
import * as d3 from 'd3';

class SvgUtils {

    static getTextSvgDimensions(svg, text) {
        if (_.isNull(svg) || _.isNull(text)) {
            return {}
        }

        svg.append('text')
           .attr('class', 'testElem')
           .attr('x', 10)
           .attr('y', 100)
           .text(text);
        let bb = svg.select('.testElem').node().getBBox();
        svg.select('.testElem').remove();
        return {
            'width': bb.width,
            'height': bb.height
        };
    }

    // From Mike Bostock's block - https://bl.ocks.org/mbostock/7555321
    static wrap(text, width) {
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

    /** Add an ellipsis to a d3 selection containing a tspan. */
    static addEllipsisToTspan(tspan, width) {
        // If the single word is too long, add ellipsis.
        let text = tspan.text() + '...';
        tspan.text(text);
        // Keep removing characters from the end of the text until the text fits into the specified width
        // or only the ellipsis is left.
        while (text.length > 3 && (tspan.node()).getBBox().width > width) {
            text = text.substring(0, text.length - 4) + '...';
            tspan.text(text);
        }
    }

    /** Generate the SVG string for a path. NOTE: coordinates are rounded to integers. */
    static renderPath(points, close = false) {
        // Move to the first point.
        let path = "M" + points[0].x.toFixed(0) + " " + points[0].y.toFixed(0);

        // Generate line segments for subsequent points.
        for (let i = 1; i < points.length; i++) {
            path += " L" + points[i].x.toFixed(0) + " " + points[i].y.toFixed(0);
        }

        if (close) {
            // Close the path.
            path += " Z";
        }
        return path;
    }

}

if (typeof(module) !== 'undefined') {
    module.exports = SvgUtils;
}