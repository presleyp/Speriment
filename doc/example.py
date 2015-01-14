##### Import the module ######
from speriment import *
# import * is generally bad practice, but Speriment scripts are unlikely to get
# complicated enough that you would have clashing variable names in your
# namespace. But, you can always do "import speriment" and use names like
# speriment.Block instead of Block.

##### IDs #######

# Every option, page, and block of your experiment needs an ID. There are two ways to get
# them:
# 1. Use this "with" statement to generate them magically, and indent ALL
# of your code about this experiment after this statement. Only unindent
# if you start writing code for a separate experiment.
# 2. Put IDs in your spreadsheets and read them  and pass them in as arguments just like you
# pass in other information, like: page1 = Page('hello', ID = row[0])
with make_experiment(IDGenerator()):

    ####### Read in your materials #######

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

    ###### Create experiment components. #####

    # You can use a loop or list comprehension to make pages from your items.

    # after using get_rows, access cells with indices, starting from 0
    # keyboard = True means disable the mouse and use the default keybindings, f
    # for the left option and j for the right option
    # spacebar is always available to move to the next question
    pages1 = [Page(
                   row[0],
                   options = [Option(row[1]), Option(row[2])],
                   condition = row[3],
                   keyboard = True
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

    ###### Make blocks run conditionally (RunIf) #######

    # I'll make the second block run only for those participants who answer "cat" to
    # the animal question in block1
    animal_question = pages1[0]
    cat_condition = RunIf(page = animal_question, option = animal_question.options[0])
    conditional_block = Block(pages = pages2, run_if = cat_condition)

    ###### Make a Latin Square (groups, latin_square) #####

    # Normally blocks have pages. Latin square blocks have groups, which are
    # lists of pages.

    page_1a = Page("1A")
    page_1b = Page("1B")
    page_2a = Page("2A")
    page_2b = Page("2B")

    latin_square_block = Block(groups = [[page_1a, page_1b], [page_2a,
        page_2b]], latin_square = True)

    # Now, half your participants will see page_1a and page_2b, and half will
    # see page_1b and page_2a. The order of the pages will be shuffled as usual.

    # If you use groups and latin_square is False, pages will be chosen from
    # them randomly rather than according to a Latin Square.

    ###### Create components differently across participants (SampleFrom) ######

    # Let's make a block where the texts of pages are combined with the other
    # data for the page differently across participants. We need to replace the text string
    # in these pages with a SampleFrom object naming a bank, and put a bank with
    # the possible text strings in a block that encloses all the pages that
    # sample from that bank (or the entire experiment). It's very important to
    # spell the name of the bank the same in all places, and to put enough
    # strings in the bank that you won't run out, because each SampleFrom object
    # will take a string that hasn't been used before for that participant.

    sampled_pages = [Page(SampleFrom('bank1'), condition = row['Condition'])
            for row in items2]
    sampling_block = Block(pages = sampled_pages, banks = {'bank1': ['sampled1',
        'sampled2']})

    ####### Copy and tweak components without messing up IDs (new) ######

    # Now I want to make another block just like block 1, and then just tweak it
    # a little bit.
    # The "new" method ensures they get separate IDs, which can be important for how
    # the experiment runs. Do this whenever you copy an option, page, or block
    # if you're using the "with" statement.

    copied_block = block1.new()

    # I just want block4 to have one more page. This page doesn't have options,
    # which is fine; it'll just show some text.

    copied_block.pages.append(Page('This is an extra page.'))

    ####### Change order or choice of blocks across participants (exchangeable,
    ####### counterbalance, treatments) #####

    # So now block1 and copied_block are mostly the same. Maybe we want to show
    # half the participants block1 and half copied_block, like this:

    block_of_blocks = Block(blocks = [block1, copied_block], treatments =
            [[block1], [copied_block]])

    # This means that in treatment 1, block1 will show, and in treatment 2,
    # copied_block will show. We could have put other blocks in these
    # treatments, or had blocks in block_of_blocks that aren't in any treatments
    # and thus show for all participants.

    # They don't have to be adjacent or in the same larger block for this to work - we could
    # have put the treatments argument on the entire Experiment.

    # The same rules apply to the exchangeable argument and the counterbalance
    # argument. If you want two or more blocks to switch places with each other
    # across participants, you can do:

    alternative_block_of_blocks = Block(blocks = [block1, copied_block],
            counterbalance = [block1, copied_block])

    # or the same with exchangeable instead of counterbalance. Exchangeable
    # decides the order randomly. Counterbalance decides deterministically, so
    # you'll get a more even distribution across participants. Counterbalance
    # and treatments use the same variable to make decisions, so you probably
    # don't want to use them in the same experiment. This variable is based on
    # num_counters in config.txt, so make sure to set it if you use
    # counterbalance or treatments.

    # Note that if we use block_of_blocks in the experiment, the animal_question
    # that conditional_block depends on might not ever show! The copied version
    # of it is not the same as the original. If it doesn't show, then
    # conditional_block will not show either.

    ####### Control the order of pages via blocks #######

    # That page will occur somewhere in block 4, but we don't know exactly where.
    # Blocks stay put unless they're exchangeable, but questions move around in
    # their blocks. Here's a block with just one page so we know it'll come last.

    last_block = Block(pages = [Page('Goodbye!')])

    ###### Make an Experiment ######

    # Finally, wrap the Blocks in an Experiment. Remember that Pages take an
    # optional list of Options, Blocks take a list of Pages (or a list of lists of
    # Pages, or a list of Blocks), and Experiments take a list of Blocks.

    experiment = Experiment([block_of_blocks,
        #block1,
        latin_square_block, conditional_block, sampling_block,
        last_block])

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
