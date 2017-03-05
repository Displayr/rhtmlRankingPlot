
let SvgUtils = function() {

    return {
        getTextSvgDimensions: function(svg, text) {
            svg.append('text')
               .attr('class', 'testElem')
               .attr('x', 10)
               .attr('y', 100)
               .text(text);
            let bb = svg.select('.testElem')[0][0].getBBox();
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