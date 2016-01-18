'''These are the constructors for all objects that make up experiments.'''

from collections import Counter
import copy, pkg_resources, json, jsonschema
# more imports before Experiment

__all__ = ['Experiment', 'Block', 'Item', 'Page', 'Option', 'RunIf', 'SampleFrom']

class RunIf:
    def __init__(self, item = None, page = None, option = None, regex = None, permutation =
            None):
        '''
        Exactly one of item, page, and permutation must be given.

        item: Item, the Item to look at to see which answer was given. Use only for Items
        that display only one page.

        page: Page, the Page to look at to see which answer was given.

        option: Option, optional. If given, the block containing this RunIf will
        only run if this Option was chosen the last time page was displayed.

        regex: string, optional. If given, the block containing this RunIf will
        only run if a response matching a regular expression made from the
        string regex was given the last time page was displayed.

        permutation: integer, optional. If given, the block containing this
        RunIf will only run if PsiTurk gives the experiment a permutation
        variable matching this integer. This requires editing the counterbalance
        setting in config.txt.

        The reason RunIfs depend on "the last time" their page was displayed is
        that Pages can display multiple times if they are in Blocks with a
        criterion.'''
        if item != None:
            self.item = item
        if page != None:
            self.page = page
        if option != None:
            self.option = option
        elif regex != None:
            self.regex = regex
        if permutation != None:
            self.permutation = permutation

    def _validate(self):
        exactly_one(self, ['item', 'page', 'permutation'])

    def comp(self):
        if hasattr(self, 'page'):
            self.pageID = self.page.id_str if self.page.id_str else self.page.id
            del self.page
        if hasattr(self, 'option'):
            self.optionID = self.option.id_str if self.option.id_str else self.option.id
            del self.option
        if hasattr(self, 'item'):
            page = self.item.pages[0]
            self.pageID = page.id_str if page.id_str else page.id
            del self.item
        return self

class SampleFrom:
    '''Stands in place of a value of an Item, Page, or Option and tells the program to
    randomly choose a value to go there on a per-participant basis. Once
    sampled, the choice will remain in place for all iterations of the block.
    Sampling happens after pages are chosen from groups.'''

    _id_generators = {} # {bankname: IDGenerator}
    _variable_maps = {} # {bankname: {variablename: index}}

    def __init__(self, bank, variable = None, not_variable = None, field = None,
            with_replacement = False):
        '''
        At most one of variable, not_variable, and with_replacement can be given.

        bank: string, the name of an information bank to sample from. A
        corresponding bank must be put in one of the Blocks containing this
        SampleFrom, or the Experiment.

        variable: string or integer, optional. Like a variable x, it doesn't
        matter what you call it, it just matters whether another variable has
        the same name or a different one. If you give two SampleFroms the same
        bank and variable, they will sample the same value for a given
        participant (but likely different values for different participants). If
        you give them the same bank and different variables, they will sample
        different values.

        not_variable: string or integer, optional. If you give two SampleFroms
        the same bank and give one variable x and the other not_variable x, they
        will not sample the same value.

        field: string, optional. Use with a bank made up of dictionaries where
        each dictionary has the same keys. field is the key you want to access.
        If you SampleFrom a bank of dictionaries that all contain x and y keys,
        and field is x, you will get one of the x values.

        with_replacement: boolean, optional. Defaults to False. False is a shorthand
        for giving this SampleFrom a variable that is not used elsewhere in the
        experiment. Thus, False means this SampleFrom will not sample the same
        value as another SampleFrom on the same bank that has a variable,
        not_variable, or with_replacement set to False. True is a shorthand for
        "pick anything at all." Thus, a True setting on one SampleFrom overrides
        False settings on other SampleFroms on the same bank: they may sample
        the same value.
        '''
        self.bank = bank
        if bank not in self._id_generators:
            self._id_generators[bank] = IDGenerator()
            self._variable_maps[bank] = {}
        if variable != None:
            self.variable = variable
            if not variable in self._variable_maps[bank]:
                self._variable_maps[bank][variable] = self._id_generators[bank]._next_id()
        if not_variable != None:
            self.not_variable = not_variable
            if not not_variable in self._variable_maps[bank]:
                self._variable_maps[bank][not_variable] = self._id_generators[bank]._next_id()
        if with_replacement:
            self.with_replacement = with_replacement
        if field != None:
            self.field = field

    def _set_variable(self):
        self.variable = int(self._id_generators[self.bank]._next_id())

    def _validate(self):
        at_most_one(self, ['variable', 'not_variable', 'with_replacement'])
        # TODO (not)var or without_r consistently for a given bank
        # TODO enough in bank for all samples
        # TODO fields consistent in bank

    def map_variables(self):
        mapping = SampleFrom._variable_maps[self.bank]
        if hasattr(self, 'variable'):
            self.variable = int(mapping[self.variable])
        elif hasattr(self, 'not_variable'):
            self.not_variable = int(mapping[self.not_variable])
        else:
            if not hasattr(self, 'with_replacement'):
                self._set_variable()

    def comp(self):
        self.map_variables()
        if hasattr(self, 'bank'):
           self.sampleFrom = self.bank
           del self.bank
        if hasattr(self, 'not_variable'):
           self.notVariable = self.not_variable
           del self.not_variable
        return self

class Component(object):
    '''This is the superclass of Option, Page, Block, and Experiment. You should
    not instantiate this class.'''

    # class variable
    _id_generator = None

    def __init__(self):
        raise ValueError, 'Component is an abstract class that should not be instantiated.'

    def _set_id(self, id_str = None):
        if id_str:
            self.id_str = id_str
        else:
            self.id_str = self._id_generator._next_id()

    def new(self):
        '''Use this method to return a new experimental component with the same
        data as one you've already constructed if you're using an IDGenerator to
        handle IDs. The two components will have different IDs, so
        they can coexist in an experiment and won't be confused with each other,
        for instance if one is referred to in a RunIf.'''
        new_component = copy.deepcopy(self)
        new_component.id_str = self._id_generator._next_id()
        for att in ['blocks', 'pages', 'options']:
            if hasattr(new_component, att):
                setattr(new_component, att, [item.new()
                    for item in getattr(new_component, att)])
        if hasattr(new_component, 'groups'):
            new_component.groups = [[page.new() for page in group]
                    for group in new_component.groups]
        if hasattr(new_component, 'feedback'):
            if isinstance(new_component.feedback, Page):
                new_component.feedback = new_component.feedback.new()
        return new_component

    def _set_optional_args(self, **kwargs):
        for (key, value) in kwargs.iteritems():
            setattr(self, key, value)

    def _validate(self):
        '''To be defined for each subtype.'''
        pass

    def comp(self):
        if hasattr(self, 'id_str'):
            self.id = self.id_str
            del self.id_str
        if hasattr(self, 'run_if'):
            self.runIf = self.run_if
            del self.run_if
        return self

class Option(Component):
    def __init__(self, text = None, id_str = None, **kwargs):
        '''
        text: string or [string]. If the Option is not a text box, this is the label for the Option
        that will be displayed on the page. If the Option is a text box, this is
        not currently used. The string or any string(s) in the list can be
        SampleFrom.

        id_str: String, optional, an identifier unique among all options in this
        experiment. (Currently uniqueness in its page is sufficient but this may
        change in the future.)

        **kwargs: optional keyword arguments, which can include:

        feedback: string or Page (without options), the feedback to be displayed
        if this Option is chosen.  Can use SampleFrom to choose string.

        resources: [string], filenames of any images, audio, or video that
        should display with the option. Any resource can be SampleFrom. Make sure
        resources are inside your project directory.

        correct: If the Option is not a text box, a boolean representing whether
        this Option is correct. If the Option is a text box, a string
        representing a regular expression that any correct answers will match.
        For example, correct = 'hi.*' would mean that 'hi' and 'high' are both
        correct inputs.

        run_if: RunIf, optional. If given, the RunIf's condition must be satisfied
        for this option to display.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Option. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        Note that the type of an Option (radio button, check box, dropdown, or
        text box) is determined based on its data and the attributes of its
        containing Page. It is not set directly in the Option.'''
        self._set_id(id_str)
        if text != None:
            self.text = text
        self._set_optional_args(**kwargs)

    def comp(self):
        super(Option, self).comp()
        return self

class Page(Component):
    def __init__(self, text, options = None, id_str = None, **kwargs):
        '''
        text: string or [string], the text to be displayed on the page. The
        string or any string(s) in the list can be SampleFrom.

        options: [Option], optional, the answer choices to be displayed on the
        page.

        id_str: String, optional, an identifier for this page unique among all
        pages in the experiment.

        **kwargs: optional keyword arguments, which can include:

        feedback: string or Page (without options), the feedback to be displayed
        after an answer is chosen. Can use SampleFrom to choose string.

        correct: If freetext is False, a string representing the id_str of the
        correct Option. If freetext is True, a string representing a regular
        expression that a correct answer will match.

        resources: [string], filenames of any images, audio, or video that
        should display on the page. Any resource can be SampleFrom. Make sure
        resources are inside your project directory.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Page. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        ordered: boolean, whether the Options for this Page need to be kept in
        the order in which they were given. If True, the Options may be reversed
        but will not be shuffled.

        exclusive: boolean, whether the participant can choose only one Option
        as their response.

        freetext: boolean, whether the Option is a text box rather than multiple
        choice.

        keyboard: boolean or [character], representing how Options are to be
        selected. If False, they are selected with the mouse. If True and there
        are exactly two Options, the left is selected with the f key and the
        right with the j key. If a list of characters, there must be as many
        characters as options. They will be mapped onto the options from left to
        right, as the options are displayed on the screen in shuffled order.

        run_if: RunIf, optional. If given, runIf's condition must be satisfied for this
        Page to display.
        '''
        self._set_id(id_str)
        self.text = text
        self._set_optional_args(**kwargs)
        if options:
            self.options = options

    def _validate_resources(self):
        pass # check for supported filetypes

    def _validate_freetext(self):
        if hasattr(self, 'freetext') and self.freetext == True:
            if len(self.options) > 1:
                raise ValueError, '''If freetext is true, the page has a text box
                as its option, so there shouldn't be more than one option.'''
            if hasattr(self.options[0], 'correct') and self.options[0].correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
            if hasattr(self, 'correct') and self.correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
       #TODO reverse is true

    def _validate_keyboard(self):
        if hasattr(self, 'keyboard'): 
            if type(self.keyboard) == list:
                if len(self.keyboard) != len(self.options):
                    raise ValueError, '''List of keybindings must have as many
                    entries as there are options in the page.'''
            elif self.keyboard:
                if len(self.options) != 2:
                    raise ValueError, '''Default keybindings only compatible with
                    pages with two options.'''

    def _validate(self):
        self._validate_resources()
        self._validate_freetext()
        self._validate_keyboard()

    def comp(self):
        super(Page, self).comp()
        return self

class Item(Component):
    def __init__(self, pages = None, id_str = None, condition = None, tags = None, run_if = None, **kwargs):
        '''
        Items are the questions and instructions of an experiment. Their order
        is randomized within their Blocks.  Often, an Item consists of one page
        or "view." In this case, pass in all properties of that view to the
        Item.

        It is also possible to create an Item that presents multiple
        pages in order. In that case, create a Page object for each page and
        pass a list of them to the Item as the `pages` argument. The Item can
        have its own condition and tags separate of its pages.

        id_str: String, optional, an identifier for this item unique among all
        items in the experiment.

        pages: [Page], optional. Items contain one or more Pages and display
        their Pages in order. An Item that only displays one Page will create
        its Page automatically from its arguments.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Item. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        condition: string, the condition this Item belongs to in the
        experimental manipulation. Used if this Item is in a block where
        pseudorandom is True, to keep Items with the same condition from
        appearing in a row. Can also be SampleFrom.

        run_if: RunIf, optional. If given, this Item will only display if its
        condition is satisfied.

        The following keyword arguments can only be included if there is no `pages`
        argument:

        text: string or [string], the text to be displayed on the page. The
        string or any string(s) in the list can be SampleFrom.

        options: [Option], optional, the answer choices to be displayed.

        feedback: string or Page (without options), the feedback to be displayed
        after an answer is chosen. Can use SampleFrom to choose string.

        correct: If freetext is False, a string representing the id_str of the
        correct Option. If freetext is True, a string representing a regular
        expression that a correct answer will match.

        resources: [string], filenames of any images, audio, or video that
        should display on the page. Any resource can be SampleFrom. Make sure
        resources are inside your project directory.

        ordered: boolean, whether the Options for this Item need to be kept in
        the order in which they were given. If True, the Options may be reversed
        but will not be shuffled.

        exclusive: boolean, whether the participant can choose only one Option
        as their response.

        freetext: boolean, whether the Option is a text box rather than multiple
        choice.

        keyboard: boolean or [character], representing how Options are to be
        selected. If False, they are selected with the mouse. If True and there
        are exactly two Options, the left is selected with the f key and the
        right with the j key. If a list of characters, there must be as many
        characters as options. They will be mapped onto the options from left to
        right, as the options are displayed on the screen in shuffled order.
        '''
        self._set_id(id_str)
        if condition != None:
            self.condition = condition
        if tags != None:
            self.tags = tags
        if run_if != None:
            self.run_if = run_if
        if pages != None:
            self.pages = pages
            if kwargs:
                raise ValueError, '''Cannot give an Item both pages and any of the following:
                    {}'''.format(kwargs)
        else:
            self._set_optional_args(**kwargs)

    def comp(self):
        self.compile_item()
        self.compile_feedback()
        super(Item, self).comp()
        return self

    def compile_item(self):
        page_attrs = ['text', 'options', 'feedback', 'correct', 'resources', 'ordered',
                'exclusive', 'freetext', 'keyboard']
        if not hasattr(self, 'pages'):
            self.pages = [Page('')]
            del self.pages[0].text
            for attr in page_attrs:
                if hasattr(self, attr):
                    setattr(self.pages[0], attr, getattr(self, attr))
                    delattr(self, attr)

    def compile_feedback(self):
        '''Feedback is a string or Page to run either unconditionally after a Page,
        or conditionally after an Option is chosen. Remove this variable and instantiate
        the Page with a RunIf if needed.'''
        new_pages = []
        for (i, page) in enumerate(self.pages):
            feedback_pages = []
            if hasattr(page, 'feedback'):
                page_feedback = page.feedback if isinstance(page.feedback, Page) else Page(page.feedback)
                feedback_pages.append(page_feedback)
                del page.feedback
            if hasattr(page, 'options'):
                for option in page.options:
                    if hasattr(option, 'feedback'):
                        option_feedback = None
                        run_if = RunIf(page = page, option = option)
                        if isinstance(option.feedback, Page):
                            option_feedback = option.feedback
                            option_feedback.run_if = run_if
                        else:
                            option_feedback = Page(option.feedback, run_if = run_if)
                        feedback_pages.append(option_feedback)
                        del option.feedback
            new_pages.append(page)
            new_pages += feedback_pages
        self.pages = new_pages
        return self

class Block(Component):
    def __init__(self, pages = None, items = None, groups = None, blocks = None, id_str = None,
            exchangeable = [], counterbalance = [], treatments = [], latin_square = None, pseudorandom = None, **kwargs):
        '''
        Exactly one of pages, groups, items, and blocks must be provided.

        pages: [Page], the pages contained by this Block. They will be wrapped in Items automatically.

        items: [Item], the items contained by this Block. Any bare Page in this list will be automatically wrapped in an Item.

        groups: [[Page]] or [[Item]], the groups contained by this Block. One Item from each
        inner list of Items will be displayed per participant. Bare Pages will be wrapped in Items.

        blocks: [Block], the blocks contained by this Block.

        id_str: String, optional, identifier unique among the Blocks in this
        experiment.

        exchangeable: [Block], only valid if contents is [Block]. A subset of
        contents. The Blocks in this list are allowed to switch places with each
        other. Blocks which are not exchangeable run only in the order in which
        they were given. Exchangeable blocks can be used for counterbalancing
        designs. For example, if there are three blocks, A, B, and C, and A and
        C are exchangeable, they can run in the order A, B, C or C, B, A.

        counterbalance: [Block], only valid if contents is [Block]. Works like
        exchangeable except exchangeable blocks are permuted randomly and
        counterbalance blocks are permuted deterministically, so that
        approximately the same number of participants will see each permutation.
        There should be no overlap between the blocks in exchangeable and the
        blocks in counterbalance.

        treatments: [[Block]], only valid if contents is [Block]. Uses
        num_counters in PsiTurk's config.txt. The blocks listed in treatments
        are specified as running conditionally, based on a variable that changes
        per participant and can take on as many values as you specify in
        num_counters in PsiTurk's config.txt. Each sublist of blocks shows which
        blocks will run when the counter is set to one of its possible
        variables. The number of sublists should equal num_counters. Blocks
        contained by this block that are not listed in treatments will run by
        default.

        latin_square: boolean, only valid if contents is [[Page]], that is,
        groups of Pages. If True, Pages are chosen from groups according to a
        Latin Square. This process requires that all groups in the Block have
        equal length. Additionally, the number of groups in the Block should be
        a multiple of the number of Pages in a group, and the Pages in each
        group should be in the same order in terms of their experimental
        condition. The condition attribute of Pages is not used to check the
        order.

        pseudorandom: boolean, only valid if contents is [[Pages]] or [Pages],
        all Pages have a condition attribute specified, and there will be an equal
        number of each Pages of each condition displayed (therefore it is not
        valid if contents is [[Pages]] and latin_square is False, because there's
        no guarantee about how many Pages of each condition will display). If True,
        no two Pages with the same condition will display in a row.

        **kwargs: optional keyword arguments, which can include:

        criterion: integer or float between 0 and 1. If integer, it represents
        the number of Pages that can be correct (the Page or its Options have a
        'correct' argument) and were correct in a row at the end of the Block.
        The idea is that participants may make mistakes at the beginning, but by
        the end of the Block should give correct answers for this long of a
        streak in order to show mastery. If it's a float, it represents a
        percentage of Pages that can be correct that were correct out of the
        entire block, not in a streak. Whether it's an integer or a float, this
        attribute signals that a participant should see the (reshuffled)
        contents of this Block as many times as it takes to reach criterion
        before moving on to later Blocks, and can be used to train participants
        before later testing them on novel information. Pages are reshuffled but
        Blocks are not re-exchanged.

        run_if: RunIf, gives a condition that must be met in order for this Block
        to display its contents, no matter the type of contents. See the RunIf
        documentation for more information.

        banks: {string: [string]} or {string: [{string: string}]}. A dictionary
        mapping bank names to banks, where a bank is a list of pieces of
        information (which may be simple - strings - or complex - dictionaries
        of strings). Within a bank, all items should be for the same purpose. If
        the pieces of information are complex, all dictionaries in the same bank
        should have the same keys. Bank information can be used for page text,
        option text, page feedback, option feedback, resource filenames, or page
        condition.

        cutoff: integer, defaults to 1. The maximum number of times (counting
        from 1) that a block can run. This keeps the experiment from running
        forever if the participant fails to learn well enough to ever reach the
        criterion. If you supply a criterion, you should also supply a cutoff.
        The cutoff applies to the entire block only, so if a block within this
        block loops, that will not affect the count.
        '''

        self._set_id(id_str)
        self._set_optional_args(**kwargs)
        if pages != None:
            self.pages = pages
        if items != None:
            self.items = items
        if groups != None:
            self.groups = groups
        if blocks != None:
            self.blocks = blocks
        self._validate_contents()
        self._set_optional_args(**kwargs)

        if exchangeable:
            self.exchangeable = [b.id_str for b in exchangeable]

        if counterbalance:
            self.counterbalance = [b.id_str for b in counterbalance]

        if latin_square:
            self.latin_square = latin_square
            self._validate_latin_square()

        if pseudorandom:
            self.pseudorandom = pseudorandom

        # TODO what about mutated blocks
        if treatments:
            self.treatments = treatments
            # for (i, treatment) in enumerate(treatments):
            #     for block in treatment:
            #         block.run_if = RunIf(permutation = i)

    def _validate(self):
        self._validate_contents()
        self._validate_pseudorandom()
        self._validate_latin_square()
        self._validate_counterbalancing()

    def _validate_counterbalancing(self):
        if hasattr(self, 'counterbalance') and hasattr(self, 'treatments'):
            print '''Warning: counterbalance and treatments depend on the same
            variable, so using both in one experiment will cause
            correlations between which blocks are used and how blocks are
            ordered. If you want these to be decided independently, change
            'counterbalance' to 'exchangeable' so the order will be decided
            randomly for each participant.'''


    def _validate_contents(self):
        exactly_one(self, ['pages', 'groups', 'items', 'blocks'])

    def _validate_pseudorandom(self):
        if hasattr(self, 'pseudorandom'):
            if hasattr(self, 'groups'):
                if self.latin_square == False:
                    raise ValueError, '''Can't choose pages from groups randomly and
                    ensure that pseudorandomization will work. Supply pages instead of
                    groups, change latin_square to True, or change pseudorandom to
                    False.'''
                try:
                    conditions = [page.condition for group in self.groups for page in
                        group]
                except AttributeError:
                    raise ValueError, '''In block {0}, can't pseudorandomize pages without
                    conditions.'''.format(self.id_str)
                cond_counter = Counter(conditions)
                cond_counts = cond_counter.values()
                num_cond_counts = len(set(cond_counts))
                if num_cond_counts != 1:
                    raise ValueError, '''Can't pseudorandomize pages if not all
                    conditions are represented the same number of times in the
                    block.'''
        #TODO elif hasattr('pages')

    def _validate_latin_square(self):
        pass

    def comp(self):
        if hasattr(self, 'treatments'):
            self.compile_treatments()
        if hasattr(self, 'latin_square'):
            self.latinSquare = self.latin_square
            del self.latin_square
        super(Block, self).comp()
        return self

    def compile_treatments(self):
        '''Treatments are lists of lists of blocks to run conditionally. Remove
        this variable and add RunIf objects to those blocks.'''
        for i, treatment in enumerate(self.treatments):
            for block in treatment:
                block.run_if = RunIf(permutation = i)
        del self.treatments

from compiler import ExperimentEncoder
from utils import make_exp, make_task, IDGenerator

class Experiment(Component):
    '''An Experiment holds all the information describing one experiment. If you
    don't make your own IDs (IDs should be unique among pages, among options,
    and among blocks within one experiment), then use one IDGenerator per
    experiment.'''
    def __init__(self, blocks, exchangeable = [], counterbalance = [], banks =
            {}, treatments = []):
        '''
        blocks: [Block], the contents of the experiment.

        exchangeable: [Block], a subset of the Blocks. These Blocks will be
        considered exchangeable. See Block documentation for more information.

        counterbalance: [Block], a subset of the Blocks. See Block documentation
        for more information.

        treatments: [[Block]], a subset of the Blocks. Uses
        num_counters in PsiTurk's config.txt. The blocks listed in treatments
        are specified as running conditionally, based on a variable that changes
        per participant and can take on as many values as you specify in
        num_counters in PsiTurk's config.txt. Each sublist of blocks shows which
        blocks will run when the counter is set to one of its possible
        variables. The number of sublists should equal num_counters. Blocks
        that are not listed in treatments will run by default.

        banks: {string: [string]} or {string: [{string: string}]}. A dictionary
        mapping bank names to banks, where a bank is a list of pieces of
        information (which may be simple - strings - or complex - dictionaries
        of strings). Within a bank, all items should be for the same purpose. If
        the pieces of information are complex, all dictionaries in the same bank
        should have the same keys. Bank information can be used for page text,
        option text, page feedback, option feedback, resource filenames, or page
        condition.
        '''

        self.blocks = [b for b in blocks]
        if exchangeable:
            self.exchangeable = [b.id_str for b in exchangeable]
        if counterbalance:
            self.counterbalance = [b.id_str for b in counterbalance]
        if banks:
            self.banks = banks
        if treatments:
            self.treatments = treatments

    def _validate(self):
        pass

    def _validate_json(self, json_object):
        contents = pkg_resources.resource_string(__name__, 'sperimentschema.json')
        schema = json.loads(contents)
        jsonschema.validate(json_object, schema)

    def to_JSON(self):
        return json.dumps(self, indent = 4, cls = ExperimentEncoder)

    def to_file(self, filename, varname):
        '''validates the structure of the experiment and writes it as a JSON
        object in a JavaScript file.'''
        json_experiment = self.to_JSON()
        self._validate_json(json_experiment)
        to_write = 'var ' + varname + ' = ' + json_experiment
        with open(filename, 'w') as f:
            f.write(to_write)

    def install(self, experiment_name):
        '''validates the structure of the experiment, writes it as a JSON object
        in a JavaScript file, and gives PsiTurk access to Speriment and the JSON
        object.'''
        filename = experiment_name + '.js'
        varname = experiment_name
        self.to_file('./static/js/' + filename, varname)
        make_exp(filename)
        make_task(varname)

def exactly_one(obj, attributes):
    found = [attribute for attribute in attributes if hasattr(obj, attribute)]
    if len(found) != 1:
        raise ValueError, '''{} must have exactly one of the following attributes:

{}

but it has:

{}.'''.format(obj, attributes, found)

def at_most_one(obj, attributes):
    found = [attribute for attribute in attributes if hasattr(obj, attribute)]
    print found
    if len(found) > 1:
        raise ValueError, '''{} must have at most one of the following attributes:

{}

but it has:

{}.'''.format(obj, attributes, found)
