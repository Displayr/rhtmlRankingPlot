
class DisplayError {

  constructor(el, error) {
    this.error = error;
    this.rootElement = _.has(el, 'length') ? el[0] : el;
  }

  draw() {
    const errorContainer = $('<div class="rhtml-error-container">');

    const errorImage = $('<img width="32px" height="32px" src="https://s3-ap-southeast-2.amazonaws.com/kyle-public-numbers-assets/htmlwidgets/CroppedImage/error_128.png"/>');

    const errorText = $('<span>')
      .html(this.error.toString());

    errorContainer.append(errorImage);
    errorContainer.append(errorText);

    $(this.rootElement).empty();
    return $(this.rootElement).append(errorContainer);
  }
}

module.exports = DisplayError;
