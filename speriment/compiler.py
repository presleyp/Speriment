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

    def compile_item(self, item):
        page_attrs = ['text', 'options', 'feedback', 'correct', 'resources', 'ordered',
                'exclusive', 'freetext', 'keyboard']
        if not hasattr(item, 'pages'):
            item.pages = [Page('')]
            del item.pages[0].text
            for attr in page_attrs:
                if hasattr(item, attr):
                    setattr(item.pages[0], attr, getattr(item, attr))
                    delattr(item, attr)
        return item

    def compile_feedback(self, item):
        '''Feedback is a string or Page to run either unconditionally after a Page,
        or conditionally after an Option is chosen. Remove this variable and instantiate
        the Page with a RunIf if needed.'''
        new_pages = []
        for (i, page) in enumerate(item.pages):
            feedback_pages = []
            if hasattr(page, 'feedback'):
                page_feedback = page.feedback if isinstance(page.feedback, Page) else Page(page.feedback)
                feedback_pages.append(page_feedback)
                del page.feedback
            if hasattr(page, 'options'):
                for option in page.options:
                    if hasattr(option, 'feedback'):
                        option_feedback = None
                        run_if = RunIf(page = page, option = option)
                        if isinstance(option.feedback, Page):
                            option_feedback = option.feedback
                            option_feedback.run_if = run_if
                        else:
                            option_feedback = Page(option.feedback, run_if = run_if)
                        feedback_pages.append(option_feedback)
                        del option.feedback
            new_pages.append(page)
            new_pages += feedback_pages
        item.pages = new_pages
        return item

    def map_variables(self, obj):
        new_obj = copy.deepcopy(obj)
        mapping = SampleFrom._variable_maps[new_obj.bank]
        if hasattr(new_obj, 'variable'):
            new_obj.variable = int(mapping[new_obj.variable])
        elif hasattr(new_obj, 'not_variable'):
            new_obj.not_variable = int(mapping[new_obj.not_variable])
        else:
            if not hasattr(new_obj, 'with_replacement'):
                new_obj._set_variable()
        return new_obj

    def default(self, obj):
        if isinstance(obj, Component):
            if hasattr(obj, 'treatments'):
                obj = self.compile_treatments(obj)
            if isinstance(obj, Item):
                obj = self.compile_item(obj)
                obj = self.compile_feedback(obj)
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
            obj = self.map_variables(obj)
            obj._validate()
            renamed_sf = self.rename_key(obj.__dict__, 'bank', 'sampleFrom')
            renamed_nv = self.rename_key(renamed_sf, 'not_variable', 'notVariable')
            return renamed_nv
        # Let the base class default method raise the TypeError
        return json.JSONEncoder.default(self, obj)

from components import Component, Item, Page, RunIf, SampleFrom
