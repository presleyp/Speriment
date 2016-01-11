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

def test_item():
    with make_experiment(IDGenerator()):
        p1 = Page(text = "hello")
        p2 = Page(text = "world")
        i1 = Item(pages = [p1, p2], condition = 'item_cond', tags = {'item_tag': 'has pages'})
        i2 = Item(text = "hello", condition = 'item_cond', tags = {'page_tag': 'has text'})
        b1 = Block(items = [i1, i2])
        exp = Experiment(blocks = [b1])
        json_exp = exp.to_JSON()
        compiled_exp = json.loads(json_exp)
        jb1 = compiled_exp['blocks'][0]
        ji1 = jb1['items'][0]
        ji2 = jb1['items'][1]
        assert len(ji1['pages']) == 2
        assert len(ji2['pages']) == 1
        assert ji1['condition'] == 'item_cond'
        assert ji2['condition'] == 'item_cond'
        assert ji1['pages'][0]['text'] == 'hello'
        assert ji2['pages'][0]['text'] == 'hello'
        assert ji1['tags']['item_tag'] == 'has pages'
        assert ji2['pages'][0]['tags']['page_tag'] == 'has text'
