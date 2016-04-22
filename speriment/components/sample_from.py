from speriment.utils import IDGenerator, at_most_one
import copy

class SampleFrom:
    '''Stands in place of a value of a Page or Option and tells the program to
    randomly choose a value to go there on a per-participant basis. Once
    sampled, the choice will remain in place for all iterations of the block.
    Sampling happens after pages are chosen from groups.'''

    _id_generators = {} # {bankname: IDGenerator}
    _variable_maps = {} # {bankname: {variablename: index}}
    _compile_time_generators = {} # {bankname: IDGenerator}

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
        will not sample the same value. not_variable is ignored if you give
        a variable.

        field: string, optional. Use with a bank made up of dictionaries where
        each dictionary has the same keys. field is the key you want to access.
        If you SampleFrom a bank of dictionaries that all contain x and y keys,
        and field is x, you will get one of the x values.

        with_replacement: boolean, optional. Defaults to False. Invalid when
        variable or not_variable is given. False is a shorthand
        for giving this SampleFrom a variable that is not used elsewhere in the
        experiment. Thus, False means this SampleFrom will not sample the same
        value as another SampleFrom on the same bank that has a variable,
        not_variable, or with_replacement set to False. True is a shorthand for
        "pick anything at all." Thus, a True setting on one SampleFrom overrides
        False settings on other SampleFroms on the same bank: they may sample
        the same value.
        '''
        self.bank = bank
        if bank not in SampleFrom._id_generators:
            SampleFrom._id_generators[bank] = IDGenerator()
            SampleFrom._variable_maps[bank] = {}
        if variable != None:
            self.variable = variable
            if not variable in SampleFrom._variable_maps[bank]:
                SampleFrom._variable_maps[bank][variable] = SampleFrom._id_generators[bank]._next_id()
        if not_variable != None:
            self.not_variable = not_variable
            if not not_variable in SampleFrom._variable_maps[bank]:
                SampleFrom._variable_maps[bank][not_variable] = SampleFrom._id_generators[bank]._next_id()
        if with_replacement:
            self.with_replacement = with_replacement
        if field != None:
            self.field = field

    def map_variables(self):
        mapping = SampleFrom._variable_maps[self.bank]
        if hasattr(self, 'variable'):
            self.variable = int(mapping[self.variable])
        elif hasattr(self, 'not_variable'):
            self.not_variable = int(mapping[self.not_variable])
        else:
            if not hasattr(self, 'with_replacement'):
                self.variable = int(SampleFrom._compile_time_generators[self.bank]._next_id())

    def _validate(self):
        at_most_one(self, ['variable', 'not_variable', 'with_replacement'])
        # TODO (not)var or without_r consistently for a given bank
        # TODO enough in bank for all samples
        # TODO fields consistent in bank
        pass

    def comp(self):
        self.map_variables()
        if hasattr(self, 'bank'):
           self.sampleFrom = self.bank
           del self.bank
        if hasattr(self, 'not_variable'):
           self.notVariable = self.not_variable
           del self.not_variable
        return self
