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

###The structure of a Speriment

####Blocks
Speriment experiments are made up of blocks. Each block can hold one of the
following: a list of blocks, a list of pages, or a list of groups (lists) of
pages.

Blocks are generally run in the order in which you add them to the experiment
or to their containing block. However, if you specify more than one block in a
given container as `exchangeable` or `counterbalance`, then those blocks can switch positions with
each other in the (otherwise static) lineup.

Blocks can also be run conditionally. This means some blocks will drop out of
the lineup, simply being skipped over. This is based on the presence of a
`run_if` attribute on the block. If there is no `run_if` on a block, it will
definitely run (unless your participant quits!). If there is a `run_if`, it will
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

Blocks can contain a dictionary called `banks`. This dictionary maps bank names to
banks, or lists of strings. These strings can represent page text, option text, 
page resources, or page conditions. These are useful if you want to assign these fields
to pages or options differently across participants. Pages and options can contain a
SampleFrom object in place of a string in these fields. The SampleFrom object takes one
argument, the name of the bank that the text or other information should be sampled from.
This sampling will happen independently for each participant, and a given participant will only
see a given item from a bank once in the experiment - that is, the sampling is done without replacement.

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

The choice is based on the `latin_square` attribute of the enclosing block.

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
they are pseudorandomized if the block has `pseudorandom` set to True. If you
want to ensure that one page displays before another, put them in different
blocks.

The order of the options in a page is also randomized. If `ordered` is False,
they will be shuffled each time the page is displayed. If `ordered` is True, the
list will be reversed half the time and left as is half the time. It's a good
idea to set `ordered` to True if you have a Likert scale, for instance.

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
blocks with a `run_if`), text box options are compared to a regular expression.
The regular expression is written in the `correct` attribute or `run_if` as a
string, without any regular expression constructor. However, it can contain
regular expression syntax.

###What kinds of experiments can Speriment run?
Here are a few things Speriment can handle:

- counterbalancing. Say you have questions that belong to treatment A and
  questions that belong to treatment B, and you want half of your participants
  to get treatment A first, and half to get treatment B first. Speriment can
  handle this in a probabilistic way. Put your A questions in one block and
  your B questions in another block and specify both of them as exchangeable
  blocks. It can also handle it in a deterministic way --- use `counterbalance` instead of `exchangeable`.
  You'll also need to set your PsiTurk config file's `num_counters` variable in this case.
- Latin squares. For each item set (conditions 1 to n of an item), make a group
  (a list of Pages). Keep the order of the conditions the same in each group.
  Then set the block containing the groups to `latin_square = True`. This feature
  uses the `num_conds` variable set by PsiTurk, so remember to set that to your
  number of conditions.
- pseudorandomization. Specify the condition of each Page in a block, and then
  set `pseudorandom = True`. The block will not run two items of the same
  condition in a row.
- training loops. Give the relevant pages in a block (or their options)
  `correct` attributes. Then set a criterion for the block, as explained in the
  Python API. The block will rerun itself until the participant performs as
  well as you specified in the criterion.
- presentation of items conditioned on previous responses. Create a RunIf
  object and put it in the block that you want to run only under a certain
  condition.
- distribution of text and resources to pages on a per-participant basis. This uses
  `banks` defined in a block or the experiment, and `SampleFrom` objects in place of
  the string to be sampled from a bank.

###How do I make the JSON file?

The easiest way is to make up your materials in a csv file and then write a Python script
to process the csv (or multiple csv files).

See `doc/example.py` to learn how to write this script. Basically, you need to
be comfortable accessing the contents of Python lists and dictionaries, and
doing loops or list comprehensions. Other than that, not much programming
prowess is needed.

Technically, the file will be a JavaScript file, not a JSON file. By assigning
the JSON to a JavaScript variable, we make it simpler to load the data.

###How do I run an experiment?
You'll still need to follow all of the [instructions for using PsiTurk](psiturk.readthedocs.org).

But this is what the workflow will look like in your terminal:

1. Install PsiTurk and the Python component of Speriment. This only has to be done once, whereas future steps are done once per experiment.
Another one-time installation you may want to consider is of a database like MySQL, as the database PsiTurk uses by default may lead to corrupt data
if multiple participants try to submit data at once. See the PsiTurk documentation.

    `sudo pip install psiturk`

    `sudo pip install speriment`

2. Make a project directory for this experiment. In this case I'm calling it `myproject`.
    
    `psiturk-setup-example`

    `mv psiturk-example/ myproject/`

3. Edit `config.txt` and the files in `templates`. Don't bother editing `exp.html` or `task.js` because Speriment will edit those.

4. Write a Python script to generate a Speriment from a csv of your experimental
materials. Put the csv file and the Python script in `myproject` (or whatever
you called the directory).

5. Install the JavaScript component of Speriment.
    
    `cd ~/myproject/static/lib`
   
    `npm install speriment`

6. Run your Python script.
    
    `cd ~/myproject`
    
    `python myscript`

7. Enter the PsiTurk shell.
    
    `psiturk`

8. In the PsiTurk shell, turn on the server and, if you're using a tunnel, open a tunnel.
    
    `server on`
    
    `tunnel open`

9. Debug your experiment in your browser.
    
    `debug`

10. Try out your experiment in the Mechanical Turk Sandbox. This command will ask you questions and then give you two links; follow the Sandbox link.
    
    `hit create`

11. When you're ready, switch to live mode and make a HIT to put on the real Mechanical Turk.
    
    `mode`
    
    `hit create`

    The PsiTurk shell also has other useful commands, so check out its documentation.

12. Finally, use Speriment to retrieve and format your data, writing it to a
    csv in your project directory that you can load into Python or R. Speriment
    comes with a command-line tool `speriment-output` to make this easy. It
    takes one required argument and two optional lists of arguments. The required argument is
    the name of a file to write the results to. The options are --tags or -t and --exclude or -e.

    The --tags option should be used if you passed tags into your Python script for pages and/or options.
    Supply a name for each tag, starting with page tags and then option tags, in the order in which you supplied
    the data in your script. You must use the same number of tags as you supplied.

    The --exclude option should be used if you know already that you want to exclude data from certain workers. You
    can exclude them after looking at the data, so this is just a convenience. Follow the flag with the worker IDs of
    the workers you want to exclude.

    Here, I'm imagining I have tags representing ItemType and Frequency, and I want to exclude the data that I generated
    when I was debugging the experiment and was given worker ID debugALHLUO.
    
    `speriment-output myproject_results.csv --tags ItemType Frequency -e debugALHLUO`


###What data does Speriment record?

In terms of PsiTurk, Speriment only records trial data, not unstructured data.
PsiTurk records event data automatically, but only for a few kinds of events.

Speriment records the following trial data and `speriment-output` gives it these names:

- PageID: ID given or automatically generated for the page
- PageText: Text given to display on the page
- BlockIDs: IDs of all blocks that enclose this page
- StartTime: The time when the page displayed. This is in milliseconds since
  1/1/1970, which makes it easy to subtract EndTime from it for reaction time.
- EndTime: The time when the participant clicked Next.
- Iteration: The number of times, counting from 1, that this page was
  displayed. Will always be 1 unless the page is in a block with a criterion.
- Condition: The experimental condition you supplied for the page.
- SelectedID: The IDs of any options that the participant selected.
- SelectedText: The text of any options that the participant selected.
- Correct: The information you supplied about whether the option is correct or
  what a correct text answer will match.
- OptionOrder: The option IDs in the order in which they were displayed.
  Options are shuffled and you may want to look at how they appeared on the
  page.
- SelectedPosition: The position, left-to-right starting from 0 at the left, of
  any selected options.

`speriment-output` also returns the following columns from PsiTurk data:
- UniqueID: The HIT ID and Worker ID
- TrialNumber: Starting from 0, the number of this trial. Every page gets a
  number, including instructions and feedback.
- Version: If you set the `num_conds` variable in config.txt, this is the
  version of the experiment that the participant saw. Used in Latin Square
  designs.
- HIT: HIT ID
- WorkerID: Worker ID of the participant

Finally, it returns the tags you included in your Python script:
- User-defined columns: There will then be a column for each page tag you
  supplied followed by a column for each option tag you supplied. If you
  supplied none of a kind of tag, those columns will not be present. Note that,
  because you're allowed to make nonexclusive questions where participants can
  select multiple options, each option tag column will contain a list of one or
  more values, one for each option selected. If the page is exclusive, it will
  be a list containing one value rather than a bare value.

PsiTurk provides information about the version of the experiment (which they
call condition) that was used for the purpose of Latin squares, the worker ID,
and the trial number. Note that it also supplies, with each trial, a field
called "datetime", which is the time the trial was saved. All trials are saved
at the end of the experiment, so this number is not informative for reaction
times and does not reliably show trial order.

###How do I contribute?

Contributions are super welcome. But before you start coding, start an Issue or
comment on an existing one. There are lots of new features to add, and we want to
make sure they'll play nice together before anyone spends time implementing stuff.
