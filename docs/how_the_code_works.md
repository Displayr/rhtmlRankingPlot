
# How does the template widget work

In addition to being a template for the creation of new html widgets, the rhtmlTemplate widget is a functioning widget meant to demonstrate a few principles. This will be discussed in this document.

The interaction between the R servers, `R_opencpu`, and the `displayr` UI are not covered here.

There are several relevant files:

1. `theSrc/R/htmlTemplate.r` : defines the R function signature and does some input formatting before invoking the HTML Widget
1. `theSrc/scripts/rhtmlTemplate.js` : registers the `rhtmlWidget` with the HTMLWidget framework. This file is deliberately very light on details and just calls methods on the Template class
1. `theSrc/scripts/Template.js` : defines a class that does all of the work creating the htmlwidget. This class extends the `RhtmlSvgWidget` class.
1. `theSrc/scripts/rhtmlSvgWidget.js` : defines the `RhtmlSvgWidget` class, which provides scaffolding for modifying the outer DOM element and adding a SVG container to the outer DOM. This class is meant to be extended by the main widget class using class inheritance.

## `theSrc/R/htmlTemplate.r`

For a simple widget there is not much to be done in the R file. In the `rhtmlTemplate` example the R file parses the JSON string into an object, pulls out the width and height, and calls the `htmlwidgets::createWidget` function to begin the process of rendering the widget. In more complicated widgets, the R file may contain multiple functions that can be used to invoke the htmlwidget in different ways. The R functions can contain parsing logic so that the R functions have simple interfaces that mask the complexity of the underlying widget API from the user.

## `theSrc/R/rhtmlTemplate.js`

The format of this file is pretty strict, not much can or should be changed here. I wanted to structure my complex widget code as a class to gain all of the benefits of OO programming. The htmlwidget interface was not ideally suited for this, so the `rhtmlTemplate.js` file provides a bridge between the class structure I have used in `Template.js` and `Pictograph.js` with the requirements of the `HTMLWidgets.widget` function signature.

Seperating the widget code into a class also allows us to create widgets without the R interface, which is done by the [internal_www content](/theSrc/internal_www/content).

This wrapper also handles any errors thrown when interacting the the Template class. If an error is thrown, the error will be rendered to the user using the `DisplayError` class, and the error will be "rethrown" so displayr can handle it.

## `theSrc/scripts/Template.js`

As stated, this contains most of the business logic for the widget. There is a lot of flexibility in how each widget is implemented, but if you want to use `rhtmlTemplate.js` wrapper, as well as the two parent classes `RhtmlStatefulWidget` and `RhtmlSvgWidget` then your class only needs to implement the following top level functions:

* _processConfig - process the input data before rendering the widget
* _redraw - this performs the initial and subsequent rendering of the widget.

We now describe the inner workings in detail. Note that you don't need to copy these patterns, but it might make things easier if you do.

When the htmlwidget framework is called from R it begins by calling the `initialize` function in `rthmlTemplate.js`. This creates a new instance of the `Template` class. This instance of the `Template` class is what is passed as the `instance` parameter to the `resize` function in `rhtmlTemplate.js` and the `renderValue` function in `rhtmlTemplate.js`.

The Template constructor does not do much, other than initialize state. In this case state represents which square is selected. We start off with no squares selected. The template constructor also calls super, which invokes the constructor of the parent class(es). So the `RhtmlSvgWidget` constructor is called. The `RhtmlSvgWidget` constructor also calls super, which calls the `RhtmlStatefulWidget` constructor. These parent constructors do some initialization of internal variables.

Next the htmlwidget framework calls the renderValue function defined in rhtmlTemplate.js. The renderValue function parses the config and traps errors. next it calls `Template.setConfig` and `Template.draw`.

Template.setConfig is defined in the `RhtmlSvgWidget` parent class and initializes a table-id, then it calls `_processConfig`. **All child class of `RhtmlSvgWidget` (that's you!) must reimplement `_processConfig`**. In processConfig you validate and normalize all of the input config so that the rest of the Widget code can safely assume the format of the config. rhtmlTemplate does not really have any config validation and normalization. Have a look at rhtmlPictographs to see a more concrete example of what setConfig is supposed to do.

Template.draw is just a wrapper that calls three subsequent functions:
* _manipulateRootElementSize: This is defined in the `RhtmlSvgWidget` parent class. This function sets the width and height of the DOM container to 100% so the widget will grow to fit the displayr container. You should not need to modify it.
* _addRootSvgToRootElement: This is defined in the `RhtmlSvgWidget` parent class. This function creates the root SVG element and saves it to this.outerSvg
* _redraw: This is where all the specific logic of the html widget is realized. **All child classes of `RhtmlSvgWidget` must reimplement `_redraw`**.

You are free to throw descriptive errors via the `throw new Error("good description")` pattern. These will be rendered to the user and eventually caught and handled.

If your widget is SVG based, you can extend the `RhtmlSvgWidget` class. This is detailed in the RhtmlSvgWidget section. Note that if you extend RhtmlSvgWidget, then you also get RhtmlStatefulWidget, so you don't need to (in fact you cannot in JS) extend both directly.

## `RhtmlSvgWidget`

This class does some just does some basic formatting of the initial DOM and creates the `outerSvg` with a `viewbox` set to the initial width and height. If you extend this class you must define `_redraw` and `_processConfig`, as outlined above.

To use this base class make sure your widget class "extends" the `RhtmlSvgWidget`.

Your class must be implement these class methods:

* **_processConfig**: Do some general processing of the input config in this class before _redraw is called. The widget input is saved to this.config
* **_redraw**: Put most of the logic for drawing the widget in here. The "d3 blessed" svg container is available at this.outerSvg so you can use this to do things like `this.outerSvg.selectAll('.node').enter()....`
