test("statement initialization", function(){
    var jsonq = {"text": "Do I pass?", id: "q1"};
    var q = new Statement(jsonq, {});
    strictEqual(q.text, "Do I pass?", "statement text not set properly");
    strictEqual(q.isLast, undefined, "statement.isLast not set properly");
    strictEqual(q.id, "q1", "statment id not set properly");
    strictEqual(q.condition, null, "statement condition default not working");
    q.isLast = true;
    strictEqual(q.isLast, true, "statement.isLast not set properly");
    jsonq.condition = "a";
    var q2 = new Statement(jsonq, {});
    strictEqual(q2.condition, "a");
});

test("question initialization", function(){
    var jsonq = {"text": "some text", id: "q2", ordered: false, exclusive: false,
        options: [{text: "option A", id: "o1"},
            {text: "option B", id: "o2", branchTo: 3}]};
    var q = new Question(jsonq, {});
    strictEqual(q.text, "some text", "question text not set properly");
    strictEqual(q.id, "q2", "question id not set properly");
    strictEqual(q.ordered, false, "question.ordered not set properly");
    strictEqual(q.exclusive, false, "question.exclusive not overcoming default");
    strictEqual(q.freetext, false, "question.freetext default not working");
    strictEqual(q.options.length, 2, "question.options not set properly");
    ok(q.options[0].question instanceof Question, "question not sending right 'this' to options");
});

test("page with sampling", function(){
    var jsonq = {'text': {'sampleFrom': 'questions'}, id: 'q1', condition: {'sampleFrom': 'conds'},
        resources: ['resource1.jpg', {sampleFrom: 'resourcebank'}],
        options: [{text: {sampleFrom: 'optiontext'}, id: 'o1'}, {text: 'option2', id: 'o2', feedback: {sampleFrom: 'optionfeedback'}}]};
    var block = {'id': 'b', 'banks': {'questions': ['one', 'two'], 'conds': ['a', 'b', 'c'], 'resourcebank': ['r1.mp3', 'r2.mp3'],
    'optiontext': ['this', 'that'], 'optionfeedback': ['yes', 'no']}};
    var q = new Question(jsonq, block);
    // bank shuffling is done at the block level; pages always pop from banks
    strictEqual(q.text, 'two', 'text is last element of text bank');
    strictEqual(q.condition, 'c', 'condition is last element of condition bank');
    strictEqual(q.resources[0], '<img src="resource1.jpg" alt="resource1.jpg">', 'unsampled resource made correctly');
    strictEqual(q.resources[1], '<audio controls><source src="r2.mp3" type="audio/mpeg"></audio>', 'sampled resource made correctly');
    strictEqual(q.options[0].text, 'that', 'option text sampled correctly');
    strictEqual(q.options[1].text, 'option2', 'unsampled option text intact');
    strictEqual(q.options[1].getFeedback().text, 'no', 'option feedback sampled correctly');
});

test("checkbox options", function(){
    // exclusive is false and number of options is low so should be checkboxes
    var jsonq = {"text": "Do I pass?", "ordered": true, "freetext": false, "exclusive": false, "options": [{"text": "option A"}, {"text": "option B", "branchTo": 1}]};
    var q = new Question(jsonq, {'id': 1});
    strictEqual(q.options.length, 2, "options not created properly");
    ok(q.options[0] instanceof CheckOption, "CheckOption should have been created");
});

test("radio options", function(){
    // exclusive is false and number of options is low so should be checkboxes
    var jsonq = {id: "12", "text": "Do I pass?", "ordered": true, exclusive: true, "freetext": false, "options": [{"text": "option A"}, {"text": "option B", "branchTo": 1}]};
    var q = new Question(jsonq, true, false, {}, {});
    strictEqual(q.options.length, 2);
    ok(q.options[0] instanceof RadioOption, "RadioOption should have been created");
    ok(q.options[0].question instanceof Question, "question sending option wrong 'this'");
});

test("dropdown options", function(){
    var os = _.map(_.range(8), function(i){return {text: i.toString(), id: i};});
    var q = new Question({text: "q", id: 10, exclusive: true, options: os}, {});
    var q2 = new Question({text: "q2", id: 11, exclusive: false, options: os}, {});
    ok(q.options[0] instanceof DropDownOption, "DropDownOption should have been created");
    strictEqual(q.options[0].exclusive, true, "DropDownOption doesn't know exclusivity");
    ok(q2.options[0] instanceof DropDownOption, "DropDownOption should have been created even though exclusive is false");
    strictEqual(q2.options[0].exclusive, false, "DropDownOption doesn't know exclusivity");
});

test("text option", function(){
    var q = new Question( {text: "q", id: 1, freetext: true, options:[{id: 2, text: ''}]}, {} );
    ok(q.options[0] instanceof TextOption);
});

test("question with feedback", function(){
    var q = new Question({id: 2, "text": "here's the question", feedback: "here's the feedback",
                         options: [{text: "option A", id:"o1"}, {text: "option B", id:"o2"}]}, {});
    strictEqual(q.options.length, 2);
    ok(q.feedback instanceof Statement, "Statement not created from feedback");
    strictEqual(q.feedback.text, "here's the feedback", "feedback text not set properly");
});

test("question with options with feedback", function(){
    var q = new Question({id: 2, "text": "here's the question",
                         options: [{text: "option A", id:"o1", feedback: "that's right!"},
                             {text: "option B", id:"o2", feedback: "not quite"}]}, {});
    strictEqual(q.options.length, 2, "options should be initialized");
    ok(!q.feedback, "question should not have feedback");
    ok(q.options[0].feedback, "option should have feedback");
    ok(q.options[1].feedback, "option should have feedback");
});

test("option ordering", function(){
    var scale = {id: 10, "text": "here's the question", ordered: true,
                         options: [{id: 1, text: "option A"}, {id: 2, text: "option B"}, {id: 3, text: "option C"}]};
    var bag = {id: 11, "text": "here's the question",
                         options: [{id: 4, text: "option A"}, {id: 5, text: "option B"}, {id: 6, text: "option C"}]};
    var scaleResults = [];
    var bagResults = [];
    for (var i = 0; i < 30; i++){
        var s = new Question(scale, {});
        s.orderOptions();
        scaleResults.push(s.options[1].id === 2);
        var b = new Question(bag, {});
        b.orderOptions();
        bagResults.push(b.options[1].id === 5);
    }
    ok(_.every(scaleResults), "middle option should always be in the middle when ordered options are reordered");
    ok(_.some(bagResults), "middle option should sometimes be in the middle when unordered options are shuffled");
    ok(_.contains(bagResults, false), "middle option should sometimes not be in the middle when unordered options are shuffled");
});

function setup(){
    var $fixture = $( "#qunit-fixture" );
    $fixture.append("<div id='question'><p class='question'></p><p class='answer'></p></div> <div class='navigation'></div><div class='breakoff'> </div><form class='responses'><input type='hidden' id='surveyman'></form>");
    var nextButton = document.createElement("input");
    $(nextButton).attr({type: "button", id: "continue", value: "Next"});
    $("div.navigation").append(nextButton);
}


function setupForm(){
    setup();
    // $('#surveyman').val(JSON.stringify({responses:[]}));
}

test("statement display", function(){
    setupForm();
    strictEqual($("div.navigation").length, 1, "setup didn't work");
    var jsons = {"text": "Do I pass?", id: "s1"};
    var s = new Statement(jsons, {});
    s.display();
    strictEqual($("p.question").text(), "Do I pass?", "statement text not appended properly");
    strictEqual($("p.answer").text(), '', "statement shouldn't put anything in answer paragraph");
    strictEqual($(":button").length, 1, "There should be one Next button");
    // strictEqual($(":button").prop('disabled'), true, 'Next button should be disabled at first');

    s.isLast = true;
    s.display();

    strictEqual($("p.question").text(), "Do I pass?", "statement text should be appended");
    strictEqual($("p.answer").html().length, 0, "statement shouldn't put anything in answer paragraph");
    // strictEqual($(":button[value='Next']").length, 0, "Next button shouldn't display");
    // strictEqual($(":submit").length, 1, "Submit button should show");
    // strictEqual($(":submit").prop('disabled'), true, 'Submit button should be disabled at first');
});


test("question display with radios", function(){
    setupForm();
    var opts = [{text: "A", id: "o1", correct: true}, {text: "B", id: "o2", correct: false}];
    var q = new Question({text: "Do I pass?", id: "q1", options: opts}, {});
    q.display();
    strictEqual($("p.question").text(), "Do I pass?", "is question text accurate?");
    strictEqual($("p.answer :input").length, 2, "did option inputs get appended?");
    strictEqual($("p.answer *").length, 4, "did option inputs and labels get appended?");
    strictEqual($(":button").length, 1, "should be a next button");

    strictEqual($(":button").prop("disabled"), true, "next button should be disabled");
    var id1 = q.options[0].id;
    var id2 = q.options[1].id;
    $(":input[id='"+id1+"']").prop("checked", true);
    $(":input[id='"+id1+"']").trigger("change");
    strictEqual($(":button").prop("disabled"), false, "next button should be enabled");

    q.isLast = true;
    q.display();
    id1 = q.options[0].id;
    id2 = q.options[1].id;
    strictEqual($("p.question").text(), "Do I pass?", "is question text accurate?");
    strictEqual($("p.answer :input").length, 2, "did option inputs get appended?");
    strictEqual($("p.answer *").length, 4, "did option inputs and labels get appended?");
    // strictEqual($(":button").length, 0, "should not be a next button");
    // strictEqual($(":submit").length, 1, "should be a submit button");
    // strictEqual($(":submit").prop("disabled"), true, "submit button should be disabled");
    $(":input[id='"+id1+"']").prop("checked", true);
    $(":input[id='"+id1+"']").trigger("change");
    // strictEqual($(":submit").prop("disabled"), false, "submit button should be enabled");
    strictEqual(q.options[0].selected(), true, "does option know it's selected?");
    strictEqual(q.options[1].selected(), false, "does option know it's not selected?");
    notEqual(q.options[0].isCorrect(), null, "does option know if it's correct?");
    notEqual(q.options[1].isCorrect(), null, "does option know if it's correct?");
});

test("question display with checkboxes", function(){
    setupForm();
    var opts = [{text: "A", id: "o1", correct: true}, {text: "B", id: "o2", correct: false}];
    var q = new Question({text: "Do I pass?", id: "q1", exclusive: false, options: opts}, {});
    q.display();
    strictEqual($("p.answer *").length, 4, "did option inputs and labels get appended?");
    strictEqual($(":button").length, 1, "should be a next button");
    strictEqual($(":button").prop("disabled"), true, "next button should be disabled");
    var id1 = q.options[0].id;
    var id2 = q.options[1].id;

    $(":input[id='"+id1+"']").prop("checked", true);
    $(":input[id='"+id1+"']").trigger("change");
    strictEqual($(":button").prop("disabled"), false, "next button should be enabled");
    strictEqual(q.options[0].selected(), true, "does option know it's selected?");
    strictEqual(q.options[1].selected(), false, "does option know it's not selected?");

    $(":input[id='"+id1+"']").prop("checked", false);
    $(":input[id='"+id1+"']").trigger("change");
    strictEqual(q.options[0].selected(), false, "option should know it's no longer selected");
    strictEqual($(":button").prop("disabled"), true, "next button should be disabled when checks are removed");

    notEqual(q.options[0].isCorrect(), null, "does option know if it's correct?");
    notEqual(q.options[1].isCorrect(), null, "does option know if it's correct?");
});

test("question display with dropdown", function(){
    setupForm();
    var os = _.map(_.range(8), function(i){return {text: i.toString(), id: i.toString()};});
    var q = new Question({text: "Do I pass?", id: "q1", exclusive: false, options: os}, {});
    q.display();
    strictEqual($("p.answer *").length, 9, "did select and its options get appended?");
    strictEqual($("option").length, 8, "did options get appended?");
    strictEqual($(":button").length, 1, "should be a next button");
    strictEqual($(":button").prop("disabled"), true, "next button should be disabled");
    strictEqual($("option:selected").length, 0);
    var id1 = q.options[0].id;
    var id2 = q.options[1].id;

    $("option[id='"+id1+"']").prop("selected", "selected");
    $("select").trigger("change");
    strictEqual($("option:selected").length, 1, 'one option should be selected');
    strictEqual($(":button").prop("disabled"), false, "next button should be enabled");
    strictEqual(q.options[0].selected(), true, "does option know it's selected?");
    strictEqual(q.options[1].selected(), false, "does option know it's not selected?");

    $("option[id='"+id1+"']").prop("selected", false);
    $("option[id='"+id1+"']").trigger("change");
    strictEqual(q.options[0].selected(), false, "option should know it's no longer selected");
    strictEqual($(":button").prop("disabled"), true, "next button should be disabled when selections are removed");
});

test("question display with text", function(){
    setupForm();
    var opt = [{id: "o1", text: "starter", correct: /hello/}];
    var q = new Question({text: "Do I pass?", id: "q1", freetext: true, options: opt}, {});
    q.display();

    strictEqual($("p.answer input").length, 1, "did textbox get appended?");
    strictEqual($(":button").length, 1, "should be a next button");
    // strictEqual($(":button").prop("disabled"), true, "next button should be disabled");
    strictEqual($("p.answer input").val(), "", "text should start out blank (not supporting placeholders currently)");//TODO

    $("#o1").val("hi");

    strictEqual($("p.answer input").val(), "hi", "did changing text work?");
    strictEqual($("#o1").val(), "hi", "did changing text work?");
    strictEqual(q.options[0].isCorrect(), false, "text should know it's incorrect");

    $("#o1").val("hello world");
    strictEqual(q.options[0].isCorrect(), true, "text should know it's correct");

    $("#o1").trigger("keyup");

    strictEqual($(":button").prop("disabled"), false, "next button should be enabled");
    strictEqual(q.options[0].selected(), true, "does option know it has text?");

    $("#o1").val("");

    strictEqual(q.options[0].selected(), false, "does option know it doesn't have text?");
});

// asyncTest('statement enables next button after delay', function(){
//     expect(1);
//     setupForm();
//     var jsons = {"text": "Do I pass?", id: "s1"};
//     var s = new Statement(jsons, {});
//     s.display();

//     setTimeout(function(){
//         strictEqual($(":button").prop('disabled'), false, 'Next button should be enabled after 2 seconds');
//         start();
//     }, 2000);
// });

// asyncTest('statement enables submit button after delay', function(){
//     expect(1);
//     setupForm();
//     var jsons = {"text": "Do I pass?", id: "s1"};
//     var s = new Statement(jsons, {});
//     s.isLast = true;
//     s.display();

//     setTimeout(function(){
//         strictEqual($(":submit").prop('disabled'), false, 'Submit button should be enabled after 2 seconds');
//         start();
//     }, 2000);
// });
