import json, copy
# more imports at bottom
__all__ = []

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
            obj._validate()
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

from components import Component, RunIf, SampleFrom