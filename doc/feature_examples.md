#Features and Examples

##Changing Default Ordering of Components

###Ordered Options
By default, Options are displayed in random order on the page. The argument
`ordered = True` tells the enclosing component that the options are on a scale.
Half the time, they will appear in the order in which they are written here;
the other half the time, they will appear in reverse order.

    item_with_scale = Item(text = 'How much do you like experiments?',
            options = [Option('not at all'), Option('somewhat'), Option('so much')],
            ordered = True)

###Multi-page Items
What if you want to separate the question and answers of an Item onto different pages?
Or display parts of an item in a sequence, like in a self-paced reading study?
Instead of giving an Item one Page, you can give it a list of Pages. The Pages will run in
order.

    item_with_sequenced_pages = Item(
        [
            Page('This page will display first'),
            Page('This one comes second', options = opts1),
            Page('Each Page will create its own row in the output file, so they
                can have their own options.', options = opts2)
        ],
        condition = 'a')

If you just want to display feedback after a question is answered, you can use
the `feedback` argument on a Page. It will create a Page and insert it right
after the Page it was given to. The feedback can be a string, which is
shorthand for a Page with only text, or a Page, which can have other
arguments (but not options or option-related arguments, because feedback is
just for providing information).

    item_with_feedback = Item(
        Page(
          'What is two times two?',
          freetext = True,
          feedback = 'four'))

is syntactic sugar for

    item_with_feedback = Item([
        Page('What is two times two?',
            freetext = True),
        Page('four')])


###Pseudorandomized Items
Items are ordered randomly within their enclosing block by default. But what if the Items
have conditions and you don't want two Items of the same condition to appear in a row?
Give your items conditions, and make sure you have an equal number of items for each condition.
Then set pseudorandom to True in the enclosing block.

    pseudorandomized_block = Block(items = [
        Item('one', condition = 'odd'),
        Item('two', condition = 'even'),
        Item('three', condition = 'odd'),
        Item('four', condition = 'even')
        ],
        pseudorandom = True)

###Nested Blocks
If you want more sequential ordering in your experiment, you can create Blocks of Blocks.
Blocks can contain a list of Blocks, a list of groups of Items, or a list of Items. Items
and groups of Items get reordered (randomly or pseudorandomly), but Blocks keep the order
you give them.

    outer_block = Block(blocks = [
        first_block,
        Block(blocks = [
            second_block,
            third_block
            ]),
        fourth_block
        ])

###Exchangeable or Counterbalanced Blocks
Blocks stay where you put them by default. To make them move, give their
enclosing component (a Block or the Experiment) an `exchangeable` argument.
This argument takes a list of Blocks that are allowed to switch places with
each other. Other Blocks will stay in their original positions.

This experiment allows `block_a` and `block_b` to switch places, but keeps the break between
monotonous questions in between them.

    exp = Experiment(blocks = [intro_block, block_a, break_block, block_b, conclusion_block],
                     exchangeable = [block_a, block_b])

The argument `counterbalance` is very similar to the argument `exchangeable`.
It takes a list of Blocks and swaps their positions. However, while
`exchangeable` chooses each ordering randomly, `counterbalance` chooses each
ordering based on an experiment-wide variable that is set deterministically
based on the number of participants that have already submitted results.  In
order to use it, you must set `num_counters` in Psiturk's config file to the
number of possible orderings (in this case, 2).

The benefit of `counterbalance` is that a given list of Blocks will tend to
have a very balanced distribution of orderings across the experiment. The
downside is that the ordering of a given list of Blocks will be perfectly
correlated with other counterbalanced lists of Blocks, and with the selection
of Blocks through the `treatments` variable. Thus, `counterbalance` is
discouraged except when it is used only once in an Experiment, and without
`treatments`. However, you can use it along with `exchangeable`.

    exp = Experiment(blocks = [intro_block, block_a, break_block, block_b, demographics_block, feedback_block],
                     counterbalance = [block_a, block_b],
                     exchangeable = [demographics_block, feedback_block])

##Selecting Components to Run

###Random selection of a version of an Item
Say you have multiple ways of wording a question, and you want to randomly choose the wording
so that it doesn't bias the overall results. Put the various versions of your Item in a group,
which is just a list of Items. Blocks can take items or groups but not both, so once you've decided
to use a group in a block, wrap all Items inside groups, even if sometimes it's a singleton list.

    block_with_random_selection = Block(groups = [
        [
            Item(Page('How favorably would you rate President Barack Obama?', options = opts)),
            Item(Page('Barack Obama: Good president or best president?', options = opts)),
            Item(Page('Barack Obama: Bad president or worst president?', options = opts))
        ],
        [Item(Page('This question only has one wording', options = opts))],
    ]

###Latin Square
Sometimes you have multiple versions of each item, and you don't want to show a given
participant more than one version of each item. A Latin Square distributes versions
and items evenly across participants, making the result easier to analyze. In order to set
one up, use "groups" to group versions of items. One item from each group will be chosen for
each participant. In each group, always use the same ordering of version types. Latin
Squares use order in the group rather than the "condition" variable to determine how to
distribute conditions, so that you don't have to pseudorandomize by the same information you
use to create a Latin Square. The latin_square argument tells the Block to use the Latin Square
algorithm rather than choosing from groups randomly.

    block_with_latin_square = Block(groups = [
        [
            Item('version 1 of item 1'),
            Item('version 2 of item 1')
        ],
        [
            Item('version 1 of item 2'),
            Item('version 2 of item 2')
        ]],
        latin_square = True)

###Run Components conditionally
Options, Pages, Items, and Blocks can take a `run_if` argument, which is passed a RunIf object.
The RunIf object contains a condition, and the component will only run if the condition is met.
RunIf objects can take

- a `page` (or an `item` if that Item has only one Page) and an `option`; in
  this case the condition is only satisfied if that option was chosen when that
  page displayed. If that page hasn't displayed yet, the condition is not
  satisfied.
- a `page` (or an `item` if that Item has only one Page) and a `regex`; this is
  similar to the above, but for text options rather than multiple choice
  options. If the string given as `regex` is a regular expression and the
  answer to `page` matches that regular expression, the condition is satisfied.

Let's look at some use cases.

####Choose between blocks depending on an answer.
This experiment asks the participant their native language, and runs a block of questions in Hindi
if their native language is Hindi, or runs a block telling them they don't qualify for the experiment
if their native language is not Hindi.

Note the two different ways of referring to an item or option in a RunIf.

    hindi_option = Option('Hindi')
    language_item = Item(
        Page(
            'What is your native language?',
            options = [Option('Hindi'), Option('Other')]))
    intro_block = Block(items = [language_item])
    hindi_block = Block(
        items = some_items,
        run_if = RunIf(item = language_item, option = hindi_option))
    other_block = Block(
        items = [
          Item("I'm sorry, this experiment is for Hindi speakers. Thank you for your time!")
        ],
        run_if = RunIf(item = language_item, option = intro_block.items.pages[0].options[1])
    exp = Experiment(blocks = [intro_block, hindi_block, other_block])

####Make an item optional depending on an answer.
This block only asks you for more information if you indicate that you have seen Star Wars.

    star_wars_item = Item(
        Page(
            'Have you seen Star Wars?',
            options = [Option('yes'), Option('no')]))
    block = Block(items = [
        star_wars_item,
        Item(
            Page(
                'Who would win in a fight, Darth Vader or a honey badger?',
                options = [Option('Darth Vader'), Option('Honey Badger')]),
            run_if = RunIf(item = star_wars_item, option = star_wars_item.pages.options[0]))])

####Give feedback depending on an answer.
You may want to give feedback on a by-option basis, so that whatever the participant chooses,
they get feedback about their response. There is a shortcut to writing this: add a `feedback`
argument to each option (or to only some of them).

Note that `feedback` can be a string, which is shorthand for a Page with only text,
or a Page, which can take other arguments. It cannot take options and
option-related arguments though, since it's only made for giving feedback. This
restriction doesn't apply if you use the long form with `run_if`.

    item = Item(
        Page(
            'When is it okay to falsify your results?',
            options = [
                Option('Never', feedback = 'Correct!'),
                Option(
                    "When I'm really worried about getting tenure",
                    feedback = Page('Hold on while I call your department'))]))

is short for

    question = Page(
        'When is it okay to falsify your results?',
        options = [Option('Never'),
                   Option("When I'm really worried about getting tenure")]),
    item = Item([
        question,
        Page('Correct!',
            run_if = RunIf(page = question, option = question.options[0])),
        Page('Hold on while I call your department',
            run_if = RunIf(page = question, option = question.options[1]))
        ])

####Choose blocks depending on the participant.
You may want half of your participants to see one block and half to see another. You could
do this with two different experiments, but it's also possible to program your experiment
to handle it for you. PsiTurk sets a counter variable for each participant. This variable
ranges from 1 to the number that you put in `config.txt` for `num_counters`. Its value
for a given participant is based on the number of participants that have already submitted
responses, meaning that as long as you don't have to exclude participants in an unbalanced way,
the distribution of counter values across participants should be very even. The `treatments`
argument to blocks and experiments uses the counter to choose which blocks should run for this
participant.

In this experiment, `block_a` will run whenever the counter is set to 1 (about half the time),
and `block_b` will run whenever the counter is set to 2. The demographics block will always run.

    exp = Experiment(blocks = [block_a, demographics, block_b], treatments = [block_a, block_b])

This is actually shorthand for a RunIf. The RunIf object that is automatically set for `block_a`
and `block_b` takes a `permutation` argument instead of a `page` and `option` argument; this refers
to the counter. If you use the RunIf directly, you can make other Components (Pages, Items, and Options)
depend on the counter, but this is not usually necessary.

##Training Loops
Some experiments contain a training portion and measure the speed with which participants
learn or the effect of a training block on their performance in a testing block. Speriment
can create training blocks with the use of a `criterion` argument on the block, which determines
when the participant has passed and can move on from the block, a `cutoff` argument, so that the
experiment doesn't go on forever if the participant doesn't learn, and `correct` arguments on the
Pages or Options, telling Speriment when a response is correct.

This block will repeat up to five times or until at least 50% of its questions
with defined correct answers are answered correctly, whichever comes first. The
50% is calculated over the 911 question, the Grant's tomb question, and the
Hugh Grant question, because they are the pages with defined correct answers
(we'll call these "gradeable questions").

    training_block = Block(items = [
        Item(Page("What's the number for 911?", options = [Option()], freetext = True, correct = '911')),
        Item(Page("What is your favorite flavor?", options = [Option('vanilla'), Option('chocolate')])),
        Item([
            Page("Who's buried in Grant's tomb?",
              options = [Option('Grant', correct = True), Option('Lee', correct = False)]),
            Page("Who's buried in Hugh Grant's tomb?",
              options = [Option('Hugh Grant', correct = False), Option("No one, he's alive.")], correct = True)])
        ], criterion = 0.5, cutoff = 5)

You might want to give a long training block and see if participants catch on by the end.
In that case, you can give a whole number instead of a decimal as the criterion. A whole
number criterion signifies the number of gradeable questions that were correct starting from
the end of the block and going backwards. So if the criterion is `5`, the participant must
get at least the last five questions correct in order to advance.

Blocks that contain Blocks can have criteria and cutoffs. Just count gradeable
questions as if they were flattened into one big block.

##Add Images, Sound, and Video
To add images, sound files, or videos to a Page or Option, put their file names in a list
and pass it to the `resources` argument of that component. Store the files in your project directory
and write their filenames relative to the project directory.

##Require the use of the keyboard for responding
By default, participants choose Options with the mouse. If you want to study reaction times, the
mouse is probably too slow and noisy; you'll want to have your participants use the keyboard.

For a two-option question, there is a default keyboard setting you can use, which assigns "f" to the
option that displays on the left (which option that is will vary randomly) and "j" to the option on the
right. Spacebar is used to advance. To use this setting, just set `keyboard` to True.

    Page('some text', options = opts, keyboard = True)

Otherwise, the `keyboard` argument can take a list of keys, which will be aligned with the options from
left to right.

    Page('some text', options = three_opts, keyboard = ['q', 'w', 'e'])

On questions with a `keyboard` setting, objects in the page are not clickable.
However, the spacebar can be used to advance regardless of the keyboard
setting.

##Attach information to a component for analysis purposes.
Items, Pages, and Options can take a `tags` argument. This argument doesn't affect the way the
experiment runs; it just follows the component through to the output data, making it easier
for you to analyze the data. The `tags` argument takes a dictionary with strings as keys.
Each key that is ever used as a tag will be a column in the output file.

Let's look at two helpful use cases.

###Facilitate removal of non-analyzable pages
You can't run a regression on the instructions of your experiment, so make it easy for yourself
to get them out of the way later by removing all rows that have 'instructions' as the value of the
column 'item_type'.

    instruction_item = Item('something you should do', tags = {'item_type': 'instructions'})
    question_item = Item(Page('experimental question', options = opts), tags = {'item_type': 'experimental'})

###Facilitate coding of responses
Your analysis will probably group Items by the type of response that was given, but how do you
associate the type of the response with the response? Give each Option a tag.

    question = Item(Page('experimental question', options = [
        Option('dog', tags = {'animate': True, 'mammal': True}),
        Option('frog', tags = {'animate': True, 'mammal': False}),
        Option('log', tags = {'animate': False, 'mammal': False})])

##Recombine Components On the Fly
So far, we've seen how you can build components once, in your script, and then
display or not display them. But it is also possible to build them during the
experiment, so that different participants will see different combinations of
elements on the page. We can do this by sampling a property of an Item, Page, or
Option from a bank of possible values. The SampleFrom object takes the information
necessary to do the sampling and is passed in where the property would have gone.
A Block or the Experiment, any number of layers above the SampleFrom object, must
contain a `bank` argument that lists all of the possible values that can be sampled.

    frankstein_item = Item(
        Page(
            SampleFrom('text_bank'),
            options = [
                Option(SampleFrom('options')),
                Option('this text will be the same every time')
                ],
            resources = [SampleFrom('image_bank')]),
        condition = SampleFrom('letters'))

    block_with_banks = Block(items = [frankenstein_item],
        banks = {
            'text_bank': ['hi', 'hello', 'hey'],
            'letters': ['a', 'b', 'c'],
            'options': ['one', 'two'],
            'image_bank': ['cats.jpg']})

We can explore the arguments to SampleFrom via some use cases.

###Pair properties for the duration of the experiment

If you are, for instance, making up meanings for words, you may want the pairing of words with images
to vary across participants, but stay constant throughout the experiment. The
`variable` argument takes a string and ensures that whenever that string is given,
the same value will be sampled for that participant. A handy way to assign variables
is to make a column in your materials that has the same value for related items and
read in that cell, but it doesn't actually have to be meaningful.

    item1 = Item(Page('This is a blorg.', resources = [SampleFrom('images', variable = 1)]))
    item2 = Item(Page('What a nice blorg.', resources = [SampleFrom('images', variable = 1)]))
    item3 = Item(Page('This is a lage.', resources = [SampleFrom('images', variable = 2)]))
    block = Block(items = [item1, item2, item3],
        banks = {'images': ['funny_drawing1.jpg', 'funny_drawing2.jpg']})

###Create a wrong answer

Imagine you want to sample the option texts in an item, and you need to make
sure that the two options you sample aren't the same. The `not_variable`
argument behaves like the `variable` argument except it means to sample
anything but the value that has been associated with that variable. By giving
one SampleFrom a `variable` of 'a' and another a `not_variable` of 'a', you
ensure that they will not choose the same value.

    item1 = Item(Page('some text', options = [
        Option(SampleFrom('answers', variable = 'a'),
        Option(SampleFrom('answers', not_variable = 'a')
        ]))
    block = Block(items = [item1],
        banks = {'answers': ['one answer', 'another answer']})

###Reuse values
By default, Speriment will not sample the same value twice unless instructed to with
the `variable` argument. To enable sampling with replacement, set `with_replacement` to
True. This way, you could distribute just a few values randomly across many components.
When you're not using this setting, make sure your bank has enough values for all of the
times it's sampled from.

    item1 = Item(SampleFrom('words', with_replacement = True))
    item2 = Item(SampleFrom('words', with_replacement = True))
    item3 = Item(SampleFrom('words', with_replacement = True))
    item4 = Item(SampleFrom('words', with_replacement = True))
    block = Block(items = [item1, item2, item3, item4],
        banks = {'words': ['one', 'two']})

###Sample multiple related properties
Banks don't have to be lists; they can also be dictionaries, with multiple
fields. This is useful if you want to sample, say, text and an image, but the
text and image need to be paired up properly (the same across items and participants).

    item = Item(Page(
        SampleFrom('animals', field = 'name'),
        resources = [SampleFrom('animals', field = 'image')]))
    block = Block(items = [item], banks = {'animals': [
        {'name': 'giraffe', 'image': 'giraffe.jpg'},
        {'name': 'elephant', 'image': 'elephant.jpg'}
        ]})

