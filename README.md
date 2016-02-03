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

Speriment experiments are made by nesting Python objects.

The outermost object is an `Experiment.`

`Experiment`s contain `Block`s.

`Block`s can contain other `Block`s, or `Page`s, or lists of `Page`s (called groups, but these have no special constructor).

`Page`s that pose questions contain `Option`s, and those that are instructions do not.

There are a few other objects and a handful of functions that you may also want to use to either process your data or build up your experiment.

Just call `install` on your `Experiment` at the end of your script to write your experiment to a JavaScript file which Speriment and PsiTurk can use to run your experiment online.

Check out the API at [RawGit](http://rawgit.com/presleyp/Speriment/master/doc/speriment.html).

Check out an [example script](https://github.com/presleyp/Speriment/blob/master/doc/example.py) to see some of the trickier ideas in action.

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
- pseudorandomization. Specify the `condition` of each Page in a block, and then
  set `pseudorandom = True`. The block will not run two items of the same
  condition in a row.
- training loops. Give the relevant pages in a block (or their options)
  `correct` attributes. Then set a criterion for the block, as explained in the
  Python API. The block will rerun itself until the participant performs as
  well as you specified in the criterion. You may want to specify `feedback` on
  each Page or Option to tell participants how they're doing.
- presentation of items conditioned on previous responses. Create a RunIf
  object and put it in the block that you want to run only under a certain
  condition.
- distribution of text and resources to pages on a per-participant basis. This uses
  `banks` defined in a block or the experiment, and `SampleFrom` objects in place of
  the string to be sampled from a bank.

###How do I run an experiment?
You'll still need to follow all of the [instructions for using PsiTurk](https://psiturk.readthedocs.org).

But this is what the workflow will look like in your terminal:

1. Install PsiTurk and the Python component of Speriment. This only has to be done once, whereas future steps are done once per experiment.
Another one-time installation you may want to consider is of a database like MySQL, as the database PsiTurk uses by default may lead to corrupt data
if multiple participants try to submit data at once. See the PsiTurk documentation.

    `sudo pip install psiturk`

    `sudo pip install speriment`

2. Make a project directory for this experiment. In this case I'm calling it `myproject`.
    
    `psiturk-setup-example`

    `mv psiturk-example/ myproject/`

3. Edit your [configuration files](http://psiturk.readthedocs.org/en/latest/configuration.html) and the following files in `templates`:
    - [ad.html](http://psiturk.readthedocs.org/en/latest/file_desc/ad_html.html)
    - [complete.html](http://psiturk.readthedocs.org/en/latest/file_desc/complete_html.html)
    - [consent.html](http://psiturk.readthedocs.org/en/latest/file_desc/consent_html.html)
    - [default.html](http://psiturk.readthedocs.org/en/latest/file_desc/default_html.html)
    - [error.html](http://psiturk.readthedocs.org/en/latest/file_desc/error_html.html)

    Note that [exp.html](http://psiturk.readthedocs.org/en/latest/file_desc/exp_html.html) is required for PsiTurk, but you should not edit it, because Speriment does so automatically. Speriment also automatically edits `static/task.js`, so do not delete it.

4. Write a Python script to generate a Speriment from a csv of your experimental
materials. Put the csv file and the Python script in `myproject` (or whatever
you called the directory).

5. Install the JavaScript component of Speriment.
    
    `cd ~/myproject/static/lib`
   
    `npm install speriment`

6. Run your Python script. It's important to do this after installing Speriment. If you accidentally do it in the wrong order, you can always rerun the script.
    
    `cd ~/myproject`
    
    `python myscript`

7. Enter the PsiTurk shell. If you're using a MySQL database, start its server first with `mysql.server start`.
    
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

12. Check on your experiment as it's running with PsiTurk commands like `hit list` and `worker list.` When the HIT is reviewable, you can run `worker approve` to pay workers.

13. Finally, use Speriment to retrieve and format your data, writing it to a
    csv in your project directory that you can load into Python or R. Speriment
    comes with a command-line tool `speriment-output` to make this easy. It
    takes one required argument and one optional list of arguments. The required argument is
    the name of a file to write the results to. The optional one is --exclude
    or -e.  It should be used if you know already that you want to exclude data
    from certain workers. You can exclude them after looking at the data, so
    this is just a convenience. Follow the flag with the worker IDs of the
    workers you want to exclude.

    Here, I'm imagining I want to exclude the data that I generated
    when I was debugging the experiment and was given worker ID debugALHLUO.

    `speriment-output myproject_results.csv -e debugALHLUO`


###What data does Speriment record?

In terms of PsiTurk, Speriment only records trial data, not unstructured data.
PsiTurk records event data automatically, but only for a few kinds of events.

Speriment records the following trial data and `speriment-output` gives it these column names:

- PageID: ID given or automatically generated for the page.
- PageText: Text displayed on the page.
- PageResources: Resources displayed on the page.
- BlockIDs: IDs of all blocks that enclose this page
- StartTime: The time when the page displayed. This is in milliseconds since
  1/1/1970, which makes it easy to do math on.
- EndTime: The time when the participant clicked Next.
- ReactionTime: The difference between StartTime and EndTime.
- Iteration: The number of times, counting from 1, that this page was
  displayed. Will always be 1 unless the page is in a block with a criterion.
- Condition: The experimental condition supplied or sampled for the page.
- OptionOrder: The option IDs in the order in which they were displayed.
  Options are shuffled and you may want to look at how they appeared on the
  page.
- OptionTexts: The text of each option displayed on this page in the order in which it displayed.
- OptionResources: Resources displayed with the options on this page, grouped
  by option in the order in which the options displayed.
- SelectedID: The IDs of any options that the participant selected.
- SelectedPosition: The position, left-to-right starting from 0 at the left, of
  any selected options.
- SelectedText: The text of any options that the participant selected.
- Correct: The information you supplied about whether the option is correct or
  what a correct text answer will match.


`speriment-output` also returns the following columns from PsiTurk data:
- UniqueID: The HIT ID and Worker ID
- TrialNumber: Starting from 0, the number of this trial. Every page gets a
  number, including instructions and feedback.
- Version: If you set the `num_conds` variable in config.txt, this is the
  version of the experiment that the participant saw. Used in Latin Square
  designs.
- Permutation: If you set the `num_counters` variable in config.txt, this
  determines the ordering of the blocks you counterbalanced.
- HIT: HIT ID
- WorkerID: Worker ID of the participant

Finally, it returns the tags you included in your Python script:
- User-defined columns: There will then be a column for each page tag you
  supplied and a column for each option tag you supplied. Option tag values
  will be grouped by option and giving in the order in which the options were
  displayed.

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
