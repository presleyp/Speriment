import json, copy

__all__ = []

class ExperimentEncoder(json.JSONEncoder):
    '''This class enables nested Python objects to be correctly serialized to JSON.
    It also requires that non-schema validation pass before the JSON is
    generated.'''
    def default(self, obj):
        obj._validate()
        new_obj = copy.deepcopy(obj)
        try:
            new_obj.comp()
            return new_obj.__dict__
        except:
            # Let the base class default method raise the TypeError
            return json.JSONEncoder.default(self, new_obj.__dict__)
