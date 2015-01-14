import csv
from components import Component
__all__ = ['get_rows', 'get_dicts', 'IDGenerator', 'make_experiment']

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

    def _next_id(self):
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
