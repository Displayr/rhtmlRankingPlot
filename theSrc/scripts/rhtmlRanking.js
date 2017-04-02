
import _ from 'lodash';
import RankingPlot from './RankingPlot';
import DisplayError from './DisplayError';

HTMLWidgets.widget({
  name: 'rhtmlRankingPlot',
  type: 'output',

  resize(el, width, height, instance) {
    return instance.resize(width, height);
  },

  initialize(el, width, height) {
    return new RankingPlot(el, width, height);
  },

  renderValue(el, incomingConfig, instance) {
    let config = null;
    try {
      if (_.isString(incomingConfig)) {
        config = JSON.parse(incomingConfig);
      } else {
        config = incomingConfig;
      }
    } catch (err) {
      const readableError = new Error(`rhtmlRankingPlot: Error - cannot parse 'settingsJsonString': ${err}`);
      console.error(readableError);
      const errorHandler = new DisplayError(el, readableError);
      errorHandler.draw();
      throw new Error(err);
    }

    // @TODO for now ignore the width height that come through from config and use the ones passed to constructor
    delete config.width;
    delete config.height;

    try {
      instance.setConfig(config);
      return instance.draw();
    } catch (err) {
      console.error(err.stack);
      const errorHandler = new DisplayError(el, err);
      errorHandler.draw();
      throw new Error(err);
    }
  },
});
