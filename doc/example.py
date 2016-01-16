##### Import the module ######

# import * is generally bad practice, but Speriment scripts are unlikely to get
# complicated enough that you would have clashing variable names in your
# namespace. But, you can always do "import speriment" and use names like
# speriment.Block instead of Block.
from speriment import *


####### Read in your materials #######

# Imagine you have two csv files, items1.csv, which looks like this:

# What is your favorite animal?,cat,dog,animate
# What is your favorite color?,red,blue,inanimate

# and items2.csv, which has a header row:

# Question,Option1,Option2,Condition
# What is your favorite celebrity?,Jennifer Lawrence,Beyonce,animate
# What is your favorite car?,VW bug,Ferrari,inanimate

# This is how to read in items1.csv
materials1 = get_rows('items1.csv')

# This is how to read in items2.csv
materials2 = get_dicts('items2.csv')


##### IDs #######

# Every option, item, page, and block of your experiment needs an ID. There are two ways to get
# them:
# 1. Use this "with" statement to generate them magically, and indent ALL
# of your code about this experiment after this statement. Only unindent
# if you start writing code for a separate experiment. Then, if you want
# to reuse a component you've already defined, make a copy with a new ID
# by calling its `new` method:
# item = Item(...)
# reused_item = item.new()
# 2. Put IDs in your spreadsheets and read them and pass them in as arguments just like you
# pass in other information, like: item1 = Item('hello', ID = row[0])
with make_experiment(IDGenerator()):

    ###### Create experiment components. #####

    instructions = Item(text = 'Welcome to the experiment!')

    # You can use a loop or list comprehension to construct your items.

    # The default kind of Option is a multiple choice radio button. Only one radio button
    # can be selected at once. To allow multiple to be selected, give the Item the argument
    # exclusive = False
    # To make a text box instead of a multiple choice Option, give the Item the argument
    # freetext = True

    items1 = [Item(
                   text = row[0], # after using get_rows, access cells with indices, starting from 0
                   options = [Option(row[1]), Option(row[2])],
                   condition = row[3],
               ) for row in materials1]

    items2 = [Item(
                   text = row['Question'], # after using get_dicts, access cells with column names
                   options = [Option(row['Option1']), Option(row['Option2'])],
                   exclusive = False,
                   condition = row['Condition']
               ) for row in materials2]

    # Then make blocks. In this example I make one block for each of the lists of
    # items we've created. Blocks create ordering in the experiment. By default, Options
    # are ordered randomly within their Item, Items are ordered randomly within their Block,
    # and Blocks are kept in the order that you put them in the Experiment.

    block1 = Block(items = [instructions])
    block2 = Block(items = items1)
    block3 = Block(items = items2)

    ###### Make an Experiment ######

    # Finally, wrap the Blocks in an Experiment. Experiments can only take
    # a list of blocks, so even if you don't want any sequential ordering in your experiment, you'd
    # have to wrap your items in one Block just for show. Usually, there are
    # introductory and ending instructions or questions you want to keep at the
    # beginning or end of your experiment.

    experiment = Experiment([block1, block2, block3])

    # You can generate the JSON just to look at it, for instance by printing this
    # variable. This step is optional.

    exp_json = experiment.to_JSON()

    # This line checks that your experiment is written properly,
    # converts it to JSON, writes it to a file, and tells PsiTurk where to find
    # Speriment and your JSON. Just make up a name for this experiment, which
    # will be used to name the JSON object and the JavaScript file it's stored
    # in. Make sure to run this script in the top level of your PsiTurk project
    # directory so it can find the PsiTurk files that it needs to edit.
    experiment.install('example_experiment')
