#Speriment

##Making experiments easier to express

###What is Speriment?
Speriment makes an online experiment out of a JSON file. Eventually, we'll have a Python API you can use to generate this JSON file.
Speriment is meant to be used with PsiTurk, a program made by psychologists at NYU for running JavaScript experiments on Mechanical Turk.
PsiTurk handles all of this for you except for writing the JavaScript program. Speriment takes even more work out of the process, as JSON
is not a full programming language. Basically, you specify properties of your experiment and describe your items, instead of writing a whole
program to shuffle and display your items and record the results.

I am still getting it set up to work with PsiTurk, but you can test out your JSON file and Speriment's behavior in your browser.
You just need an HTML page with script tags for Speriment's dependencies: JQuery and underscore.js, Speriment itself: speriment.js, and
your JSON file.

###What kinds of experiments can Speriment run?
Here are a few things Speriment can handle:

- counterbalancing
- Latin squares
- training loops
- presentation of items conditioned on previous responses

###How do I write the JSON file?

JSON objects are key-value associations written like this:

    {"name": "Speriment", "id": 123}

JSON arrays are lists written like this:

    ["apples", "pears", 42]

In your JSON file, called something like mySperiment.json, you'll have a variable
defined like this:

    var experiment = {};

Except that inside the braces, you'll put all the information that describes your experiment.

There will be a formal specification for the JSON file soon. In the meantime, you can look at sampleJSON.json
to see two examples of experiments written in JSON.

