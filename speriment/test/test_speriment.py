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
        print compiled_exp
        assert compiled_exp['blocks'][0]['blocks'][0]['runIf']['permutation'] == 0
        assert compiled_exp['blocks'][0]['blocks'][1]['runIf']['permutation'] == 1
        assert compiled_exp['blocks'][0]['blocks'][2]['runIf']['permutation'] == 0
