#Speriment

##Making experiments easier to express

###What is Speriment?
Speriment is a package, inspired by [SurveyMan](https://github.com/SurveyMan/SurveyMan), to help you write an online experiment for use with
[PsiTurk](https://psiturk.org/). PsiTurk describes itself as a tape player - it can run any "tape",
that is, JavaScript program, as an online experiment on Mechanical Turk. But
you have to provide the tape. Speriment allows you to write a simple Python
script, using only the most basic programming skills, to create that JavaScript
program. Instead of writing your own code to shuffle items, display HTML,
record answers, and so on, you simply describe the structure and contents of
your experiment.

It's currently in beta. It should work on any Unix machine but has only been
tested on a Mac. Please add an Issue if you find any bugs.

###Guides

Speriment experiments are made by nesting Python objects.

To get started, look at this [example script](https://github.com/presleyp/Speriment/blob/master/doc/example.py) to see the basics.

Then you can look for the specific features you need [here](https://github.com/presleyp/Speriment/blob/master/doc/feature_example.md).
Features you may be interested in include:
- counterbalancing
- Latin Squares
- pseudorandomization
- training loops
- multi-page items (such as for self-paced reading tasks)
- optional keyboard-only response selection (better for collecting response times)
- distribution of text and resources on a per-participant basis
- condition presentation of items depending on previous responses

For help with the syntax while writing your script, check out the API at [RawGit](http://rawgit.com/presleyp/Speriment/master/doc/speriment.html).

The workflow for installing and running Speriment is explained [here](https://github.com/presleyp/Speriment/blob/master/doc/workflow.md).
A description of the output you'll analyze is given [here](https://github.com/presleyp/Speriment/blob/master/doc/analysis.md).

###How do I contribute?

Contributions are super welcome. But before you start coding, start an Issue or
comment on an existing one. There are lots of new features to add, and we want to
make sure they'll play nice together before anyone spends time implementing stuff.
