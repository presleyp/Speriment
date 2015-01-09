'''This is the API you can use to write a Python script for use with
Speriment.'''
import json, jsonschema
from collections import Counter
import copy, csv
import pkg_resources

### Reading CSV File

def get_rows(csvfile, sep = ','):
    '''csvfile: string, a filename of a csv file.

    sep: string, the delimiter used to separate values in the csv file. Defaults
    to comma.

    Returns: lists (one for each row in the file) of lists (one for each cell in
    the row) of strings.'''

    with open(csvfile, 'r') as f:
        rows = csv.reader(f, delimiter = sep)
        return list(rows)

def get_dicts(csvfile, sep = ','):
    '''csvfile: string, a filename of a csv file. The file should have a header
    row with column names.

    sep: string, the delimiter used to separate values in the csv file. Defaults
    to comma.

    Returns: lists (one for each row in the file) of dictionaries mapping
    strings (column names) to strings (cell values).'''

    with open(csvfile, 'r') as f:
        dicts = csv.DictReader(f, delimiter = sep)
        return list(dicts)

### Writing objects to JSON

class ExperimentEncoder(json.JSONEncoder):
    '''This class enables nested Python objects to be correctly serialized to JSON.
    It also requires that non-schema validation pass before the JSON is
    generated.'''
    def rename_key(self, dictionary, key, new_key):
        if key in dictionary:
            dict_copy = copy.deepcopy(dictionary)
            value = dictionary[key]
            dict_copy[new_key] = value
            del dict_copy[key]
            return dict_copy
        else:
            return dictionary

    def compile_treatments(self, obj):
        '''Treatments are lists of lists of blocks to run conditionally. Remove
        this variable and add RunIf objects to those blocks.'''
        for i, treatment in enumerate(obj.treatments):
            for block in treatment:
                block.run_if = RunIf(permutation = i)
        del obj.treatments
        return obj

    def default(self, obj):
        if isinstance(obj, Component):
            if hasattr(obj, 'treatments'):
                obj = self.compile_treatments(obj)
            obj.validate()
            # make keys follow JS conventions
            renamed_ls = self.rename_key(obj.__dict__, 'latin_square', 'latinSquare')
            renamed_ri = self.rename_key(renamed_ls, 'run_if', 'runIf')
            renamed_id = self.rename_key(renamed_ri, 'id_str', 'id')
            return renamed_id
        if isinstance(obj, RunIf):
            renamed_option = self.rename_key(obj.__dict__, 'option_id', 'optionID')
            renamed_page = self.rename_key(renamed_option, 'page_id', 'pageID')
            return renamed_page
        if isinstance(obj, SampleFrom):
            return {"sampleFrom": obj.bank}
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
        self.current_id = seed

    def next_id(self):
        '''Takes no arguments and returns a string, which is a new unique ID.'''
        self.current_id += 1
        return str(self.current_id)

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

### Special kind of experimental components (not in the hierarchy)

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

#### Experiment Components

class Component:
    '''This is the superclass of Option, Page, Block, and Experiment. You should
    not instantiate this class.'''

    # class variable
    id_generator = None

    def set_id(self, id_str = None):
        if id_str:
            self.id_str = id_str
        else:
            self.id_str = self.id_generator.next_id()

    def new(self):
        '''Use this method to return a new experimental component with the same
        data as one you've already constructed if you're using an IDGenerator to
        handle IDs. The two components will have different IDs, so
        they can coexist in an experiment and won't be confused with each other,
        for instance if one is referred to in a RunIf.'''
        new_component = copy.deepcopy(self)
        new_component.id_str = self.id_generator.next_id()
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
        self.set_id(id_str)
        if text != None:
            self.text = text
        self.set_optional_args(**kwargs)


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
        '''
        self.set_id(id_str)
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

        self.set_id(id_str)
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
            self.exchangeable = [b.id_str for b in exchangeable]

        if counterbalance:
            self.counterbalance = [b.id_str for b in counterbalance]

        if latin_square:
            self.latin_square = latin_square
            self.validate_latin_square()

        if pseudorandom:
            self.pseudorandom = pseudorandom

        # TODO what about mutated blocks
        if treatments:
            self.treatments = treatments
            # for (i, treatment) in enumerate(treatments):
            #     for block in treatment:
            #         block.run_if = RunIf(permutation = i)

    def validate(self):
        self.validate_contents()
        self.validate_pseudorandom()
        self.validate_latin_square()
        self.validate_counterbalancing()

    def validate_counterbalancing(self):
        if hasattr(self, 'counterbalance') and hasattr(self, 'treatments'):
            print '''Warning: counterbalance and treatments depend on the same
            variable, so using both in one experiment will cause
            correlations between which blocks are used and how blocks are
            ordered. If you want these to be decided independently, change
            'counterbalance' to 'exchangeable' so the order will be decided
            randomly for each participant.'''


    def validate_contents(self):
        content_types = [attribute for attribute in
                ['pages', 'groups', 'blocks'] if hasattr(self, attribute)]
        if len(content_types) != 1:
            raise ValueError, '''Block must have exactly one of pages, groups,
            and blocks.'''

    def validate_pseudorandom(self):
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

    def validate_latin_square(self):
        pass

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

    def validate(self):
        self.validate_page_tags()
        self.validate_option_tags()

    def validate_page_tags(self):
        pass

    def validate_option_tags(self):
        pass

    def validate_json(self, json_object):
        contents = pkg_resources.resource_string(__name__, 'sperimentschema.json')
        schema = json.loads(contents)
        jsonschema.validate(json_object, schema)

    def to_JSON(self):
        return json.dumps(self, indent = 4, cls = ExperimentEncoder)

    def to_file(self, filename, varname):
        '''Validates the structure of the experiment and writes it as a JSON
        object in a JavaScript file.'''
        json_experiment = self.to_JSON()
        self.validate_json(json_experiment)
        to_write = 'var ' + varname + ' = ' + json_experiment
        with open(filename, 'w') as f:
            f.write(to_write)

    def install(self, experiment_name):
        '''Validates the structure of the experiment, writes it as a JSON object
        in a JavaScript file, and gives PsiTurk access to Speriment and the JSON
        object.'''
        filename = experiment_name + '.js'
        varname = experiment_name
        self.to_file('./static/js/' + filename, varname)
        make_exp(filename)
        make_task(varname)


def make_task(varname):
    '''Replace PsiTurk's example task.js with the standard Speriment task.js,
    with the JSON object variable name inserted.'''
    with open('./static/js/task.js', 'w') as task:
        task.write('''$(document).ready(function(){
    var mySperiment = ''' + varname + ''';
    var psiturk = PsiTurk(uniqueId, adServerLoc);
    psiturk.finishInstructions();
    var speriment = new Experiment(mySperiment, condition, counterbalance, psiturk);
    speriment.start();
});''')

def make_exp(filename):
    '''Add script tags to PsiTurk's exp.html file so it can use speriment.js and
    the JSON object.'''
    exp_file = './templates/exp.html'
    #TODO will change to static/lib/node_modules/speriment/speriment.js and maybe min
    speriment_tag = '''\n\t\t<script
    src="/static/lib/node_modules/speriment/javascript/speriment.js" type="text/javascript">'''
    json_tag = '''\n\t\t<script src="/static/js/{0}" type="text/javascript">'''.format(filename)
    new_contents = None
    with open(exp_file, 'r') as exp:
        exp_contents = exp.read()
        script_tags = exp_contents.split('</script>')
        # These scripts must go after PsiTurk and its dependencies but before
        # task.js and the rest of the page
        if script_tags[-4] == speriment_tag:
            script_tags[-3] = json_tag
        else:
            script_tags = script_tags[:-2] + [speriment_tag] + [json_tag] + script_tags[-2:]
        new_contents = '</script>'.join(script_tags)
    with open(exp_file, 'w') as expw:
        expw.write(new_contents)
