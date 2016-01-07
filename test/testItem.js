test('items keep pages in order', function(){
    var ps = [{id: 'p1', 'text': 'hi'}, {id: 'p2', 'text': 'there'}];
    var jsonItem = {id: 'i1', pages: ps};
    _.times(10, function(){
        var item = new Item(jsonItem, {});
        strictEqual(item.contents[0].id, 'p1');
    });
});

test('items get page condition', function(){
    var ps = [{id: 'p1', 'text': 'hi', condition: 'red'}, {id: 'p2', 'text': 'there'}];
    var jsonItem = {id: 'i1', pages: ps};
    var item = new Item(jsonItem, {});
    strictEqual(item.condition, 'red');
});

test('items can have own condition', function(){
    var ps = [{id: 'p1', 'text': 'hi', condition: 'red'}, {id: 'p2', 'text': 'there'}];
    var jsonItem = {id: 'i1', pages: ps, condition: 'blue'};
    var item = new Item(jsonItem, {});
    strictEqual(item.condition, 'blue');
});
