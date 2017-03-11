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
rhtmlTemplate::template('{ "initialState": { "selected": "red" }, "cols": ["Strongly disagree", "Somewhat disagree", "Neither agree or disagree", "Somewhat agree", "Strongly agree"], "rows": { "My friends would describe me as cultured, and refined": [7, 23, 39, 27, 4], "I think it is important to be honest when giving complements": [0, 2, 15, 51, 31], "I can be a little naive at times": [8, 21, 30, 36, 5], "I am the life of the party": [17, 27, 34, 19, 3], "I am relaxed most of the time and not easily worried": [6, 19, 20, 43, 12], "Living in a big city is important to me": [29, 24, 26, 15, 6], "I think it is important to follow and maintain traditions": [5, 13, 30, 43, 9], "I enjoy being attractive to the opposite sex": [5, 10, 32, 35, 19], "I am young at heart": [1, 5, 15, 50, 29], "I follow all the latest fashions": [27, 34, 25, 12, 2], "I consider myself up-to-date and modern": [3, 10, 31, 47, 9], "I have a particular style that is all my own": [1, 8, 35, 44, 12], "I'm not afraid to think and act outside the sqaure": [2, 6, 17, 49, 27] } }')
