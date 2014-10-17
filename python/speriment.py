'''This is the API you can use to write a Python script for use with
Speriment.'''
import json, jsonschema
from collections import Counter
import copy, csv

### Reading CSV File

def get_rows(csvfile):
    '''csvfile: string, a filename of a csv file.

    sep: string, the delimited used to separate values in the csv file. Defaults
    to comma.

    Returns: lists (one for each row in the file) of lists (one for each cell in
    the row) of strings.'''

    with open(csvfile, 'r') as f:
        rows = csv.reader(f)
        return list(rows)

def get_dicts(csvfile):
    '''csvfile: string, a filename of a csv file. The file should have a header
    row with column names.

    sep: string, the delimiter used to separate values in the csv file. Defaults
    to comma.

    Returns: lists (one for each row in the file) of dictionaries mapping
    strings (column names) to strings (cell values).'''

    with open(csvfile, 'r') as f:
        dicts = csv.DictReader(f)
        return list(dicts)

### Writing objects to JSON

class ExperimentEncoder(json.JSONEncoder):
    '''This class enables nested Python objects to be correctly serialized to JSON.
    It also requires that non-schema validation pass before the JSON is
    generated.'''
    def default(self, obj):
        if isinstance(obj, Component):
            obj.validate()
            return obj.__dict__
        if isinstance(obj, RunIf):
            return obj.__dict__
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)

### Generating IDs

class IDGenerator:
    '''Creates an object to generate unique IDs for experimental components. You
    should create exactly one per experiment so that all IDs in that experiment
    will be distinct.

    Usage:
    with make_experiment(IDGenerator()):
        <experiment code>
    '''

    def __init__(self, seed = 0):
        '''seed: optional, an integer to start making IDs at.'''
        self.currentID = seed

    def nextID(self):
        '''Takes no arguments and returns a string, which is a new unique ID.'''
        self.currentID += 1
        return str(self.currentID)

### Makes the with statement possible

def make_experiment(id_generator):
    '''id_generator: IDGenerator, an object that will make unique IDs for
    everything in an Experiment.

    side effect: puts id_generator in scope for the duration of the with block.
    Options, Pages, and Blocks will automatically use it to create unique IDs.

    Usage:
    with make_experiment(IDGenerator()):
        <experiment code>

    <any code here will not use that IDGenerator anymore>
    '''
    return ExperimentMaker(id_generator)

class ExperimentMaker():
    '''This class makes the "with" statement for automatic ID generation
    possible. It sets an IDGenerator as a class variable in Component, making it
    available to Options, Pages, and Blocks. At the end of the with block,
    it is removed and any errors encountered in the block are raised.'''
    def __init__(self, id_generator):
        self.id_generator = id_generator

    def __enter__(self):
        Component.id_generator = self.id_generator

    def __exit__(self, etype, evalue, etrace):
        Component.id_generator = None
        return False # False means if you encountered errors, raise them

### Special kind of experimental component (not in the hierarchy)

class RunIf:
    def __init__(self, page, option = None, regex = None):
        '''
        page: Page, the Page to look at to see which answer was given.

        option: Option, optional. If given, the block containing this RunIf will
        only run if this Option was chosen the last time page was displayed.

        regex: string, optional. If given, the block containing this RunIf will
        only run if a response matching a regular expression made from the
        string regex was given the last time page was displayed.

        Exactly one of option and regex must be given.

        The reason RunIfs depend on "the last time" their page was displayed is
        that Pages can display multiple times if they are in Blocks with a
        criterion.'''
        self.pageID = page.id
        if option != None:
            self.optionID = option.id
        elif regex != None:
            self.regex = regex

#### Experiment Components

class Component:
    '''This is the superclass of Option, Page, Block, and Experiment. You should
    not instantiate this class.'''

    # class variable
    id_generator = None

    def set_id(self, ID = None):
        if ID:
            self.id = ID
        else:
            self.id = self.id_generator.nextID()

    def new(self):
        '''Use this method to return a new experimental component with the same
        data as one you've already constructed if you're using an IDGenerator to
        handle IDs. The two components will have different IDs, so
        they can coexist in an experiment and won't be confused with each other,
        for instance if one is referred to in a RunIf.'''
        new_component = copy.deepcopy(self)
        new_component.id = self.id_generator.nextID()
        for att in ['blocks', 'pages', 'options']:
            if hasattr(new_component, att):
                setattr(new_component, att, [item.new()
                    for item in getattr(new_component, att)])
            elif hasattr(new_component, 'groups'):
                new_component.groups = [[page.new() for page in group]
                        for group in new_component.groups]
        return new_component

    def set_optional_args(self, **kwargs):
        for (key, value) in kwargs.iteritems():
            setattr(self, key, value)

    def validate(self):
        '''To be defined for each subtype.'''
        pass


class Option(Component):
    def __init__(self, text = None, ID = None, **kwargs):
        '''
        text: If the Option is not a text box, this is the label for the Option
        that will be displayed on the page. If the Option is a text box, this is
        not currently used.

        **kwargs: optional keyword arguments, which can include:

        feedback: string, the feedback to be displayed if this Option is chosen.

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
        self.set_id(ID)
        if text != None:
            self.text = text
        self.set_optional_args(**kwargs)


class Page(Component):
    def __init__(self, text, options = None, ID = None, **kwargs):
        '''
        text: The text to be displayed on the page.

        options: [Option], optional, the answer choices to be displayed on the
        page.

        **kwargs: optional keyword arguments, which can include:

        feedback: string, the feedback to be displayed after an answer is chosen.

        correct: If freetext is False, a string representing the ID of the
        correct Option. If freetext is True, a string representing a regular
        expression that a correct answer will match.

        tags: [string], any metadata you want to associate with this Page. It
        will not be used in the experiment, but will be passed through to the
        data file. All pages in the entire experiment must have the same number
        of tags so that they will stay aligned in the output file.

        condition: string, the condition this Page belongs to in the
        experimental manipulation. Used if this Page is in a block where
        pseudorandom is True, to keep Pages with the same condition from
        appearing in a row.

        resources: [string], filenames of any images, audio, or video that
        should display on the page.

        ordered: boolean, whether the Options for this Page need to be kept in
        the order in which they were given. If True, the Options may be reversed
        but will not be shuffled.

        exclusive: boolean, whether the participant can choose only one Option
        as their response.

        freetext: boolean, whether the Option is a text box rather than multiple
        choice.
        '''
        self.set_id(ID)
        self.text = text
        self.set_optional_args(**kwargs)
        if options:
            self.options = options

    def validate_resources(self):
        pass # check for supported filetypes

    def validate_freetext(self):
        if hasattr(self, 'freetext') and self.freetext == True:
            if len(self.options) > 1:
                raise ValueError, '''If freetext is true, the page has a text box
                as its option, so there shouldn't be more than one option.'''
            if self.options[0].correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
            if self.correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
       #TODO reverse is true


    def validate(self):
        self.validate_resources()
        self.validate_freetext()


class Block(Component):
    def __init__(self, pages = None, groups = None, blocks = None, ID = None,
            exchangeable = [], latinSquare = None, pseudorandom = None, **kwargs):
        '''
        contents: either [Page], [[Page]], or [Block]. If [[Page]], the inner
        lists are referred to as groups (of Pages). Blocks containing groups
        choose one Page to display from each group, and make this choice
        separately for each participant.

        exchangeable: [Block], only valid if contents is [Block]. A subset of
        contents. The Blocks in this list are allowed to switch places with each
        other. Blocks which are not exchangeable run only in the order in which
        they were given. Exchangeable blocks can be used for counterbalancing
        designs. For example, if there are three blocks, A, B, and C, and A and
        C are exchangeable, they can run in the order A, B, C or C, B, A.

        latinSquare: boolean, only valid if contents is [[Page]], that is,
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
        valid if contents is [[Pages]] and latinSquare is False, because there's
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

        runIf: RunIf, gives a condition that must be met in order for this Block
        to display its contents, no matter the type of contents. See the RunIf
        documentation for more information.'''

        self.set_id(ID)
        self.set_optional_args(**kwargs)
        if pages != None:
            self.pages = pages
        if groups != None:
            self.groups = groups
        if blocks != None:
            self.blocks = blocks
        self.validate_contents()
        self.set_optional_args(**kwargs)

        if exchangeable:
            self.exchangeable = [b.id for b in exchangeable]

        if latinSquare:
            self.latinSquare = latinSquare
            self.validate_latinSquare()

        if pseudorandom:
            self.pseudorandom = pseudorandom
            self.validate_pseudorandom()

    def validate(self):
        self.validate_contents()
        self.validate_pseudorandom()
        self.validate_latinSquare()

    def validate_contents(self):
        content_types = [attribute for attribute in
                ['pages', 'groups', 'blocks'] if hasattr(self, attribute)]
        if len(content_types) != 1:
            raise ValueError, '''Block must have exactly one of pages, groups,
            and blocks.'''

    def validate_pseudorandom(self):
        if hasattr(self, 'groups'):
            if self.latinSquare == False:
                raise ValueError, '''Can't choose pages from groups randomly and
                ensure that pseudorandomization will work. Supply pages instead of
                groups, change latinSquare to True, or change pseudorandom to
                False.'''
            try:
                conditions = [p.condition for group in self.groups for page in
                    group]
            except AttributeError:
                raise ValueError, '''Can't pseudorandomize pages without
                conditions.'''
            cond_counter = Counter(conditions)
            cond_counts = cond_counter.values()
            num_cond_counts = len(set(cond_counts))
            if num_cond_counts != 1:
                raise ValueError, '''Can't pseudorandomize pages if not all
                conditions are represented the same number of times in the
                block.'''
        #TODO elif hasattr('pages')

    def validate_latinSquare(self):
        pass

class Experiment(Component):
    '''An Experiment holds all the information describing one experiment. If you
    don't make your own IDs (IDs should be unique among pages, among options,
    and among blocks within one experiment), then use one IDGenerator per
    experiment.'''
    # class variable schema holds the schema to validate your JSON against
    schema = None
    with open('../json/sperimentschema.json', 'r') as f:
        contents = f.read()
        schema = json.loads(contents)

    def __init__(self, blocks, exchangeable = []):
        '''
        blocks: [Block], the contents of the experiment.

        exchangeable: [Block], a subset of the Blocks. These Blocks will be
        considered exchangeable. See Block documentation for more information.'''

        self.blocks = [b for b in blocks]
        self.exchangeable = [b.id for b in exchangeable]

    def validate(self):
        self.validate_page_tags()
        self.validate_option_tags()

    def validate_page_tags(self):
        pass

    def validate_option_tags(self):
        pass

    def validate_json(self, json_object):
        jsonschema.validate(json_object, self.schema)

    def toJSON(self):
        return json.dumps(self, indent = 4, cls = ExperimentEncoder)

    def to_file(self, filename, varname, append = False):
        json_experiment = self.toJSON()
        self.validate_json(json_experiment)
        to_write = 'var ' + varname + ' = ' + json_experiment
        if append:
            with open(filename, 'a') as f:
                f.append(to_write)
        else:
            with open(filename, 'w') as f:
                f.write(to_write)
