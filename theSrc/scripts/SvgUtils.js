let instance = undefined;
let SU = undefined;

class SvgUtils {
    static initClass() {
        instance = null;

        SU = class SU {

            constructor() {}

            setSvgBBoxWidthAndHeight(dataArray, svgArray) {
                return (() => {
                    let result = [];
                    for (let i = 0; i < dataArray.length; i++) {
                        let dataElem = dataArray[i];
                        let item;
                        if ((dataElem.width == null) && (dataElem.height == null)) {
                            dataElem.width = svgArray[0][i].getBBox().width;
                            item = dataElem.height = svgArray[0][i].getBBox().height;
                        }
                        result.push(item);
                    }
                    return result;
                })();
            }
        };
    }

    static get() {
        if ((instance == null)) {
            instance = new SU();
        }
        return instance;
    }
}
SvgUtils.initClass();