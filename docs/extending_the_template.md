# How to use this template to make a new HTML Widget

New widget time, excellent. It would be great if we had a [yeoman](http://yeoman.io/) style project template, but in the absense of that, follow the steps in the sections below:

## Initial Git Repo Setup

1. Navigate to your projects directory
1. Lets assume the new widget is called `rhtmlNew`. In reality you should pick a more relevant name.
1. Open (OSX) terminal / (Windows) git shell
1. Create a clone of the rhtmlTemplate project by typing `git clone git@github.com:Displayr/rhtmlTemplate.git`
1. The command above creates a directory called rhtmlTemplate. Rename the directory to rhtmlNew
1. Change directory into the new directory. type `cd rhtmlNew` ENTER
1. modify the `/.git/config` file using the editor and change the upsream origin to `rhtmlNew`. The `[remote "origin"]` should look like this:

```
    [remote "origin"]
            url = git@github.com:Displayr/rhtmlNew.git
            fetch = +refs/heads/*:refs/remotes/origin/*
```

1. Go to github and create a new repository called `rhtmlNew` in the Numbers organization
1. Push your new code to rhtmlNew master : `git push origin master`

## Project Customization

To make sure you are starting from a good base before making changes, you should make sure rhtmlTemplate is working (i.e., follow the [Local Installation to Develop/Contribute](../README.md) instructions starting at the `npm install` step). To make sure rhtmlTemplate is working run `gulp serve`, and check some of the examples. You should see a square with 4 colored squares. Once you see the square you know that your environment can build and serve widgets. To be thorough you also need to verify that your environment can run the tests. Run `gulp testSpecs`, look at the output. It should say something like `4 of 4 tests passed`. Now run `gulp testVisual`. This will take a while as the test snapshots some templates. If there are no errors during this process then your environment is good to go! 

Next delete the auto generated directories, so that no old files get carried over. Run `gulp clean` to delete all the auto generated content, i.e., [`browser`, `inst`, `man`, `R`, `examples`]. Making a local commit at this point is a good idea so you can return to this point if the next steps dont work as you expected.

You will need to modify some files before you get to the coding part. Everything that needs to be changed should have a comment starting with `TEMPLATE`. These locations are listed below:

* **./build/config/widget.config.json** - update the widget name and the R function name. This config is used by the following files, therefore you shouldn't have to update any of these files:
    * ./gulpfile.js
    * ./build/scripts/convertContentToExampleInR.js
    * ./build/scripts/testVisual.js
* **./DESCRIPTION** - update the widget name
* **./theSrc/internal_www/js/renderContentPage.js** - change Template in two places so that this file imports and instantiates your widget, not the template widget
* **./theSrc/R/htmlwidget.R** - update the widget name and keep the R docs up to date
* **./theSrc/R/htmlwidget.yaml** - change the name of the map file
* **./theSrc/scripts/rhtmlTemplate.js** - rename file to match your widget name, update the widget name in the file. Note the file name (without the .js extension) must match the widget name specified in the createWidget call in `htmlwidget.R`
* **./theSrc/scripts/Template.js** - this is the top level class that encapsulates the business logic of the widget. You will need to rename the file to something the makes sense for your widget (e.g., Pictograph), and update most of the file. There are instructions in the file for what needs to stay the same and what should be changed. It is worth reading [how the code works](./how_the_code_works.md) before starting.
* **./theSrc/scripts/Template.spec.js** - this tests Template.js. You will need to rename it and write some tests.

That should be it. If you follow the instructions above you shouldn't have to change anything else, but you are free to structure things how you like, it will just require some modifications to `gulpfile.js`.

Final note you should delete the template docs out of the `docs/` folder and you are responsible for keeping the `README.md` of your new project up to date!
Happy coding :)

## Adding a new JS dependency
Currently the rhtmlTemplate uses `lodash`, `jquery`, and `d3` as JS dependencies. These dependencies are listed in `package.json`, and installed when you run `npm install`. They are imported by the `.js` files that require them, in our case [Template.js](/theSrc/scripts/Template.js) uses `lodash` and [rhtmlSvgWidget.js](/theSrc/scripts/rhtmlSvgWidget.js) uses all three. Note that dependencies are "bundled" with our code into a single minified dist file using `browserify`. This is discussed in the [htmlwidget build system](./htmlwidget_build_system.md) docs. If you need to add package X to your new widget, here are the steps:

1. Install the module from npm and save it to the list of dependencies via `npm install --save X`. This will install the module locally in node_modules, and it will add it to the list of project dependencies in `package.json`
1. use the `import` command in the file that requires the module to import the module.


