import json

class IDGen:
    def __init__(self):
        self.currentID = 0

    def nextID(self):
        self.currentID += 1
        return str(self.currentID)

def toJSON(experimental_component):
    objects = experimental_component.__dict__
    return json.dumps(objects, indent = 4)

def to_file(json_object, filename, varname):
    with open(filename, 'w') as f:
        f.write('var ' + varname + ' = ' + json_object)

class Option:
    def __init__(self, idgen, text, answer = None, correct = None, tags = None):
        self.id = idgen.nextID()
        self.text = text
        if answer != None:
            self.answer = answer
        if correct != None:
            self.correct = correct
        if tags != None:
            self.tags = tags

    def toJSON(self):
        return self.__dict__

class Page():
    def __init__(self, idgen, text, options = None, answer = None, correct = None, freetext = False,
            condition = None, resources = None, ordered = False, exclusive =
            None, tags = None):
        self.id = idgen.nextID()
        self.text = text
        if options:
            self.options = [o.toJSON() for o in options]
        if answer != None:
            self.answer = answer
        if correct != None:
            self.correct = correct
        if freetext:
            self.freetext = freetext
        if condition != None:
            self.condition = condition
        if resources != None:
            self.resources = resources
        if ordered:
            self.ordered = ordered
        if exclusive != None:
            self.exclusive = exclusive
        if tags != None:
            self.tags = tags

    def toJSON(self):
        return self.__dict__

class RunIf:
    def __init__(self, pageID, optionID = None, regex = None):
        self.pageID = pageID
        if optionID != None:
            self.optionID = optionID
        elif regex != None:
            self.regex = regex
        else:
            raise ValueError, "RunIf must have one of optionID and regex."
        if optionID and regex:
            raise ValueError, "RunIf must have exactly one of optionID and regex."

class Block:
    def __init__(self, idgen, contents, runIf = None, exchangeable = [], latinSquare = False,
        pseudorandomize = False, criterion = None, training = False):
        self.id = idgen.nextID()
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
        if pseudorandomize:
            self.pseudorandomize = pseudorandomize
        if criterion != None:
            self.criterion = criterion
        if training:
            self.training = training
        if runIf:
            self.runIf = runIf

    def toJSON(self):
        return self.__dict__

class Experiment:
    def __init__(self, blocks, breakoff = False, exchangeable = []):
        self.blocks = [b.toJSON() for b in blocks]
        self.breakoff = breakoff
        self.exchangeable = [b.id for b in exchangeable]
