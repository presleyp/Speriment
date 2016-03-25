from speriment import *
import json

def test_new():
    with make_experiment(IDGenerator()):
        o = Option('a')
        o2 = o.new()
        assert o.id_str != o2.id_str

def test_get_rows():
    answer = [['Col1', 'Col2'], ['one', 'two'], ['three', 'four']]
    rows = get_rows('speriment/test/tab_sep.csv', sep='\t')
    assert rows == answer
    rows2 = get_rows('speriment/test/comma_sep.csv')
    assert rows2 == answer

def test_get_dicts():
    answer = [{'Col1': 'one', 'Col2': 'two'}, {'Col1': 'three', 'Col2': 'four'}]
    rows = get_dicts('speriment/test/tab_sep.csv', sep='\t')
    assert rows == answer
    rows2 = get_dicts('speriment/test/comma_sep.csv')
    assert rows2 == answer

def test_compile_treatments():
    with make_experiment(IDGenerator()):
        b1 = Block(pages = [])
        b2 = Block(pages = [])
        b3 = Block(pages = [])
        outer = Block(blocks = [b1, b2, b3], treatments = [[b1, b3], [b2]])
        exp = Experiment(blocks = [outer])
        json_exp = exp.to_JSON()
        compiled_exp = json.loads(json_exp)
        assert compiled_exp['blocks'][0]['blocks'][0]['runIf']['permutation'] == 0
        assert compiled_exp['blocks'][0]['blocks'][1]['runIf']['permutation'] == 1
        assert compiled_exp['blocks'][0]['blocks'][2]['runIf']['permutation'] == 0

def test_compile_resources():
    with make_experiment(IDGenerator()):
        p1 = Page('hi',
                resources = [
                    'cats.jpg',
                    Resource('dogs.ogg', media_type = 'video', autoplay = True, controls = False, required = True),
                    'elephants.mp4',
                    SampleFrom('animals')])
        exp = Experiment(
                blocks = [
                    Block(
                        pages = [p1],
                        banks = {'animals': ['giraffe.jpg']})])
        json_exp = exp.to_JSON()
        compiled_exp = json.loads(json_exp)
        resources = compiled_exp['blocks'][0]['pages'][0]['resources']
        assert resources[0] == {u'source': u'cats.jpg', u'mediaType': None, u'controls': True, u'autoplay': False, u'required': False}
        assert resources[1] == {u'source': u'dogs.ogg', u'mediaType': u'video', u'controls': False, u'autoplay': True, u'required': True}
        assert resources[2] == {u'source': u'elephants.mp4', u'mediaType': None, u'controls': True, u'autoplay': False, u'required': False}
        assert resources[3] == {u'sampleFrom': u'animals', u'variable': 0}
