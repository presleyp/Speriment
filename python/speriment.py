import json, jsonschema

schema = None
with open('../json/sperimentschema.json', 'r') as f:
    contents = f.read()
    schema = json.loads(contents)

class IDGenerator:
    def __init__(self, seed = 0):
        self.currentID = seed

    def nextID(self):
        self.currentID += 1
        return str(self.currentID)


class RunIf:
    def __init__(self, pageID, optionID = None, regex = None):
        self.pageID = pageID
        if optionID != None:
            self.optionID = optionID
        elif regex != None:
            self.regex = regex

#### Experiment Components

class Component:
    def set_id(self, idgen):
        self.id = idgen.nextID()

    def set_optional_args(self, **kwargs):
        for (key, value) in kwargs.iteritems():
            setattr(self, key, value)

    def toJSON(self):
        return self.__dict__


class Option(Component):
    def __init__(self, idgen, text, **kwargs):
        '''Optional keyword arguments: answer, correct, tags.'''
        self.set_id(idgen)
        self.text = text
        self.set_optional_args(**kwargs)


class Page(Component):
    def __init__(self, idgen, text, options = None, **kwargs):
        '''Optional keyword arguments: answer, correct, tags, condition,
        resources, ordered, exclusive, freetext.'''
        self.set_id(idgen)
        self.text = text
        self.set_optional_args(**kwargs)
        if options:
            self.options = [o.toJSON() for o in options]


class Block(Component):
    def __init__(self, idgen, contents, exchangeable = [], latinSquare = None, pseudorandom = None, **kwargs):
        '''Optional keyword arguments: criterion, runIf.'''
        self.set_id(idgen)
        self.set_optional_args(**kwargs)
        if isinstance(contents[0], Page):
            self.pages = [c.toJSON() for c in contents]
        elif isinstance(contents[0], Block):
            self.blocks = [c.toJSON() for c in contents]
        else:
            self.groups = [[p.toJSON() for p in group] for group in contents]

        if exchangeable:
            self.exchangeable = [b.id for b in exchangeable]

        if latinSquare:
            self.latinSquare = latinSquare
            self.validate_latinSquare()

        if pseudorandom:
            self.pseudorandom = pseudorandom
            self.validate_pseudorandom()

    def validate_pseudorandom(self):
        pass

    def validate_latinSquare(self):
        pass

class Experiment(Component):
    def __init__(self, blocks, breakoff = False, exchangeable = []):
        self.blocks = [b.toJSON() for b in blocks]
        self.breakoff = breakoff
        self.exchangeable = [b.id for b in exchangeable]

    def toJSON(self):
        objects = self.__dict__
        return json.dumps(objects, indent = 4)

    def validate(self, json_object):
        jsonschema.validate(json_object, schema)

    def validate_page_tags(self):
        pass

    def validate_option_tags(self):
        pass


    def to_file(self, json_object, filename, varname):
        self.validate(json_object)
        with open(filename, 'w') as f:
            f.write('var ' + varname + ' = ' + json_object)
