from component import Component
from sample_from import SampleFrom
import pkg_resources, json, jsonschema, copy
from speriment.compiler import ExperimentEncoder
from speriment.utils import make_exp, make_task, IDGenerator

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
        SampleFrom._compile_time_generators = copy.deepcopy(SampleFrom._id_generators)
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
