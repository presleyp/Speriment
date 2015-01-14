'''These are the constructors for all objects that make up experiments.'''

from collections import Counter
import copy, pkg_resources, json, jsonschema
# more imports before Experiment

__all__ = ['Experiment', 'Block', 'Page', 'Option', 'RunIf', 'SampleFrom']

class RunIf:
    def __init__(self, page = None, option = None, regex = None, permutation =
            None):
        '''
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
        if page != None:
            self.page_id = page.id_str
        if option != None:
            self.option_id = option.id_str
        elif regex != None:
            self.regex = regex
        if permutation != None:
            self.permutation = permutation

class SampleFrom:
    def __init__(self, bank):
        '''bank: string, the name of an information bank to sample from.
        Sampling is per-participant, random, and without replacement during an
        experiment. Once sampled, the choice will remain in place for all
        iterations of the block. Sampling happens after pages are chosen from
        groups.'''
        self.bank = bank

class Component:
    '''This is the superclass of Option, Page, Block, and Experiment. You should
    not instantiate this class.'''

    # class variable
    id_generator = None

    def _set_id(self, id_str = None):
        if id_str:
            self.id_str = id_str
        else:
            self.id_str = self.id_generator._next_id()

    def new(self):
        '''Use this method to return a new experimental component with the same
        data as one you've already constructed if you're using an IDGenerator to
        handle IDs. The two components will have different IDs, so
        they can coexist in an experiment and won't be confused with each other,
        for instance if one is referred to in a RunIf.'''
        new_component = copy.deepcopy(self)
        new_component.id_str = self.id_generator._next_id()
        for att in ['blocks', 'pages', 'options']:
            if hasattr(new_component, att):
                setattr(new_component, att, [item.new()
                    for item in getattr(new_component, att)])
            elif hasattr(new_component, 'groups'):
                new_component.groups = [[page.new() for page in group]
                        for group in new_component.groups]
        return new_component

    def _set_optional_args(self, **kwargs):
        for (key, value) in kwargs.iteritems():
            setattr(self, key, value)

    def _validate(self):
        '''To be defined for each subtype.'''
        pass


class Option(Component):
    def __init__(self, text = None, id_str = None, **kwargs):
        '''
        text: If the Option is not a text box, this is the label for the Option
        that will be displayed on the page. If the Option is a text box, this is
        not currently used. Can also be SampleFrom.

        id_str: String, optional, an identifier unique among all options in this
        experiment. (Currently uniqueness in its page is sufficient but this may
        change in the future.)

        **kwargs: optional keyword arguments, which can include:

        feedback: string, the feedback to be displayed if this Option is chosen.
        Can also be SampleFrom.

        correct: If the Option is not a text box, a boolean representing whether
        this Option is correct. If the Option is a text box, a string
        representing a regular expression that any correct answers will match.
        For example, correct = 'hi.*' would mean that 'hi' and 'high' are both
        correct inputs.

        tags: [string], any metadata you want to associate with this Option. It
        will not be used in the experiment, but will be passed through to the
        data file. All options in the entire experiment must have the same
        number of tags so that they will stay aligned in the output file.

        Note that the type of an Option (radio button, check box, dropdown, or
        text box) is determined based on its data and the attributes of its
        containing Page. It is not set directly in the Option.'''
        self._set_id(id_str)
        if text != None:
            self.text = text
        self._set_optional_args(**kwargs)


class Page(Component):
    def __init__(self, text, options = None, id_str = None, **kwargs):
        '''
        text: The text to be displayed on the page. Can also be SampleFrom.

        options: [Option], optional, the answer choices to be displayed on the
        page.

        id_str: String, optional, an identifier for this page unique among all
        pages in the experiment.

        **kwargs: optional keyword arguments, which can include:

        feedback: string, the feedback to be displayed after an answer is
        chosen. Can also be SampleFrom.

        correct: If freetext is False, a string representing the id_str of the
        correct Option. If freetext is True, a string representing a regular
        expression that a correct answer will match.

        tags: [string], any metadata you want to associate with this Page. It
        will not be used in the experiment, but will be passed through to the
        data file. All pages in the entire experiment must have the same number
        of tags so that they will stay aligned in the output file.

        condition: string, the condition this Page belongs to in the
        experimental manipulation. Used if this Page is in a block where
        pseudorandom is True, to keep Pages with the same condition from
        appearing in a row. Can also be SampleFrom.

        resources: [string], filenames of any images, audio, or video that
        should display on the page. Any resource can be SampleFrom.

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

class Block(Component):
    def __init__(self, pages = None, groups = None, blocks = None, id_str = None,
            exchangeable = [], counterbalance = [], treatments = [], latin_square = None, pseudorandom = None, **kwargs):
        '''
        Exactly one of pages, groups, and blocks must be provided.

        pages: [Page], the pages contained by this Block.

        groups: [[Page]], the groups contained by this Block. One page from each
        inner list of Pages will be displayed per participant.

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

        criterion: integer or float between 0 and 1. If integer, it must be
        less than or equal to the number of Pages contained by this Block
        (currently it can only be used on Blocks where contents is [Page] or
        [[Page]], but eventually it will be usable with [Block], and this
        restriction will apply to the Pages that are ultimately contained by the
        Block) that have a specification for the correct attribute, or have
        Options that do. The integer then represents the number of Pages that
        can be correct and were correct in a row at the end of the Block. The
        idea is that participants may make mistakes at the beginning, but by the
        end of the Block should give correct answers for this long of a streak
        in order to show master. If it's a float, it represents a percentage of
        Pages that can be correct that were correct out of the entire block, not
        in a streak. Whether it's an integer or a float, this attribute signals
        that a participant should see the (reshuffled) contents of this Block as
        many times as it takes to reach criterion before moving on to later
        Blocks, and can be used to train participants before later testing them
        on novel information.

        run_if: RunIf, gives a condition that must be met in order for this Block
        to display its contents, no matter the type of contents. See the RunIf
        documentation for more information.

        banks: {string: [string]}, a dictionary mapping bank names to banks,
        where a bank is a list of pieces of information. Within a bank, all
        items should be for the same purpose. Bank information can be used for
        page text, option text, page feedback, option feedback, resource
        filenames, or page condition.
        '''

        self._set_id(id_str)
        self._set_optional_args(**kwargs)
        if pages != None:
            self.pages = pages
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
        content_types = [attribute for attribute in
                ['pages', 'groups', 'blocks'] if hasattr(self, attribute)]
        if len(content_types) != 1:
            raise ValueError, '''Block must have exactly one of pages, groups,
            and blocks.'''

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

from compiler import ExperimentEncoder
from utils import make_exp, make_task

class Experiment(Component):
    '''An Experiment holds all the information describing one experiment. If you
    don't make your own IDs (IDs should be unique among pages, among options,
    and among blocks within one experiment), then use one IDGenerator per
    experiment.'''
    def __init__(self, blocks, exchangeable = [], counterbalance = [], banks =
            {}):
        '''
        blocks: [Block], the contents of the experiment.

        exchangeable: [Block], a subset of the Blocks. These Blocks will be
        considered exchangeable. See Block documentation for more information.

        counterbalance: [Block], a subset of the Blocks. See Block documentation
        for more information.

        banks: {string: [string]}, a dictionary mapping bank names to banks,
        where a bank is a list of pieces of information. Within a bank, all
        items should be for the same purpose. Bank information can be used for
        page text, option text, page feedback, option feedback, resource
        filenames, or page condition.
        '''

        self.blocks = [b for b in blocks]
        if exchangeable:
            self.exchangeable = [b.id_str for b in exchangeable]
        if counterbalance:
            self.counterbalance = [b.id_str for b in counterbalance]
        if banks:
            self.banks = banks

    def _validate(self):
        self._validate_page_tags()
        self._validate_option_tags()

    def _validate_page_tags(self):
        pass

    def _validate_option_tags(self):
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


