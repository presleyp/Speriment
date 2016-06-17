In terms of PsiTurk, Speriment only records trial data, not unstructured data.
PsiTurk records event data automatically, but only for a few kinds of events.

Speriment records the following trial data and `speriment-output` gives it these column names:

- PageID: ID given or automatically generated for the page.
- PageText: Text displayed on the page.
- PageResources: Resources displayed on the page.
- ItemID: ID of the item that contains this page.
- BlockIDs: IDs of all blocks that enclose this page.
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
- User-defined columns: There will then be a column for each page tag, item tag,
  and option tag you supplied. Option tag values will be grouped by option and
  given in the order in which the options were displayed.

PsiTurk provides information about the version of the experiment (which they
call condition) that was used for the purpose of Latin squares, the worker ID,
and the trial number. Note that it also supplies, with each trial, a field
called "datetime", which is the time the trial was saved. All trials are saved
at the end of the experiment, so this number is not informative for reaction
times and does not reliably show trial order.

The returned data structure is like a data frame but some cells contain lists
of values instead of single values.  This makes it difficult to import into R,
and is often not useful for analysis. It's recommended to save this full format
for reference, but to use the `-f` or `--flatten` option on the
`speriment-output` command to get data for the actual analysis. The following
is a list of columns that are affected, with their names and meanings in the
flattened structure. Note that "first" here refers to the order in which things
were displayed on that trial.  It usually doesn't make sense to analyze data
from questions that allow multiple answer selections based on this flattened
structure, but experimentalists are creative, so the command allows it,
choosing the first of the selected options. It's recommended to remove such
questions from the data set before flattening (make this easier by giving them all a `tag`
that you can use to distinguish them from the other questions).

- PageResources -> PageResource: the first resource
- BlockIDs -> BlockID: the ID of the immediate parent of this page
- OptionOrder: omitted (see SelectedPosition)
- OptionTexts -> OptionText: the text of the first selected option
- OptionResources -> OptionResource: the first resource displayed with the first selected option
- SelectedID: the ID of the first selected option
- SelectedPosition: the position, left-to-right starting from 0 at the left, of
  the first selected option
- SelectedText: the text of the first selected option
- Correct: the correctness information for the first selected option

The `speriment-output` command also takes a `-j` or `--json` option, which returns a JSON file rather
than a Python one (this can be combined with the `-f` option), and finally an `-e` or `--exclude`
option, which can be followed by a list of WorkerIDs to omit from the data.
