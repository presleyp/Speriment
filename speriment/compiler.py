import json, copy
from components.component import Component
from components.run_if import RunIf
from components.sample_from import SampleFrom
from components.resource import Resource

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

    def compile_resources(self, obj):
        new_obj = copy.deepcopy(obj)
        for i, resource in enumerate(obj.resources):
            if type(resource) == str:
                new_obj.resources[i] = Resource(resource)
        for i, resource in enumerate(new_obj.resources):
            if isinstance(resource, Resource):
                resource.mediaType = resource.media_type
                del resource.media_type
                new_obj.resources[i] = resource.__dict__
        return new_obj

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
            if hasattr(obj, 'resources'):
                obj = self.compile_resources(obj)
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
            obj = obj.map_variables()
            obj._validate()
            renamed_sf = self.rename_key(obj.__dict__, 'bank', 'sampleFrom')
            renamed_nv = self.rename_key(renamed_sf, 'not_variable', 'notVariable')
            return renamed_nv
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)
