
var fakeContainer = {version: 0, permutation: 0, run: function(){throw new CustomError("I advanced");}, containerIDs: []};
var fakePsiTurk = {recordTrialData: function(){throw new CustomError("Would save data here");}};

function cleanUp(){
    $('#experimentDiv').remove();
}

test("sampleFromBank", function(){
    var parent = {banks: {bank1: [{'s': 'apple', 'p': 'apples'}, {'s': 'tree', 'p': 'trees'}]}};
    var prop = {sampleFrom: 'bank1', variable: 0, field: 's'};
    var sampled = sampleFromBank(parent, prop);
    strictEqual(sampled, 'apple', 'sample from bank with variable and field');
});

test("setText", function(){
  var block = {banks: {'bank1': ['a', 'b']}};
  var text = 'hi';
  strictEqual(setText(text, block), 'hi', 'simple text set correctly');

  var sampleText = {sampleFrom: 'bank1'};
  ok(_.contains(['a', 'b'], setText(sampleText, block)), 'sampled text set correctly');

  var arrayText = ['hi', 'there'];
  strictEqual(setText(arrayText, block), 'hithere', 'array text');

  var sampleArray = [{sampleFrom: 'bank1'}, {sampleFrom: 'bank1'}];
  ok(_.contains(['ab', 'ba', 'aa', 'bb'], setText(sampleArray, block)), 'sampled array');

  var mixedArray = [{sampleFrom: 'bank1'}, ' is chosen randomly'];
  ok(_.contains(['a is chosen randomly', 'b is chosen randomly'], setText(mixedArray, block)), 'mixed array');
});

test("sample resources", function(){
    Experiment.addElements();
    var jsonq = {'text': 'hi',
        id: 'q1',
        resources: [
          {source: 'resource1.jpg', mediaType: null, controls: true},
          {sampleFrom: 'resourcebank', variable: 0}],
        options: [
            {text: 'option1', id: 'o1', resources: [{sampleFrom: 'optionresource'}]}]};
    var block = {
      id: 'b',
      pages: [jsonq],
      banks:
        {resourcebank: [{source: 'r2.mp3', mediaType: null, controls: false}],
         optionresource: ['r3.mp3']}};

    var b = new InnerBlock(block, fakeContainer);
    b.run();

    var image1 = new Image();
    image1.src = 'resource1.jpg';
    image1.alt = 'resource1.jpg';
    ok($('div#resourceDiv img')[0].isEqualNode(image1), 'unsampled resource made correctly');

    var audio1 = new Audio();
    audio1.src = 'r2.mp3';
    audio1.controls = false;
    audio1.autoplay = true; // automatic when controls are off
    audio1.preload = 'auto';
    ok($('div#resourceDiv audio')[0].isEqualNode(audio1), 'sampled resource made correctly');

    var audio2 = new Audio();
    audio2.src = 'r3.mp3';
    audio2.preload = 'auto';
    audio2.controls = true;
    ok($('div.response audio')[0].isEqualNode(audio2), 'sampled resource made correctly');

    cleanUp();
});


test("getRow", function(){
    var prop = {sampleFrom: 'bank1'};
    var propV = {sampleFrom: 'bank1', variable: 1};
    var propNV = {sampleFrom: 'bank1', notVariable: 1};
    var bank1 = ['zero', 'one'];
    var bank2 = [{'s': 'apple', 'p': 'apples'}, {'s': 'tree', 'p': 'trees'}];
    var randomResult = getRow(prop, bank1);
    ok(randomResult.length > 0, 'grabs a row');
    strictEqual(getRow(propV, bank1), 'one', 'grabs correct row with variable');
    strictEqual(getRow(propNV, bank1), 'zero', 'grabs correct row with notVariable');
    var randomObj = getRow(prop, bank2);
    ok(randomObj.s.length > 0, 'grabs a row with object bank');
    strictEqual(getRow(propV, bank2).s, 'tree', 'grabs correct row with variable from object bank');
    strictEqual(getRow(propNV, bank2).s, 'apple', 'grabs correct row with notVariable from object bank');
});

test("shuffle banks", function(){
    //operates in place but I assign to the result so I need to test the return value
    var b = {};
    var sb = shuffleBanks(b);
    ok(_.isEmpty(sb) && _.isObject(sb), "shuffle banks should work on empty object");
    var c = {'bank1': ['one', 'two'], 'bank2': ['three', 'four', 'five']};
    var sc = shuffleBanks(c);
    strictEqual(sc.bank1.length, 2, 'shuffle banks should keep first list intact');
    strictEqual(sc.bank2.length, 3, 'shuffle banks should keep second list intact');
    var d = {'bank1': ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']};
    var sd = shuffleBanks(d);
    notEqual(sd.bank1, ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k'], 'shuffle banks should shuffle');
});

test("sampling without replacement", function(){
    var jsonb = {id: 'b1', pages: [
        {id: 'p1', text: {sampleFrom: 'ps', variable: 0}},
        {id: 'p2', text: {sampleFrom: 'ps', variable: 1}},
        {id: 'p3', text: {sampleFrom: 'ps', variable: 2}}],
        banks: {'ps': ['one', 'two', 'three']}};
    var b = new InnerBlock(jsonb, fakeContainer);
    var texts = _.pluck(b.contents, 'text');
    strictEqual(_.unique(texts).length, 3, 'sampling is without replacement');
});

test("sampling from outer block", function(){
    var jsonb = {id: 'b1', pages: [{id: 'p1', text: {sampleFrom: 'ps', variable: 0}}, {id: 'p2', text: {sampleFrom: 'ps', variable: 1}},
        {id: 'p3', text: {sampleFrom: 'ps', variable: 2}}]};
    var jsonb2 = {id: 'b2', pages: [{id: 'p4', text: {sampleFrom: 'ps', variable: 3}}, {id: 'p5', text: {sampleFrom: 'ps', variable: 4}},
        {id: 'p6', text: {sampleFrom: 'ps', variable: 5}}]};
    var outerb = {id: 'b3', blocks: [jsonb, jsonb2], banks: {'ps': ['one', 'two', 'three', 'four', 'five', 'six']}};
    var b = new OuterBlock(outerb, fakeContainer);
    var texts1 = _.pluck(b.contents[0].contents, 'text');
    var texts2 = _.pluck(b.contents[1].contents, 'text');
    strictEqual(_.unique(_.union(texts1, texts2)).length, 6, 'sampling is without replacement');
});

test("sampling from outer block with fields", function(){
    var jsonb = {id: 'b1', pages: [{id: 'p1', text: {sampleFrom: 'ps', variable: 0, field: 'a'}}, {id: 'p2', text: {sampleFrom: 'ps', variable: 1, field: 'a'}},
        {id: 'p3', text: {sampleFrom: 'ps', variable: 2, field: 'a'}}]};
    var jsonb2 = {id: 'b2', pages: [{id: 'p4', text: {sampleFrom: 'ps', variable: 0, field: 'b'}}, {id: 'p5', text: {sampleFrom: 'ps', variable: 1, field: 'b'}},
        {id: 'p6', text: {sampleFrom: 'ps', variable: 2, field: 'b'}}]};
    var outerb = {id: 'b3', blocks: [jsonb, jsonb2], banks: {'ps': [{'a': 'one', 'b': 'two'}, {'a': 'three', 'b': 'four'}, {'a': 'five', 'b': 'six'}]}};
    var b = new OuterBlock(outerb, fakeContainer);
    var texts1 = _.pluck(b.contents[0].contents, 'text');
    var texts2 = _.pluck(b.contents[1].contents, 'text');
    strictEqual(_.unique(_.union(texts1, texts2)).length, 6, 'sampling is without replacement');
});


test("create inner block", function(){
    Experiment.addElements();
    var jsonb = {id: "b1", pages:[{text:"one", id:"p1"}, {text:"two", id:"p2", freetext: true, options: [{id: "o1"}]}]};
    var b = new InnerBlock(jsonb, fakeContainer);
    strictEqual(b.contents.length, 2, "are pages initialized properly?");
    _.each(b.contents, function(p){
        if (p.id === "p1"){
            ok(p instanceof Statement, "should be a Statement");
        } else {
            ok(p instanceof Question, "should be a Question");
        }
    });
    strictEqual(b.runIf.shouldRun({}), true, "runIf defaults to returning true");
    var er = new ExperimentRecord();
    strictEqual(b.runIf.shouldRun(er), true, "shouldRun not defaulting to true");
    jsonb.runIf = {"pageID": "p2", "optionID": "o3"};
    var b2 = new InnerBlock(jsonb, fakeContainer);
    strictEqual(b2.runIf.optionID, "o3", "runIf not set properly");
    // er.addRecord({pageID: 'p2', 'blockID': 'b1', 'startTime': 0, 'endTime': 0, 'selected': ['o1'], 'correct': 'o1'});
    // strictEqual(b2.runIf.shouldRun(er), false, "shouldRun not working");
    var jsongroup = {id: "b1", groups:[[{text: "page1", id: "p1"}, {text:"page2", id:"p2", options: [{id: "o1"}]}]]};
    var b3 = new InnerBlock(jsongroup, {version: 0, containerIDs: []});
    strictEqual(b3.contents.length, 1, "initialization from groups");
    _.each(b3.contents, function(p){
        if (p.id === "p1"){
            ok(p instanceof Statement, "should be a Statement");
        } else {
            ok(p instanceof Question, "should be a Question");
        }
    });
    cleanUp();
});

test("choosing pages", function(){
    var grps = _.map(_.range(6), function(i){
                                    return _.map(_.range(3), function(j){
                                                          return {text: "page "+(i*10 + j).toString(), id: (i*10+j).toString(), condition: j.toString()};
                                                      }
                                          );
                                 }
                    );
    var jsonb = {id: "b1", groups: grps};
    var b = new InnerBlock(jsonb, {version: 0, containerIDs: []});
    strictEqual(b.contents.length, 6, "did it choose one page per group?");
    var choices = (_.map(_.range(10), function(i){
            var bl = new InnerBlock(jsonb, {version: 0, containerIDs: []});
            return _.pluck(bl.contents, "id");
        }));
    ok(_.each(_.range(18), function(id){return _.contains(_.flatten(choices), id.toString());}), "no page is systematically avoided in random sampling");

    jsonb.latinSquare = true;
    var b2 = new InnerBlock(jsonb, {version: 0, containerIDs: []});
    var b3 = new InnerBlock(jsonb, {version: 1, containerIDs: []});
    var b4 = new InnerBlock(jsonb, {version: 2, containerIDs: []});
    strictEqual(b2.latinSquare, true, "latin square variable getting set");
    strictEqual(b2.contents.length, 6, "did it choose one page per group with latinSquare set to true?");
    var condgroups = _.groupBy(b2.contents, "condition");
    ok(_.every(condgroups, function(g){return g.length === 2;}), "check latin square");
    var chosen2 = _.pluck(b2.contents, 'id');
    var chosen3 = _.pluck(b3.contents, 'id');
    var chosen4 = _.pluck(b4.contents, 'id');
    ok(_.isEmpty(_.intersection(chosen2, chosen3)), "different versions of latin square should choose different pages.");
    ok(_.isEmpty(_.intersection(chosen3, chosen4)), "different versions of latin square should choose different pages.");
    ok(_.isEmpty(_.intersection(chosen2, chosen4)), "different versions of latin square should choose different pages.");
    strictEqual(b3.contents.length, 6, "each version of latin square should have one page from each group.");
    strictEqual(b4.contents.length, 6, "each version of latin square should have one page from each group.");
    var condgroups3 = _.groupBy(b3.contents, "condition");
    var condgroups4 = _.groupBy(b4.contents, "condition");
    ok(_.every(condgroups3, function(g){return g.length === 2;}), "check latin square");
    ok(_.every(condgroups4, function(g){return g.length === 2;}), "check latin square");
});

test("test latin square", function(){
    var gps = [[{id: '1a', text: '1a'}, {id: '1b', text: '1b'}], [{id: '2a', text: '2a'}, {id: '2b', text: '2b'}]];
    var b1 = new InnerBlock({id: 'b1', groups: gps, latinSquare: true}, {version: 0, containerIDs: []});
    var ids = _.pluck(b1.contents, 'id');
    ids.sort();
    ok(_.isEqual(ids, ['1a', '2b']), 'Latin Square should work on version 0.');
    var b2 = new InnerBlock({id: 'b2', groups: gps, latinSquare: true}, {version: 1, containerIDs: []});
    var ids2 = _.pluck(b2.contents, 'id');
    ids2.sort();
    ok(_.isEqual(ids2, ['1b', '2a']), 'Latin Square should work on version 1.');

    var jb3 = {
            "latinSquare": true, 
            "groups": [
                [
                    {
                        "text": "1A", 
                        "id": "15"
                    }, 
                    {
                        "text": "1B", 
                        "id": "16"
                    }
                ], 
                [
                    {
                        "text": "2A", 
                        "id": "17"
                    }, 
                    {
                        "text": "2B", 
                        "id": "18"
                    }
                ]
            ], 
            "id": "19"
        };
    var b3 = new InnerBlock(jb3, {version: 0, containerIDs: []});
    ok(_.isEqual(_.pluck(b3.contents, 'text').sort(), ['1A', '2B']), 'latin square should work on excerpt from example JSON');
});

test("ordering pages", function(){
    // groups with three conditions each, in the same order
    var grps = _.map(_.range(6), function(i){
                                    return _.map(_.range(3), function(j){
                                                          return {text: "page "+(i*10 + j).toString(), id: (i*10+j).toString(), condition: j.toString()};
                                                      }
                                          );
                                 }
                    );
    var jsonb = {id: "b1", groups: grps, latinSquare: true};
    var firstconditions = _.map(_.range(20), function(){
        var b = new InnerBlock(jsonb, fakeContainer);
        var conditions = _.pluck(b.contents, "condition");
        return conditions[0];
    });
    strictEqual(_.unique(firstconditions).length, 3, "any condition should be able to end up first (but randomness means this will fail occasionally)");

    jsonb.pseudorandom = true;
    var b2 = new InnerBlock(jsonb, fakeContainer);
    var contentLengths = [];
    var firstconditions2 = _.map(_.range(20), function(){
        var b = new InnerBlock(jsonb, fakeContainer);
        var conditions = _.pluck(b.contents, "condition");
        contentLengths.push(conditions.length);
        return conditions[0];
    });

    ok(_.every(contentLengths, function(l){return l === 6;}), 'pseudorandomize should not change number of pages');
    strictEqual(_.unique(firstconditions2).length, 3, "any condition should be able to end up first (but this is random)");
    var adjacentconditions = _.zip(b2.contents, _.rest(b2.contents));
    var clashes = _.filter(adjacentconditions, function(pair){return pair[0] === pair[1];});
    strictEqual(clashes.length, 0, "no two adjacent conditions should be the same when pseudorandomized (deterministic)");
});


function clickNext(){$(":button").trigger("click");}
function CustomError( message ) {
    this.message = message;
}

CustomError.prototype.toString = function() {
    return this.message;
};



test("statement calling container's run", function(){
    Experiment.addElements();
    var pgs = [{text:"page1", id:"p1"}, {text:"page2", id:"p2"}];
    var b = new InnerBlock({id:"b1", pages: pgs} , fakeContainer);
    var er = new ExperimentRecord();
    b.run(er);

    // first statement displays
    var text1 = $("#pagetext").text();
    var id1 = b.oldContents[0].id;
    notEqual(text1, "", "statement should display");
    strictEqual($(":button").length, 1, "there should be a next button");

    /* based on old method of tracking answers
    strictEqual($("form").length, 1, 'there should be a form');
    strictEqual($("#surveyman").length, 1, 'there should be a hidden input with id surveyman');
    strictEqual(JSON.parse($("#surveyman").val()).responses.length, 0, 'form should be empty');
    strictEqual(er.responseGiven({pageID: 'p1', optionID: 'o1'}), false, 'answer o1 should not have been recorded');
    */
    clickNext();

    var rec = er.trialRecords[id1][0];
    strictEqual(_.keys(er.trialRecords).length, 1, 'only one page recorded so far');
    strictEqual(er.trialRecords[id1].length, 1, 'only one iteration recorded so far');
    strictEqual(rec.blockIDs[0], b.id, 'block id recorded');
    ok(_.contains([pgs[0].id, pgs[1].id], rec.pageID), 'id recorded');
    ok(_.contains([pgs[0].text, pgs[1].text], rec.pageText), 'text recorded');
    ok(rec.startTime, 'start time recorded');
    ok(rec.endTime, 'end time recorded');
    ok(rec.startTime < rec.endTime, 'start time is before end time');

    // second statement displays
    notEqual(text1, $("#pagetext").text(), "next statement should display after click");

    //entries = JSON.parse($("#surveyman").val()).responses;

    // out of pages so Next should call Page's run which will call Block's run which will call its
    // container's run, which is here set to throw an error
    throws(clickNext, CustomError, "at end of block, block's container's run should be called");

    ok(_.has(er.trialRecords, "p1"), "p1 should be logged in experiment record");
    ok(_.has(er.trialRecords, "p2"), "p2 should be logged in experiment record");
    cleanUp();
});

test("question calling run", function(){
    Experiment.addElements();
    var pgs = [{text:"page1", id:"p1", freetext: true, options:[{id: "o1", correct:"some text"}] },
        {text:"page2", id:"p2", freetext: true, options:[{id:"o1", correct: "some text"}] }];
    var b = new InnerBlock({id:"b1", pages: pgs}, fakeContainer);
    var er = new ExperimentRecord();
    b.run(er);

    var text1 = $("#pagetext").text();
    var id1 = b.oldContents[0].id;
    notEqual(text1, "", "question text should display");
    // strictEqual($(":button").prop("disabled"), true, "next button should be disabled");
    // strictEqual($("#continue").prop("disabled"), true, "next button should be disabled");

    // currently displayed page is at end of block's oldContents now
    var oid = b.oldContents[0].options[0].id;

    strictEqual($("#"+oid).val(), '', "text box should be empty");
    strictEqual($(".response input").val(), '', "text box should be empty");
    strictEqual(b.oldContents[0].options[0].selected(), false, "option should know it's unselected");

    // strictEqual($(":button").prop("disabled"), true, "next button should be disabled");

    $("#"+oid).val('some text');
    // Next is disabled because nothing is selected and no change has been triggered, but triggering
    // click can override it
    clickNext();

    var rec = er.trialRecords[id1][0];
    strictEqual(_.keys(er.trialRecords).length, 1, 'only one page recorded so far');
    strictEqual(er.trialRecords[id1].length, 1, 'only one iteration recorded so far');
    strictEqual(rec.blockIDs[0], b.id, 'block id recorded');
    strictEqual(id1, rec.pageID, 'id recorded');
    strictEqual(text1, rec.pageText, 'text recorded');
    ok(rec.startTime, 'start time recorded');
    ok(rec.endTime, 'end time recorded');
    ok(rec.startTime < rec.endTime, 'start time is before end time');
    strictEqual(rec.selectedID[0], "o1", 'question should record the id of the text box');
    strictEqual(rec.selectedPosition[0], 0, 'question should record the position of the text box');
    strictEqual(rec.optionOrder[0], "o1", 'question should record the option order');
    strictEqual(rec.optionTexts[0], "", 'question should record the option texts');
    strictEqual(rec.selectedText[0], "some text", 'question should record the content of the text box');
    strictEqual(rec.correct[0], true, 'question should record whether the response was correct');

    // check displaying
    notEqual(text1, $("#pagetext").text(), "next question text should display after click");
    notEqual("", $("#pagetext").text(), "next question text should display after click");
    strictEqual($(".response input").val().length, 0, "text box should be empty");
    strictEqual(b.oldContents[1].options[0].selected(), false, "option should know it's unselected");

    $(".response input").val('more text');

    strictEqual(b.oldContents[1].options[0].selected(), true, "option should know it's selected");

    throws(clickNext, CustomError, "at end of block, block's container's run should be called");

    cleanUp();
});

test("question with answer calling run", function(){
    Experiment.addElements();
    var pgs = [{text:"page1", id:"p1", freetext: true, options:[{id: "o1"}] , feedback:"good job" } ,
        {text:"page2", id:"p2", freetext: true, options:[{id:"o2"}] , feedback: "great job" }];
    var b = new InnerBlock({id:"b1", pages: pgs}, fakeContainer);
    var er = new ExperimentRecord();
    b.run(er);

    var text1 = $("#pagetext").text();
    var id1 = b.oldContents[0].id;
    strictEqual($("#pagetext:contains('page')").length, 1, "question text should display");

    $(":input[type='text']").val("hi");
    clickNext();

    var text2 = $("#pagetext").text();
    //check recording TODO
    /*
    var entries = JSON.parse($("#surveyman").val()).responses;
    strictEqual(entries.length, 1, 'form should have one entry');
    strictEqual(entries[0].page, b.oldContents[0].id, 'question should record its id');
    ok(entries[0].startTime, 'question should record its start time');
    ok(entries[0].endTime, 'question should record its end time');
    ok(entries[0].startTime <= entries[0].endTime, 'start time should be before end time');
    strictEqual(entries[0].selected[0], "hi", 'question should record the content of the text box');
    strictEqual(entries[0].correct[0], null, 'question should record null when no correct answer was supplied');
    */

    strictEqual($("#pagetext:contains('job')").length, 1, "answer should display after click");

    clickNext();

    var rec = er.trialRecords[id1 + '_feedback'][0];
    strictEqual(_.keys(er.trialRecords).length, 2, 'two pages recorded so far');
    strictEqual(er.trialRecords[id1].length, 1, 'only one iteration recorded so far');
    strictEqual(rec.blockIDs[0], b.id, 'block id recorded');
    strictEqual(id1 + '_feedback', rec.pageID, 'id recorded');
    strictEqual(text2, rec.pageText, 'text recorded');
    ok(_.contains(rec.pageText, 'j'), 'feedback text recorded');
    ok(rec.startTime, 'start time recorded');
    ok(rec.endTime, 'end time recorded');
    ok(rec.startTime < rec.endTime, 'start time is before end time');

    notEqual(text1, $("#pagetext").text(), "next question text should display after click");
    strictEqual($("#pagetext:contains('page')").length, 1, "next question text should display after click");

    $(":input[type='text']").val("hello");
    $(":input[type='text']").trigger("keyup");
    clickNext();

    strictEqual($("#pagetext:contains('job')").length, 1, "answer should display after click");

    //check recording TODO
    /*
    entries = JSON.parse($("#surveyman").val()).responses;
    strictEqual(entries.length, 3, 'form should have three entries');
    strictEqual(entries[2].page, b.oldContents[1].id, 'question should record its id');
    ok(entries[2].startTime, 'question should record its start time');
    ok(entries[2].endTime, 'question should record its end time');
    ok(entries[2].startTime < entries[2].endTime, 'start time should be before end time');
    strictEqual(entries[2].selected[0], "hello", 'question should record the content of the text box');
    strictEqual(entries[2].correct[0], null, 'question should record null when no correct answer was supplied');
    */

    throws(clickNext, CustomError, "at end of block, block's container's run should be called");
    cleanUp();

});

test("question with options with answers calling run", function(){
    Experiment.addElements();
    var pgs = [{text:"page1", id:"p1", options:[{id: "o1", text: "a", feedback: "good job"}, {id:'o2', text:'b', feedback:'not quite'} ] , } ,
        {text:"page2", id:"p2", options:[{id: "o1", text: "a", feedback: "good job"}, {id:'o2', text:'b', feedback:'not quite'}] }];
    var b = new InnerBlock({id:"b1", pages: pgs}, fakeContainer);

    var er = new ExperimentRecord();
    b.run(er);

    var text1 = $("#pagetext").text();
    strictEqual($("#pagetext:contains('page')").length, 1, "question text should display");
    strictEqual($(".response input").length, 2, 'option buttons should display');
    strictEqual($(".response label").length, 2, 'option labels should display');

    $(":input[id='o1']").prop("checked", true);
    clickNext();
    strictEqual($("#pagetext").text(), "good job", "answer should display after click");

    clickNext();

    notEqual(text1, $("#pagetext").text(), "next question text should display after click");
    strictEqual($("#pagetext:contains('page')").length, 1, "next question text should display after click");

    throws(clickNext, CustomError, "at end of block, block's container's run should be called");
    cleanUp();
});

var pgs = [{text:"page1", id:"p1", options:[{id: "o1", text: "A", feedback:"good job"}, {id:'o2', text:"B", feedback: 'no'}] },
    {text:"page2", id:"p2", options:[{id: "o3", text: "A", feedback: 'great job'}, {id:'o4', text:"B", feedback: 'not quite'}]}];
var pgs2 = [{text:"page3", id:"p3", options:[{id: "o5", text: "A", correct: true}, {id:'o6', text:"B", correct: false}], feedback: "the correct feedback was o5" },
    {text:"page4", id:"p4", options:[{id: "o7", text: "A", correct: true}, {id:'o8', text:"B", correct: false}], feedback: "great job either way" }];
var pgs3 = [{text:"page5", id:"p5", options:[{id: "o9", text: "A"}, {id:'o10', text:"B"}] , feedback: "good job" },
    {text:"page6", id:"p6", options:[{id: "o11", text: "A"}, {id:'o12', text:"B"}], feedback: "great job" }];
var pgs4 = [{text:"page8", id:"p8", options:[{id: "o13", text: "A"}, {id:'o14', text:"B"}] , feedback: "good job" },
    {text:"page9", id:"p9", options:[{id: "o15", text: "A"}, {id:'o16', text:"B"}], feedback: "great job" }];

var jsons = {blocks:[
    { id:'b1', pages: pgs },
    { id:'b2', exchangeable: ['b3', 'b4'], blocks: [
        { id:'b3', pages: pgs2 },
        { id:'b4', pages: pgs3 }
    ]}
] };

test('create outerblock', function(){
    Experiment.addElements();
    var jsonb = {id:'b1', blocks:[
            { id:'b3', pages: pgs2 },
            { id:'b4', pages: pgs3 }
            ]};
    var b = new OuterBlock(jsonb, fakeContainer);
    strictEqual(b.id, 'b1', 'block id should be set');
    strictEqual(b.exchangeable.length, 0, 'exchangeable default should be set');
    strictEqual(b.runIf.shouldRun(), true, 'runIf default should be set');
    strictEqual(b.contents.length, 2, 'contents should be set');
    ok(b.contents[0] instanceof InnerBlock, 'contents should be InnerBlock');

    jsonb2 = $.extend(true, {}, jsonb);
    jsonb2.exchangeable = ['b3', 'b4'];
    var b2 = new OuterBlock(jsonb2, fakeContainer);
    deepEqual(b2.exchangeable, ['b3', 'b4'], 'exchangeable should be set when passed in');

    jsonb2.runIf = {'pageID': 'p1', 'optionID': 'o1'};
    var b3 = new OuterBlock(jsonb2, fakeContainer);
    strictEqual(b3.runIf.optionID, 'o1', 'runIf should be set when passed in');

    b.run(new ExperimentRecord());
    //p3
    clickNext();
    clickNext();
    //p4
    clickNext();
    clickNext();
    //p5
    clickNext();
    clickNext();
    //p6
    clickNext();
    throws(clickNext, CustomError, "should call container's run");
    cleanUp();
});


test("create survey", function(){
    var s = new Experiment(jsons, 0, 0);

    strictEqual(s.contents.length, 2, "survey should have two blocks");
    ok(s.contents[0] instanceof InnerBlock, 'survey should detect that first block is inner block');
    ok(s.contents[1] instanceof OuterBlock, 'survey should detect that second block is outer block');
    strictEqual(s.exchangeable.length, 0, 'exchangeable should be set to default');
    strictEqual(s.counterbalance.length, 0, 'counterbalance should be set to default');
    // strictEqual(s.showBreakoff, false, 'showBreakoff should be set to default');

    cleanUp();
});

test("order blocks", function(){
    var b1 = new InnerBlock({id: 'b1', pages: pgs}, fakeContainer);
    var b2 = new OuterBlock({id: 'b2', blocks: [ {id: 'b3', pages: pgs2}, {id: 'b4', pages: pgs3} ] }, fakeContainer);
    var b3 = new InnerBlock({id: 'b5', pages: pgs4 }, fakeContainer);

    function testOrderBlocks(exchangeable){
        var blockOrders = _.map(_.range(15), function(i){
            return orderBlocks([b1, b2, b3], exchangeable, 0, []);
        });
        var blockIds = _.map(blockOrders, function(bo){
            return _.pluck(bo, 'id');
        });
        return blockIds;
    }

    var blockIds1 = testOrderBlocks([]);
    var matching1 = _.map(blockIds1, function(bi){
        return (bi[0] === 'b1') && (bi[1] === 'b2') && (bi[2] === 'b5');
    });
    strictEqual(_.compact(matching1).length, matching1.length, 'with no exchangeable blocks, block order should stay the same');

    var blockIds2 = testOrderBlocks(['b1']);
    var matching2 = _.map(blockIds2, function(bi){
        return (bi[0] === 'b1') && (bi[1] === 'b2') && (bi[2] === 'b5');
    });
    strictEqual(_.compact(matching2).length, matching2.length, 'with one exchangeable block (with nowhere to go), block order should stay the same');

    function moveTwo(move1, move2, fixed){
        var blockIds3 = testOrderBlocks([move1.id, move2.id]);
        var nonexchangeable = _.map(blockIds3, function(bi){
            return bi[fixed.index] === fixed.id;
        });
        var moveables = _.map(blockIds3, function(bi){
            return bi[move1.index] === move1.id;
        });
        strictEqual(_.compact(nonexchangeable).length, nonexchangeable.length, 'nonexchangeable block should always stay in place');
        notEqual(_.compact(moveables).length, moveables.length, 'exchangeable block should not always stay in place');
    }

    moveTwo({id: 'b1', index: 0}, {id: 'b2', index: 1}, {id: 'b5', index: 2});
    moveTwo({id: 'b1', index: 0}, {id: 'b5', index: 2}, {id: 'b2', index: 1});

    var allmoved = testOrderBlocks(['b1', 'b2', 'b5']);
    var firsts = _.map(allmoved, function(bi){return bi[0];});
    ok(_.isEmpty(_.difference(firsts, ['b1', 'b2', 'b5'])), "every block should appear first sometimes when they're all exchangeable");
});

test("counterbalancing: first permutation", function(){
    var b1 = new OuterBlock({id: 'b2', blocks: [
            {id: 'b3', pages: pgs2},
            {id: 'b4', pages: pgs3}
        ], counterbalance: ['b3', 'b4'] }, {containerIDs: [], permutation: 0});

    strictEqual(b1.contents[0].id, 'b3', 'b3 comes before b4 in first permutation');
    strictEqual(b1.contents[1].id, 'b4', 'blocks not duplicated');
    strictEqual(b1.contents.length, 2, "reordering doesn't affect length");
});

test("counterbalancing: second permutation", function(){
    var b1 = new OuterBlock({id: 'b2', blocks: [
            {id: 'b3', pages: pgs2},
            {id: 'b4', pages: pgs3},
            {id: 'b5', pages: pgs}
        ], counterbalance: ['b3', 'b4', 'b5'] }, {permutation: 1, containerIDs: []});

    strictEqual(b1.contents[0].id, 'b3', 'b3 comes first in second permutation');
    strictEqual(b1.contents[1].id, 'b5', 'b5 comes second');
    strictEqual(b1.contents[2].id, 'b4', 'b4 comes last');
    strictEqual(b1.contents.length, 3, "reordering doesn't affect length");
});

test("counterbalancing: no permutation", function(){
    var b1 = new OuterBlock({id: 'b2', blocks: [
            {id: 'b3', pages: pgs2},
            {id: 'b4', pages: pgs3}
        ], counterbalance: ['b3'] }, {permutation: 1, containerIDs: []});

    strictEqual(b1.contents[0].id, 'b3', 'no reordering if only one counterbalance block');
    strictEqual(b1.contents[1].id, 'b4', 'blocks not duplicated');
    strictEqual(b1.contents.length, 2, "reordering doesn't affect length");
});

test("counterbalancing and exchanging", function(){
    var b1 = new OuterBlock({id: 'b2', blocks: [
            {id: 'b3', pages: pgs2},
            {id: 'b4', pages: pgs3},
            {id: 'b5', pages: pgs},
            {id: 'b6', pages: pgs4}
        ], counterbalance: ['b3', 'b5'], exchangeable: ['b4', 'b6'] }, {permutation: 1, containerIDs: []});

    strictEqual(b1.contents[0].id, 'b5', 'b5 before b3 in permutation 1');
    strictEqual(b1.contents[2].id, 'b3', 'b3 should switch with b5');
    strictEqual(b1.contents.length, 4, "reordering doesn't affect length");
});

test('run blocks conditionally: when condition is satisfied', function(){
    // cleanUp();
    var b1 = {id: 'b1', pages: pgs};
    var b2 = {id: 'b2', pages: pgs2, runIf: {pageID: 'p1', optionID: 'o1'}};
    var runBoth = new Experiment({blocks: [b1, b2]}, 0, 0, fakePsiTurk);

    runBoth.start();
    // clickNext(); // breakoff notice
    strictEqual($('.response input').length, 2, "there should be two options");
    if ($("#o1").length === 1){
        $("#o1").prop('checked', true);
    } else {
        $("#o3").prop('checked', true);
    }
    clickNext(); // page 1
    clickNext(); // page 1 answer

    // $(".response input").prop('checked', true);
    if ($("#o1").length === 1){
        $("#o1").prop('checked', true);
    } else {
        $("#o3").prop('checked', true);
    }
    clickNext(); // page 2
    clickNext(); // page 2 answer

    ok($('#pagetext:contains("page")'), 'second block should run because o1 was chosen');

    $(".response input").prop('checked', true);
    clickNext(); // page 3
    clickNext(); // page 3 answer

    $(".response input").prop('checked', true);
    clickNext(); // page 4

    // page 4 answer
    throws(clickNext, CustomError, 'should try to save data');

    cleanUp();
});

test('run blocks conditionally: when text has been entered', function(){
    var textpage = {id: 'p1', freetext: true, options: [{id: 'o1'}]};
    var statement = {id: 'p2', text: 'page2'};
    var b1 = {id: 'b1', pages: [textpage]};
    var b2 = {id: 'b2', pages: [statement], runIf: {'pageID': 'p1', 'regex': 'hello'} };
    var runBoth = new Experiment({blocks: [b1, b2], breakoff: false}, 0);

    runBoth.start();
    strictEqual($('.response input').length, 1, 'text box shows');
    // give the desired answer
    $('#o1').val('hello');
    clickNext();
    // b2 should run
    ok(runBoth.experimentRecord.textMatch('p1', 'hello'), 'record should note that a matching response was given');
    strictEqual($('#pagetext').text(), 'page2', 'block 2 runs because hello was given as text answer');

    cleanUp();
});

test('run blocks conditionally: when condition is unsatisfied', function(){
    var b1 = {id: 'b1', pages: pgs};
    var b2 = {id: 'b2', pages: pgs2, runIf: {pageID: 'p1', optionID: 'o1'}};
    var runOne = new Experiment({blocks: [b2, b1]}, 0);
    runOne.start();

    clickNext();
    ok(_.contains(['page1', 'page2'], $('#pagetext').text()), 'b1 should run, skipping b2 because o1 has not been chosen');

    cleanUp();
});

test('run blocks conditionally: based on permutation', function(){
    var b1 = {id: 'b1', pages: pgs, runIf: {permutation: 0}};
    var b2 = {id: 'b2', pages: pgs2};

    var runOne = new Experiment({blocks: [b1, b2]}, 0, 1);
    runOne.start();
    ok(_.contains(['page3', 'page4'], $('#pagetext').text()), "b2 should run because b1's runIf is not satisfied");
    cleanUp();

    var runBoth = new Experiment({blocks: [b1, b2]}, 0, 0);
    runBoth.start();
    ok(_.contains(['page1', 'page2'], $('#pagetext').text()), 'b1 should run because its runIf is satisfied');
    cleanUp();
});

var ps = [{id: 'p1', text: 'page1', options: [{id: 'o1', text:'A', correct:true}, {id:'o2', text:'B', correct:false}]},
        {id: 'p2', text:'page2', options: [{id: 'o1', text:'A', correct:true}, {id:'o2', text:'B', correct:false}]}];
var ps2 = [{id: 'p3', text: 'page3', options: [{id: 'o1', text:'A'}, {id:'o2', text:'B'}]},
        {id: 'p4', text:'page4', options: [{id: 'o1', text:'A'}, {id:'o2', text:'B'}]}];


test('recording multiple iterations of the same question', function(){
    Experiment.addElements();
    var b1 = new InnerBlock({id: 'b1', pages: [ps[0], ps[0], ps[0]]}, {version: 0, containerIDs: []});
    var er = new ExperimentRecord();
    b1.run(er);
    $('#o1').prop('checked', true);
    clickNext();
    $('#o1').prop('checked', true);
    clickNext();
    strictEqual(er.trialRecords.p1.length, 2, 'Should be two records in the list with index "p1"');
    strictEqual(er.trialRecords.p1[0].iteration, 1, 'The first should be iteration 1');
    strictEqual(er.trialRecords.p1[1].iteration, 2, 'The second should be iteration 2');
    notEqual(er.trialRecords.p1[0].startTime, er.trialRecords.p1[1].startTime, 'The records should be distinct');
    cleanUp();
});

test('training block: whole number criterion not met', function(){
    Experiment.addElements();
    var b1 = new InnerBlock({id: 'b1', pages: ps, criterion: 2, cutoff: 5}, fakeContainer);
    var er = new ExperimentRecord();
    b1.run(er);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    ok($('#pagetext').text(), 'block should loop, displaying a page again, because only one answer was right');
    cleanUp();
});

test('outer training block: whole number criterion not met', function(){
    Experiment.addElements();
    var b1 = {id: 'b1', pages: ps, criterion: 2, cutoff: 5};
    var b2 = new OuterBlock({id: 'b2', blocks: [b1]}, fakeContainer);
    var er = new ExperimentRecord();
    b2.run(er);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    ok($('#pagetext').text(), 'block should loop, displaying a page again, because only one answer was right');
    cleanUp();
});

test('training block: whole number criterion met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b2 = new InnerBlock({id: 'b2', pages: ps, criterion: 2, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('outer training block: whole number criterion met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b1 = {id: 'b1', pages: ps};
    var b2 = new OuterBlock({id: 'b2', blocks: [b1], criterion: 2, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('outer training block with inner ungraded block: whole number criterion met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b1 = {id: 'b1', pages: ps};
    var b3 = {id: 'b3', pages: ps2}; // no correctness info
    var b2 = new OuterBlock({id: 'b2', blocks: [b1, b3], criterion: 2, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose something
    $('#o1').prop('checked', true);
    clickNext();
    // choose something
    $('#o1').prop('checked', true);
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('outer training block with inner ungraded block: whole number criterion not met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b1 = {id: 'b1', pages: ps};
    var b3 = {id: 'b3', pages: ps2}; // no correctness info
    var b2 = new OuterBlock({id: 'b2', blocks: [b1, b3], criterion: 2, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose something
    $('#o1').prop('checked', true);
    clickNext();
    // choose something
    $('#o1').prop('checked', true);
    clickNext();
    ok($('#pagetext').text(), 'block should loop, displaying a page again, because only one answer was right');
    cleanUp();
});

test('outer training block with inner training block: decimal criterion met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b1 = {id: 'b1', pages: ps, criterion: 2, cutoff: 5};
    var b2 = new OuterBlock({id: 'b2', blocks: [b1], criterion: 0.9, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // try again
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    // outer block is satisfied because it only cares about latest iteration
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('outer training block with inner training block: decimal criterion not met', function(){
    Experiment.addElements();
    var er2 = new ExperimentRecord();
    var b1 = {id: 'b1', pages: ps, criterion: 1, cutoff: 5};
    var b2 = new OuterBlock({id: 'b2', blocks: [b1], criterion: 0.9, cutoff: 5}, fakeContainer);
    b2.run(er2);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // try again
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    ok($('#pagetext').text(), 'inner block is satisfied but outer block is not so it loops');
    cleanUp();
});

test('recording multiple iterations', function(){
    Experiment.addElements();
    var pgs = [{id: 'p1', text: 'page1', options: [{id: 'o1', text:'A', correct:true}, {id:'o2', text:'B', correct:false}]},
        {id: 'p2', text:'page2', options: [{id: 'o3', text:'C', correct:true}, {id:'o4', text:'D', correct:false}]}];

    var b1 = new InnerBlock({id: 'b1', pages: pgs, criterion: 0.9, cutoff: 5}, fakeContainer);
    var er = new ExperimentRecord();
    b1.run(er);

    // iter 1 - p1: o1
    if ($('#o1').length > 0){
        $('#o1').prop('checked', true);
    } else if ($('#o4').length > 0){
        $('#o4').prop('checked', true);
    } else {
        console.log('options are wrong');
    }
    clickNext();

    if ($('#o1').length > 0){
        $('#o1').prop('checked', true);
    } else if ($('#o4').length > 0){
        $('#o4').prop('checked', true);
    } else {
        console.log('options are wrong');
    }
    clickNext();

    // iter 2 - p1: o2
    if ($('#o2').length > 0){
        $('#o2').prop('checked', true);
    } else if ($('#o3').length > 0){
        $('#o3').prop('checked', true);
    } else {
        console.log('options are wrong');
    }
    clickNext();
    if ($('#o2').length > 0){
        $('#o2').prop('checked', true);
    } else if ($('#o3').length > 0){
        $('#o3').prop('checked', true);
    } else {
        console.log('options are wrong');
    }
    clickNext();

    var iterations = _.pluck(er.trialRecords.p1, 'iteration');
    var selected = _.pluck(er.trialRecords.p1, 'selectedID');
    var selected2 =  _.pluck(er.trialRecords.p2, 'selectedID');
    strictEqual(iterations[0], 1, 'both iterations of p1 are captured');
    strictEqual(iterations[1], 2, 'both iterations of p1 are captured');
    strictEqual(selected[0][0], 'o1', 'options ids recorded both times');
    strictEqual(selected[1][0], 'o2', 'options ids recorded both times');
    strictEqual(selected2[0][0], 'o4', 'options ids recorded both times');
    strictEqual(selected2[1][0], 'o3', 'options ids recorded both times');
    cleanUp();
});

test('recording multiple iterations, simpler version', function(){
    Experiment.addElements();
    var b1 = new InnerBlock({id: 'b1', pages: [ps[0]], criterion: 0.9, cutoff: 5}, fakeContainer);
    var er = new ExperimentRecord();
    b1.run(er);

    $('#o2').prop('checked', true);
    clickNext();

    $('#o2').prop('checked', true);
    clickNext();

    var iterations = _.pluck(er.trialRecords.p1, 'iteration');
    var selected = _.pluck(er.trialRecords.p1, 'selectedID');
    strictEqual(iterations[0], 1, 'both iterations of p1 are captured');
    strictEqual(iterations[1], 2, 'both iterations of p1 are captured');
    strictEqual(selected[0][0], 'o2', 'options ids recorded both times');
    strictEqual(selected[1][0], 'o2', 'options ids recorded both times');
    strictEqual(selected.length, 2, 'options ids recorded both times');
    cleanUp();
});


test('training block: whole number criterion met, feedback page', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var qa = [{id: 'p5', text: 'page1', options: [{id: 'o1', text:'A', correct:true, feedback:'good job'}, {id:'o2', text:'B', correct:false}]},
        {id: 'p6', text:'page2', options: [{id: 'o1', text:'A', correct:true, feedback:'good job'}, {id:'o4', text:'B', correct:false}]}];
    var bqa = new InnerBlock({id: 'b2', pages: qa, criterion: 2, cutoff: 5}, fakeContainer);
    bqa.run(er);
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // feedback displays
    clickNext();
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // feedback displays
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('training block: options with page feedback recorded properly', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var qa = [{id: 'p5', text: 'page1', options: [
            {id: 'o1', text:'A', correct:true, feedback: {id: 'f1', text:'good job'}},
            {id:'o2', text:'B', correct:false, feedback: {id: 'f2', text: 'sorry'}}
        ]},
        {id: 'p6', text:'page2', options: [
            {id: 'o3', text:'A', correct:true, feedback: {id: 'f3', text: 'good job'}},
            {id:'o4', text:'B', correct:false, feedback: {id: 'f4', text: 'not quite'}}
        ]}];
    var bqa = new InnerBlock({id: 'b2', pages: qa, criterion: 2, cutoff: 3}, fakeContainer);
    bqa.run(er);

    //iteration 1
    // choose wrong answer
    $('#o2').prop('checked', true);
    $('#o4').prop('checked', true);
    clickNext();
    //feedback
    clickNext();
    // choose wrong answer
    $('#o2').prop('checked', true);
    $('#o4').prop('checked', true);
    clickNext();
    //feedback
    clickNext();

    //iteration 2
    // choose wrong answer
    $('#o2').prop('checked', true);
    $('#o4').prop('checked', true);
    clickNext();
    //feedback
    clickNext();
    // choose wrong answer
    $('#o2').prop('checked', true);
    $('#o4').prop('checked', true);
    clickNext();
    //feedback
    clickNext();

    //check record
    strictEqual(er.trialRecords.f2.length, 2, 'Both iterations of f2 recorded');
    strictEqual(er.trialRecords.f4.length, 2, 'Both iterations of f4 recorded');

    cleanUp();
});

test('training block: decimal criterion not met', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var b3 = new InnerBlock({id: 'b3', pages: ps, criterion: 0.8, cutoff: 5}, fakeContainer);
    b3.run(er);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    ok($('#pagetext').text(), 'block should loop, displaying a page again, because only one answer was right');
    cleanUp();
});

test('training block: decimal criterion met', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var b4 = new InnerBlock({id: 'b4', pages: ps, criterion: 0.5, cutoff: 5}, fakeContainer);
    b4.run(er);
    // choose right answer
    $('#o1').prop('checked', true);
    clickNext();
    // choose wrong answer, but still good enough to meet criterion
    $('#o2').prop('checked', true);
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('training block: decimal criterion met on second try', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var b6 = new InnerBlock({id: 'b6', pages: ps, criterion: 0.5, cutoff: 5}, fakeContainer);
    b6.run(er);
    //choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //should continue
    //choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose right answer
    $('#o1').prop('checked', true);
    throws(clickNext, CustomError, 'block finishes because criterion was met on the second round');
    cleanUp();
});

test('training block: decimal criterion met, no correctness info', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var ps3 = ps.concat([{id:'p3', text:'page3', options: [{id: 'o1', text:'A'}, {id:'o2', text:'B'}]}]);
    var b5 = new InnerBlock({pages: ps3, id:'b5', criterion: 0.5, cutoff: 5}, fakeContainer);
    var pageOrder = _.pluck(b5.contents, 'id');
    // choose right answer once and wrong answer on one graded page and one ungraded page
    // ungraded page doesn't affect metric
    var answers = _.map(pageOrder, function(p){return p === 'p2' ? '#o1' : '#o2';});

    b5.run(er);
    $(answers[0]).prop('checked', true);
    clickNext();
    $(answers[1]).prop('checked', true);
    clickNext();
    $(answers[2]).prop('checked', true);
    throws(clickNext, CustomError, "block finishes because criterion was met, so advancing calls container's run");
    cleanUp();
});

test('training block: cutoff ends looping', function(){
    Experiment.addElements();
    var er = new ExperimentRecord();
    var b3 = new InnerBlock({id: 'b3', pages: ps, criterion: 0.8, cutoff: 1}, fakeContainer);
    b3.run(er);
    // choose wrong answer
    $('#o2').prop('checked', true);
    clickNext();
    //choose right answer
    $('#o1').prop('checked', true);
    throws(clickNext, CustomError, "block finishes because cutoff was met even though criterion wasn't, so advancing calls container's run");
    cleanUp();

});

test('training shuffles pages and options', function(){
    Experiment.addElements();
    var sameFirstPages = [];
    var sameFirstOptions = [];
    var ps = [{id: 'p1', text: 'page1', options: [{id: 'o1', text:'A', correct:true}, {id:'o2', text:'B', correct:false}]},
        {id: 'p2', text:'page2', options: [{id: 'o1', text:'A', correct:true}, {id:'o2', text:'B', correct:false}]}];
    var er = new ExperimentRecord();

    _.map(_.range(20), function(){
        var b = new InnerBlock({id: 'b', pages: ps, criterion: 2, cutoff: 5}, fakeContainer);
        b.run(er);
        var firstPage1 = b.oldContents[0].id;
        var firstOption1 = b.oldContents[0].options[0].id;
        $('#o1').prop('checked', true);
        clickNext();
        $('#o2').prop('checked', true);
        clickNext();

        var firstPage2 = b.oldContents[0].id;
        var firstOption2 = b.oldContents[0].options[0].id;
        sameFirstPages.push(firstPage1 === firstPage2);
        sameFirstOptions.push(firstOption1 === firstOption2);
    });

    ok(_.contains(sameFirstPages, false), 'first page varies across loops over the block');
    ok(_.contains(sameFirstOptions, false), 'first option varies across loops over the block');
    cleanUp();
});
