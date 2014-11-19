from speriment import * # get access to the module
# import * is generally bad practice, but Speriment scripts are unlikely to get
# complicated enough that you would have clashing variable names in your
# namespace. But, you can always do "import speriment" and use names like
# speriment.Block instead of Block.

# Every option, page, and block of your experiment needs an ID. There are two ways to get
# them:
# 1. Use this "with" statement to generate them magically, and indent ALL
# of your code about this experiment after this statement. Only unindent
# if you start writing code for a separate experiment.
# 2. Put IDs in your spreadsheets and read them  and pass them in as arguments just like you
# pass in other information, like: page1 = Page('hello', ID = row[0])
with make_experiment(IDGenerator()):

    # Imagine you have two csv files, items1.csv, which looks like this:

    # What is your favorite animal?,cat,dog,animate-condition
    # What is your favorite color?,red,blue,inanimate-condition

    # and items2.csv, which has a header row:

    # Question,Option1,Option2,Condition
    # What is your favorite celebrity?,Jennifer Lawrence,Jennifer Lawrence,animate-condition
    # What is your favorite car?,VW bug,Ferrari,inanimate-condition

    # This is how to read in items1.csv
    items1 = get_rows('items1.csv')

    # This is how to read in items2.csv
    items2 = get_dicts('items2.csv')

    # You can use a loop or list comprehension to make pages from your items.

    # after using get_rows, access cells with indices, starting from 0
    pages1 = [Page(
                   row[0],
                   options = [Option(row[1]), Option(row[2])],
                   condition = row[3]
                   ) for row in items1]

    # after using get_dicts, access cells with column names
    pages2 = [Page(
                   row['Question'],
                   options = [Option(row['Option1']), Option(row['Option2'])],
                   condition = row['Condition']
                   ) for row in items2]

    # Then make blocks. In this example I make one block for each of the lists of
    # pages we've created.

    block1 = Block(pages = pages1)

    # I'll make the second block run only for those participants who answer "cat" to
    # the animal question in block1
    animal_question = pages1[0]
    cat_condition = RunIf(page = animal_question, option = animal_question.options[0])
    block2 = Block(pages = pages2, run_if = cat_condition)

    # Now I want to make another block just like block 1, and then just tweak it
    # a little bit.
    # The "new" method ensures they get separate IDs, which can be important for how
    # the experiment runs. Do this whenever you copy an option, page, or block
    # if you're using the "with" statement.

    block3 = block1.new()

    # I just want block3 to have one more page. This page doesn't have options,
    # which is fine; it'll just show some text.

    block3.pages.append(Page('This is almost the last block.'))

    # That page will occur somewhere in block 3, but we don't know exactly where.
    # Blocks stay put unless they're exchangeable, but questions move around in
    # their blocks. Here's a block with just one page so we know it'll come last.

    block4 = Block(pages = [Page('Goodbye!')])

    # Finally, wrap the Blocks in an Experiment. Remember that Pages take an
    # optional list of Options, Blocks take a list of Pages (or a list of lists of
    # Pages, or a list of Blocks), and Experiments take a list of Blocks.
    # The counterbalance argument says that block1 and block3 will switch places
    # for approximately half of participants. It needs to be used in conjunction
    # with setting the counterbalance parameter in PsiTurk's config.txt,
    # whereas the exchangeable argument could be used in the same way but
    # without setting that parameter (but it will accordingly give a less even
    # distribution across participants).

    experiment = Experiment([block1, block2, block3, block4], counterbalance =
            [block1, block3])

    # You can generate the JSON just to look at it, for instance by printing this
    # variable. This step is optional.

    exp_json = experiment.to_JSON()

    # Finally, run this line to make sure your experiment is written properly,
    # convert it to JSON, write it to a file, and tell PsiTurk where to find
    # Speriment and your JSON. Just make up a name for this experiment, which
    # will be used to name the JSON object and the JavaScript file it's stored
    # in. Make sure to run this script in the top level of your PsiTurk project
    # directory so it can find the PsiTurk files that it needs to edit.
    experiment.install('example_experiment')
