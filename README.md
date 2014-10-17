#Speriment

##Making experiments easier to express

###What is Speriment?
Speriment is a package to help you write an online experiment for use with
PsiTurk. PsiTurk describes itself as a tape player --- it can run any "tape",
that is, JavaScript program, as an online experiment on Mechanical Turk. But
you have to provide the tape. Speriment allows you to write a simple Python
script, using only the most basic programming skills, to create that JavaScript
program. Instead of writing your own code to shuffle items, display HTML,
record answers, and so on, you simply describe the structure and contents of
your experiment.

I am still getting it set up to work with PsiTurk, but you can test out your
JSON file and Speriment's behavior in your browser.  Just edit
test/viewpage.html to refer to your own JSON file and experiment, and then open
viewpage.html file in your browser.

###The structure of a Speriment

####Blocks
Speriment experiments are made up of blocks. Each block can hold one of the
following: a list of blocks, a list of pages, or a list of groups (lists) of
pages.

Blocks are generally run in the order in which you add them to the experiment
or to their containing block. However, if you specify more than one block in a
given container as "exchangeable", then those blocks can switch positions with
each other in the (otherwise static) lineup.

Blocks can also be run conditionally. This means some blocks will drop out of
the lineup, simply being skipped over. This is based on the presence of a
"runIf" attribute on the block. If there is no runIf on a block, it will
definitely run (unless your participant quits!). If there is a runIf, it will
run only if the specified answer was given to the specified question. The
details can be found under RunIf in the Python API. This feature is useful for
two kinds of cases:

- Skip an irrelevant block. Make the block with questions about the
  participant's study habits run only if they answered "yes" to a question
  about whether they were a student.
- Follow up on a given response. Make several blocks, each with questions about
  a particular career. Make each one only run if they chose that career in a
  multiple choice question about careers.

Finally, blocks can be set to keep running until a criterion is met. Imagine
you want to teach participants a new skill and then study how they apply that
skill to a novel situation. It's important to be sure that they've learned the
skill properly, so you know your results are about the novel situation rather
than noise in their original learning. In that case, you want to have a
training block and a testing block. In the training block, you probably want to
specify answers, that is, feedback, on the pages or options, so people will
learn from their mistakes. But also, you want to set a criterion on the
training block. This says that they will keep working on the questions in the
training block until they perform well enough that you consider them fully
trained. Then, they will  move on to the next block.

####Groups

Groups are simply lists of pages. There is no special Group class in the API;
you just wrap Pages in a list.

A group of pages represents a choice. Only one page in a group will be
displayed each time a block is run. The choice can be made in two ways:

- randomly. This is useful if you have different versions of a question and you
  want to distribute those versions randomly across participants.
- According to a Latin Square. This is useful if different conditions of the
  same item in your experiment are noticeably similar, and you don't want the
  same participant to see more than one condition of a given item. Latin
  Squares ensure each participant sees the same number of items of each
  condition, and across participants all items and conditions are evenly
  distributed.

The choice is based on the latinSquare attribute of the enclosing block.

####Pages

A page is a unit of the experiment that's displayed at one time. It may contain
instructions, a question and response options, feedback about a previous
question, or closing comments.

If you specify options for a page, you should think about whether you need to
specify anything about the type of options for that page. The defaults are set
up to make radio buttons --- multiple choice options where only one can be
chosen at a time. However, you can specify that the question is not exclusive
(multiple answers are acceptable) or that the option is freetext (a text box).
The buttons will be converted into a dropdown if there are too many of them.

The order of the pages in a block is always randomized, with the caveat that
they are pseudorandomized if the block has pseudorandom set to True. If you
want to ensure that one page displays before another, put them in different
blocks.

The order of the options in a page is also randomized. If ordered is False,
they will be shuffled each time the page is displayed. If ordered is True, the
list will be reversed half the time and left as is half the time. It's a good
idea to set ordered to True if you have a Likert scale, for instance.

####Options

Options are the way the participant responds to questions. As noted above, you
don't write in your script how each option should display; it's decided based
on settings you put on the enclosing page. However, you should know some things
about how multiple choice options (exclusive or not) are treated differently
from text box options.

The difference is due to the fact that a multiple choice option is simply
selected or not, whereas a text box option has some string as the response that
was given. Thus, for the purposes of determining whether an answer was correct
(used in blocks with a criterion) and whether an answer was given (used in
blocks with a runIf), text box options are compared to a regular expression.
The regular expression is written in the correct attribute or runIf as a
string, without any regular expression constructor. However, it can contain
regular expression syntax.

###What kinds of experiments can Speriment run?
Here are a few things Speriment can handle:

- counterbalancing. Say you have questions that belong to treatment A and
  questions that belong to treatment B, and you want half of your participants
  to get treatment A first, and half to get treatment B first. Speriment can
  handle this in a probabilistic way. Put your A questions in one block and
  your B questions in another block and specify both of them as exchangeable
  blocks.
- Latin squares. For each item set (conditions 1 to n of an item), make a group
  (a list of Pages). Keep the order of the conditions the same in each group.
  Then set the block containing the groups to latinSquare = True. This feature
  uses the "condition" variable set by PsiTurk, so remember to set that to your
  number of conditions.
- pseudorandomization. Specify the condition of each Page in a block, and then
  set pseudorandom = True. The block will not run two items of the same
  condition in a row.
- training loops. Give the relevant pages in a block (or their options)
  "correct" attributes. Then set a criterion for the block, as explained in the
  Python API. The block will rerun itself until the participant performs as
  well as you specified in the criterion.
- presentation of items conditioned on previous responses. Create a RunIf
  object and put it in the block that you want to run only under a certain
  condition.

###How do I make the JSON file?

The easiest way is to make up your materials in a csv file and then write a Python script
to process the csv (or multiple csv files).

See python/example.py to learn how to write this script. Basically, you need to
be comfortable accessing the contents of Python lists and dictionaries, and
doing loops or list comprehensions. Other than that, not much programming
prowess is needed.

Technically, the file will be a JavaScript file, not a JSON file. By assigning
the JSON to a JavaScript variable, we make it simpler to load the data.

###How do I run an experiment?

You'll still need to follow all of the instructions for using PsiTurk: psiturk.readthedocs.org.

But instead of putting your own JavaScript code in task.js, take the following steps:

1. Write a Python script based on example.py, and referring to the Speriment
   Python API. Set it to write to a file in your PsiTurk project directory,
   under static/js.
2. Run the script.
3. When you set up your PsiTurk directory, you ended up with a file
   yourproject/static/js/task.js. Replace that file with Speriment's task.js.
   In Speriment's task.js, set jsonExperiment equal to the variable name you
   gave your JSON data.
4. Put speriment.js inside your PsiTurk project directory under static/lib.
5. When you set up your PsiTurk directory, you also ended up with a file
   yourproject/templates/exp.html. It has a list of `<script>` tags. Add one
   for speriment.js and one for the file containing your JSON data.

You can do these in any order, except that it helps to write the script before you run it.

Now you can test and run your experiment just as PsiTurk describes.
