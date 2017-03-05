import _ from 'lodash';

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
        }
    }
};

if (typeof(module) !== 'undefined') {
    module.exports = SvgUtils;
}