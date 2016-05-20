##### Import the module ######

# import * is generally bad practice, but Speriment scripts are unlikely to get
# complicated enough that you would have clashing variable names in your
# namespace. But, you can always do "import speriment" and use names like
# speriment.Block instead of Block.
from speriment import *
import glob


####### Read in your materials #######

# Imagine you have two csv files, items1.csv, which looks like this:

# What is your favorite animal?,cat,dog,animate
# What is your favorite color?,red,blue,inanimate

# and items2.csv, which has a header row, and is tab-delimited:

# Question,Option1,Option2,Condition
# What is your favorite celebrity?,Jennifer Lawrence,Beyonce,animate
# What is your favorite car?,VW bug,Ferrari,inanimate

# get_rows is best for files without header rows
# it stores each row as a list
materials1 = get_rows('items1.csv')

# get_dicts is best for files with header rows
# it stores each row as a dictionary with the column headers as keys
# both get_rows and get_dicts have a sep argument, for separator,
# which is passed to the csv package as the delimiter
materials2 = get_dicts('items2.csv', sep = '\t')


##### IDs #######

# Every option, page, item, and block of your experiment needs an ID. There are two ways to get
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

    # Items are the semantic units of experiments - the statements and questions -
    # and Pages are the visual units.
    # Some Items only need to display one Page, and that Page only needs to display text.
    # As a shorthand, you can just pass the text directly to the Item.
    instructions = Item('Welcome to the experiment!')

    # You can use a loop or list comprehension to construct your items.

    # The default kind of Option is a multiple choice radio button. Only one radio button
    # can be selected at once. To allow multiple to be selected, give the Item the argument
    # exclusive = False
    # To make a text box instead of a multiple choice Option, give the Item the argument
    # freetext = True

    items1 = [Item(
                   Page(
                       row[0], # after using get_rows, access cells with indices, starting from 0
                       options = [Option(row[1]), Option(row[2])],
                   ),
                   condition = row[3],
               ) for row in materials1]

    items2 = [Item(
                   Page(
                       row['Question'], # after using get_dicts, access cells with column names
                       options = [Option(row['Option1']), Option(row['Option2'])],
                       exclusive = False,
                   ),
                   condition = row['Condition']
               ) for row in materials2]

    # An example using a text box option
    item3 = Item(Page('Any thoughts?', freetext = True))

    # To put images, audio, or video on a page, first put the files somewhere in your "static"
    # directory. You'll refer to the files relative to the top level of your project directory,
    # so their filename will start with "static/". Here are two ways to get them into your script:

    # Assuming you have an image for each Option1 entry (cat and red) in static/images,
    # you can get their filenames like this:
    images = ['static/images/' + row['Option1'] + '.jpg'
              for row in materials2]

    # Get the filenames of all mp3 files you put in static/audio:
    audio = glob.glob('static/audio/*.mp3')

    # Once you have the filenames, add resources to a Page or Option.
    item4 = Item(
        Page(
            'Each option has a resource associated with it.',
            options = [
                Option('a', resources = ['static/images/cats.jpg']),
                Option('b', resources = [images[0]])
            ]
        )
    )

    # Then make blocks. In this example I make one block for each of the lists of
    # items we've created. Blocks create ordering in the experiment. By default, Options
    # are ordered randomly within their Item, Items are ordered randomly within their Block,
    # and Blocks are kept in the order that you put them in the Experiment.

    block1 = Block(pages = pages1)

    ####### Copy and tweak components without messing up IDs ######

    # Now I want to make another block just like block 1, and then just tweak it
    # a little bit.
    # The "new" method ensures they get separate IDs, which can be important for how
    # the experiment runs. Do this whenever you copy an option, page, or block
    # if you're using the "with" statement to make your IDs.

    copied_block = block1.new()

    # I just want block4 to have one more page. This page doesn't have options,
    # which is fine; it'll just show some text.

    copied_block.pages.append(Page('This is an extra page.'))

    ####### Add images, audio, and video #######

    # To put images, audio, or video on a page, first put the files somewhere in your "static"
    # directory. You'll refer to the files relative to the top level of your project directory,
    # so their filename will start with "static/". Here are two ways to get them into your script:

    # Assuming you have an image for each Option1 entry (cat and red) in static/images,
    # you can get their filenames like this:
    images = ['static/images/' + row[1] + '.jpg'
              for row in items1]

    # Or, you can get the filenames from your directory, like all the mp3 files you put in static/audio:
    audio = glob.glob('static/audio/*.mp3')

    # Once you have the filenames, add resources to a Page or Option.
    image_page = Page(
            'Each option has a resource associated with it.',
            options = [
                Option('a', resources = ['static/images/cat.jpg']),
                Option('b', resources = [images[1]])
            ]
        )

    # resources can be put into Resource objects if you want to give them extra options.
    # This one will play automatically when its page displays, not show controls so that
    # participants can't fast forward through it, and require participants to let it finish
    # before they can choose an option and advance.
    audio_page = Page("What does the cat say?",
            options = [Option('meow'), Option('woof')],
            resources = [Resource(audio[0], autoplay = True, controls = False, required = True)])

    resource_block = Block(items = Item([image_page, audio_page]))

    # Blocks can contain other blocks.

    block1 = Block(items = [instructions])
    block2 = Block(items = items1)
    block3 = Block(
            blocks = [
                Block(items = items2 + [item3, item4]),
                resource_block
            ]
        )

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
