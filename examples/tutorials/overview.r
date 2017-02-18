#This file is auto generated from /content/tutorials/overview.html
#The html examples and tutorial are the source of truth and are far more readable and beneficial. Start there (see readme for how).
#Use these r files for reference, but know that some instructional content is not transferred from the html to the r examples files
#TL;DR View the tutorial/example the way it was meant to be: in HTML format!

#Intro
##The rhtmlTemplate is just a trivial HTML Widget that displays a square with four quadrants.
##The purpose of this repo is to capture a reusable project layout of other HTML Widgets.
##The html source for all tutorial pages is structured in a specific way so that the build tools can generate example R files.
##For example, the html source for this file: theSrc/content/tutorials/overview.html is used to generate this example R file: examples/tutorials/overview.r

#Default Invocation
##By default the widget will draw a square with 4 sections, where the color scheme used is red, blue, green, orange.
##This is shown below.
##In all of the content page types, (i.e. tutorials, examples, regression_suites, and bugs/improvements) we can place a widget config inside a section marked with class="example" and this will cause a widget to be drawn!
rhtmlTemplate::template('{ "initialState": { "selected": "green" } }')
