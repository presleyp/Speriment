from speriment import *

def test_new():
    with make_experiment(IDGenerator()):
        o = Option('a')
        o2 = o.new()
        assert o.id_str != o2.id_str

