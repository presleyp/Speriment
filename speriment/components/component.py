import copy
from resource import Resource

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
        for att in ['blocks', 'items', 'pages', 'options']:
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

    def validate_banks(self):
        if hasattr(self, 'banks'):
            for bank in self.banks:
                types = [type(bank_item) for bank_item in bank]
                if len(set(types)) > 1:
                    raise ValueError, '''Bank must be homogeneous.'''
                if len(bank) == 0:
                    raise ValueError, '''Bank is empty.'''
                elif type(bank[0]) == dict:
                    first_keys = bank[0].keys
                    bank_keys = [bank_item.keys for bank_item in bank]
                    if set(bank_keys) != set(first_keys):
                        raise ValueError, '''All items in bank must have the same fields.'''

    def _validate(self):
        '''To be defined for each subtype.'''
        pass

    def compile_resources(self):
        if hasattr(self, 'resources'):
            for i, resource in enumerate(self.resources):
                if type(resource) == str:
                    self.resources[i] = Resource(resource)

    def comp(self):
        if hasattr(self, 'id_str'):
            self.id = self.id_str
            del self.id_str
        if hasattr(self, 'run_if'):
            self.runIf = self.run_if
            del self.run_if
        self.compile_resources()
        return self
