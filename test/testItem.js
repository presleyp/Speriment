var pgsA = [{text:"page1", id:"p1", options:[{id: "o1", text: "A"}, {id:'o2', text:"B"}] },
    {text:"page2", id:"p2", options:[{id: "o3", text: "A"}, {id:'o4', text:"B"}]}];
var pgsB = [{text:"page3", id:"p3", options:[{id: "o5", text: "A", correct: true}, {id:'o6', text:"B", correct: false}]},
    {text:"page4", id:"p4", options:[{id: "o7", text: "A", correct: true}, {id:'o8', text:"B", correct: false}]}];


test('items keep pages in order', function(){
    var ps = [{id: 'p1', 'text': 'hi'}, {id: 'p2', 'text': 'there'}];
    var jsonItem = {id: 'i1', pages: ps};
    _.times(10, function(){
        var item = new Item(jsonItem, {});
        strictEqual(item.contents[0].id, 'p1');
    });
});

test('items run pages', function(){
    Experiment.addElements();
    var ps = [{id: 'p1', 'text': 'hi'}, {id: 'p2', 'text': 'there'}];
    var jsonItem = {id: 'i1', pages: ps};
    var b = new InnerBlock({id: 'b', items: [jsonItem]}, fakeContainer);
    var er = new ExperimentRecord();
    b.run(er);
    strictEqual($("#pagetext:contains('hi')").length, 1, "question text should display");
    clickNext();
    strictEqual($("#pagetext:contains('there')").length, 1, "question text should display");
    cleanUp();
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

test('run items conditionally: when condition is unsatisfied', function(){
    Experiment.addElements();
    var b1 = new InnerBlock({id: 'b1',
      items: [{id: 'i1', pages: pgsA},
      {id: 'i2', pages: pgsB, runIf: {pageID: 'p1', optionID: 'o1'}}]},
      fakeContainer);
    b1.contents = _.sortBy(b1.contents, 'id'); // force i1 to come first
    var er = new ExperimentRecord();
    b1.run(er);
    // i1 p1
    $(":input[id='o2']").prop("checked", true);
    clickNext();
    // i1 p2
    throws(clickNext, CustomError, "Item 2 doesn't run, so advancing calls container's run");
    cleanUp();
});

test('run items conditionally: when condition is satisfied', function(){
    Experiment.addElements();
    var b1 = new InnerBlock(
      {id: 'b1', items: [
        {id: 'i1', pages: pgsA},
        {id: 'i2', pages: pgsB, runIf: {pageID: 'p1', optionID: 'o1'}}
      ]},
      fakeContainer);
    b1.contents = _.sortBy(b1.contents, 'id'); // force i1 to come first
    var er = new ExperimentRecord();
    b1.run(er);
    // i1 p1 displays
    strictEqual($("#pagetext:contains('page1')").length, 1, "question text should display");
    $(":input[id='o1']").prop("checked", true);
    clickNext();
    // i1 p2 displays
    strictEqual($("#pagetext:contains('page2')").length, 1, "question text should display");
    clickNext();
    // i2 p1 displays
    strictEqual($("#pagetext:contains('page3')").length, 1, "question text should display");
    clickNext();
    // i2 p2 displays
    strictEqual($("#pagetext:contains('page4')").length, 1, "question text should display");
    throws(clickNext, CustomError, "advancing calls container's run");
    cleanUp();
});

test('display options conditionally: when condition is satisfied', function(){
    Experiment.addElements();
    var p1 = {id: 'p1', options: [{id: 'o1', text: 'a'}, {id: 'o2', text: 'b'}]};
    var p2 = {id: 'p2', options: [{id: 'o3', text: 'c'}, {id: 'o4', text: 'd', runIf: {pageID: 'p1', optionID: 'o1'}}]};
    var b1 = new InnerBlock({id: 'b', items: [{id: 'i', pages: [p1]}, {id: 'i2', pages: [p2]}]}, fakeContainer);
    var er = new ExperimentRecord();
    b1.run(er);
    $(":input[id='o2']").prop("checked", true);
    clickNext();
    strictEqual($(":input[id='o4']").length, 0, "option doesn't appear because o1 wasn't chosen");
    cleanUp();
});

test('display options conditionally: when condition is satisfied', function(){
    Experiment.addElements();
    var p1 = {id: 'p1', options: [{id: 'o1', text: 'a'}, {id: 'o2', text: 'b'}]};
    var p2 = {id: 'p2', options: [{id: 'o3', text: 'c'}, {id: 'o4', text: 'd', runIf: {pageID: 'p1', optionID: 'o1'}}]};
    var b1 = new InnerBlock({id: 'b', items: [{id: 'i', pages: [p1, p2]}]}, fakeContainer);
    var er = new ExperimentRecord();
    b1.run(er);
    $(":input[id='o1']").prop("checked", true);
    clickNext();
    strictEqual($(":input[id='o4']").length, 1, 'option appears because o1 was chosen');
    cleanUp();
});
