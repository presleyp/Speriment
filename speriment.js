/// <reference path="survey.ts"/>
/// <reference path="block.ts"/>
/// <reference path="question.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var ResponseOption = (function () {
    function ResponseOption(jsonOption, question) {
        this.question = question;
        jsonOption = _.defaults(jsonOption, { answer: null, correct: null, tags: [] });
        this.id = jsonOption.id;
        this.text = jsonOption.text;
        this.answer = jsonOption.answer;
        this.correct = jsonOption.correct; // has to be specified as false in the input for radio/check/dropdown if it should count as wrong
        this.tags = jsonOption.tags;
    }
    ResponseOption.prototype.display = function () {
    };

    ResponseOption.prototype.getResponse = function () {
        return this.id;
    };

    ResponseOption.prototype.onChange = function () {
        if ($(OPTIONS + " :checked").length !== 0) {
            this.question.enableNext();
        } else {
            this.question.disableNext();
        }
    };

    ResponseOption.prototype.selected = function () {
        return $('#' + this.id).is(':checked');
    };

    ResponseOption.prototype.getAnswer = function () {
        if (this.answer) {
            return new Statement({ text: this.answer, id: this.id + "_answer" }, this.question.block);
        } else {
            return null;
        }
    };

    ResponseOption.prototype.isCorrect = function () {
        return this.correct;
    };
    return ResponseOption;
})();

var RadioOption = (function (_super) {
    __extends(RadioOption, _super);
    function RadioOption() {
        _super.apply(this, arguments);
    }
    RadioOption.prototype.display = function () {
        var _this = this;
        var label = document.createElement("label");
        $(label).attr("for", this.id);
        $(label).append(this.text);

        var input = document.createElement("input");
        $(input).attr({ type: "radio", id: this.id, name: this.question.id });
        $(input).change(function (m) {
            _this.onChange();
        });

        $(OPTIONS).append(label);
        $(OPTIONS).append(input);
    };
    return RadioOption;
})(ResponseOption);

var CheckOption = (function (_super) {
    __extends(CheckOption, _super);
    function CheckOption() {
        _super.apply(this, arguments);
    }
    CheckOption.prototype.display = function () {
        var _this = this;
        var label = document.createElement("label");
        $(label).attr("for", this.id);
        $(label).append(this.text);

        var input = document.createElement("input");
        $(input).attr({ type: "checkbox", id: this.id, name: this.question.id });
        $(input).change(function (m) {
            _this.onChange();
        });

        $(OPTIONS).append(label);
        $(OPTIONS).append(input);
    };
    return CheckOption;
})(ResponseOption);

var TextOption = (function (_super) {
    __extends(TextOption, _super);
    function TextOption(jsonOption, block) {
        jsonOption = _.defaults(jsonOption, { text: "", correct: null });
        _super.call(this, jsonOption, block);
        if (jsonOption.correct) {
            this.regex = new RegExp(jsonOption.correct);
        }
    }
    TextOption.prototype.display = function () {
        var _this = this;
        var input = document.createElement("input");
        $(input).attr({ type: "text", id: this.id, name: this.question.id });
        $(input).keyup(function (m) {
            _this.onChange();
        });

        $(OPTIONS).append(input);
    };

    TextOption.prototype.getResponse = function () {
        return $("#" + this.id).val();
    };

    TextOption.prototype.onChange = function () {
        if (this.getResponse()) {
            this.question.enableNext();
        } else {
            this.question.disableNext();
        }
    };

    TextOption.prototype.selected = function () {
        return this.getResponse().length > 0;
    };

    TextOption.prototype.isCorrect = function () {
        if (this.regex) {
            return Boolean(this.getResponse().match(this.regex));
        } else {
            return null;
        }
    };
    return TextOption;
})(ResponseOption);

var DropDownOption = (function (_super) {
    __extends(DropDownOption, _super);
    function DropDownOption(jsonOption, block, exclusive) {
        _super.call(this, jsonOption, block);
        this.exclusive = exclusive;
    }
    DropDownOption.prototype.display = function () {
        var _this = this;
        //if select element exists, append to it, otherwise create it first
        if ($(OPTIONS + " select").length === 0) {
            var select = document.createElement("select");
            if (!this.exclusive) {
                $(select).attr({ multiple: "multiple", name: this.question.id });
            }
            $(select).change(function (m) {
                _this.onChange();
            });
            $(OPTIONS).append(select);
        }
        var option = document.createElement("option");
        $(option).attr("id", this.id);
        $(option).append(this.text);
        $(OPTIONS + " select").append(option);
    };
    return DropDownOption;
})(ResponseOption);
/// <reference path="survey.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
// function record(pageID, pageRecord){
//     responses[pageID] = pageRecord;
// }
var Page = (function () {
    function Page(jsonPage, block) {
        this.block = block;
        jsonPage = _.defaults(jsonPage, { condition: null, resources: null, tags: [] });
        this.id = jsonPage.id;
        this.text = jsonPage.text;
        this.condition = jsonPage.condition;
        this.resources = _.map(jsonPage.resources, this.makeResource);
        this.tags = jsonPage.tags;
        var containers = getContainers(block);
        this.record = new TrialRecord(this.id, this.condition, containers, this.tags);
    }
    Page.prototype.advance = function (experimentRecord) {
    };

    Page.prototype.disableNext = function () {
        $(CONTINUE).prop({ disabled: true });
        if (this.isLast) {
            $(BREAKOFF).show();
        }
    };

    Page.prototype.enableNext = function () {
        $(CONTINUE).prop({ disabled: false });
        if (this.isLast) {
            $(BREAKOFF).hide();
        }
    };

    Page.prototype.nextToSubmit = function (experimentRecord) {
        var _this = this;
        $(CONTINUE).attr({ type: "submit", value: "Submit", form: "surveyman" });
        $(CONTINUE).off('click').click(function (m) {
            _this.finish(experimentRecord);
        });
    };

    Page.prototype.makeResource = function (resource) {
        var fileTypeMap = {
            'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'pdf': 'img', 'gif': 'img', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'mp4': 'video', 'webm': 'video' };
        var extension = resource.split('.').pop().toLowerCase();
        var fileType = fileTypeMap[extension];
        if (fileType === 'img') {
            return '<img src="' + resource + '" alt="' + resource + '">';
        } else {
            var mediaType = extension === 'mp3' ? 'audio/mpeg' : fileType + '/' + extension;
            return '<' + fileType + ' controls><source src="' + resource + '" type="' + mediaType + '"></' + fileType + '>';
        }
    };

    Page.prototype.display = function (experimentRecord) {
        var _this = this;
        if (this.isLast) {
            this.nextToSubmit(experimentRecord);
        } else {
            $(CONTINUE).off('click').click(function (m) {
                _this.advance(experimentRecord);
            });
        }
        this.disableNext();
        $(OPTIONS).empty();
        $(PAGE).empty().append(this.text, this.resources);
    };

    Page.prototype.finish = function (experimentRecord) {
        experimentRecord.addRecord(this.record);
        experimentRecord.submitRecords();
    };
    Page.dropdownThreshold = 7;
    return Page;
})();

var Question = (function (_super) {
    __extends(Question, _super);
    function Question(jsonQuestion, block) {
        var _this = this;
        _super.call(this, jsonQuestion, block);
        var jQuestion = _.defaults(jsonQuestion, { ordered: false, exclusive: true, freetext: false });
        this.ordered = jQuestion.ordered;
        this.exclusive = jQuestion.exclusive;
        this.freetext = jQuestion.freetext;
        if (jQuestion.answer) {
            this.answer = new Statement({ text: jQuestion.answer, id: this.id + "_answer" }, block);
        }
        this.options = _.map(jQuestion.options, function (o) {
            if (jQuestion.options.length > Page.dropdownThreshold) {
                return new DropDownOption(o, _this, _this.exclusive);
            } else if (_this.freetext) {
                return new TextOption(o, _this);
            } else if (_this.exclusive) {
                return new RadioOption(o, _this);
            } else {
                return new CheckOption(o, _this);
            }
        });
    }
    Question.prototype.display = function (experimentRecord) {
        _super.prototype.display.call(this, experimentRecord);
        this.orderOptions();
        _.each(this.options, function (o) {
            o.display();
        });
        this.record.startTime = new Date().getTime();
    };

    Question.prototype.advance = function (experimentRecord) {
        this.record.endTime = new Date().getTime();

        var selected = _.filter(this.options, function (o) {
            return o.selected();
        });

        // answers that should be displayed to the respondent
        var optionAnswers = _.compact(_.map(selected, function (o) {
            return o.getAnswer();
        }));

        this.recordResponses(selected);
        this.recordCorrect(selected);

        // record(this.id, this.record);
        experimentRecord.addRecord(this.record);

        if (!_.isEmpty(optionAnswers) && this.exclusive) {
            optionAnswers[0].display(experimentRecord);
        } else if (this.answer) {
            this.answer.display(experimentRecord);
        } else {
            this.block.advance(experimentRecord);
        }
    };

    Question.prototype.recordResponses = function (selected) {
        // ids of selections and value of text
        var responses = _.map(selected, function (s) {
            return s.getResponse();
        });
        this.record.selected = responses;
        this.record.optionTags = _.zip(_.pluck(selected, 'tags'));
        console.log(this.record);
    };

    Question.prototype.recordCorrect = function (selected) {
        this.record.correct = _.map(selected, function (s) {
            return s.isCorrect();
        });
    };

    Question.prototype.orderOptions = function () {
        if (this.ordered) {
            if (Math.random() > 0.5) {
                this.options = this.options.reverse();
            }
        } else {
            this.options = _.shuffle(this.options);
        }
    };
    return Question;
})(Page);

var Statement = (function (_super) {
    __extends(Statement, _super);
    function Statement() {
        _super.apply(this, arguments);
    }
    Statement.prototype.display = function (experimentRecord) {
        _super.prototype.display.call(this, experimentRecord);
        this.record.startTime = new Date().getTime();

        // setTimeout(() => {this.enableNext()}, 1000);
        this.enableNext();
    };

    Statement.prototype.advance = function (experimentRecord) {
        this.record.endTime = new Date().getTime();

        // record(this.id, this.record);
        experimentRecord.addRecord(this.record);
        this.block.advance(experimentRecord);
    };
    return Statement;
})(Page);
/// <reference path="survey.ts"/>
/// <reference path="block.ts"/>
/// <reference path="question.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />

// functions Containers use
function makeBlocks(jsonBlocks, container) {
    var blockList = _.map(jsonBlocks, function (block) {
        if (block.groups || block.pages) {
            return new InnerBlock(block, container);
        } else {
            return new OuterBlock(block, container);
        }
    });
    return blockList;
}

function orderBlocks(blocks, exchangeable) {
    if (exchangeable.length < 2) {
        return blocks;
    }

    // positions that can be swapped into
    var exchangeableIndices = _.map(exchangeable, function (id) {
        var blockids = _.pluck(blocks, 'id');
        return _.indexOf(blockids, id);
    });

    // ids of exchangeable blocks shuffled
    var exchangedIds = _.shuffle(exchangeable);

    // exchangeable blocks in shuffled order
    var exchangedBlocks = _.map(exchangedIds, function (id) {
        return _.filter(blocks, function (b) {
            return b.id === id;
        })[0];
    });

    // pair up each available position with a block
    var pairs = _.zip(exchangeableIndices, exchangedBlocks);

    // fill each position with the block it's paired with
    _.each(pairs, function (pair) {
        blocks[pair[0]] = pair[1];
    });
    return blocks;
}

function getContainers(block) {
    function getC(current, acc) {
        if (current.container && current.container.id) {
            return getC(current.container, acc.concat([current.container.id]));
        } else {
            return acc;
        }
    }

    return getC(block, [block.id]);
}
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
var TrialRecord = (function () {
    function TrialRecord(pageID, condition, containers, tags) {
        this.pageID = pageID;
        this.condition = condition;
        this.blockIDs = containers;
        this.pageTags = tags;
    }
    return TrialRecord;
})();

/* Each record is actually a list of TrialRecords, in case the
page is displayed more than once (as in a training block). In many cases,
this will be a list of one item. But when the page was displayed multiple
time and it is a longer list, only the last item in the list - the final
attempt at the page - will be used by responseGiven and getBlockGrades.
So in an experiment where block 2 runs only if a certain answer was given in
block 1, or block 2 reruns if not enough correct answers were given in it,
these decisions will be made based on the most recent answers.
*/
var ExperimentRecord = (function () {
    function ExperimentRecord(psiturk) {
        this.psiturk = psiturk;
        this.trialRecords = {};
    }
    ExperimentRecord.prototype.addRecord = function (trialRecord) {
        if (!_.has(this.trialRecords, trialRecord.pageID)) {
            trialRecord.iteration = 1;
            this.trialRecords[trialRecord.pageID] = [trialRecord];
        } else {
            var iter = this.trialRecords[trialRecord.pageID].length + 1;
            trialRecord.iteration = iter;
            this.trialRecords[trialRecord.pageID].push(trialRecord);
        }
    };

    ExperimentRecord.prototype.responseGiven = function (runIf) {
        if (_.has(this.trialRecords, runIf.pageID)) {
            var pageResponses = this.trialRecords[runIf.pageID];
            var response = _.last(pageResponses);
            if (runIf.optionID) {
                return _.contains(response.selected, runIf.optionID);
            } else if (runIf.regex && response.selected.length === 1) {
                return response.selected[0].search(runIf.regex) >= 0;
            } else {
                throw "runIf does not contain optionID or regex.";
            }
        } else {
            return false;
        }
    };

    ExperimentRecord.prototype.getBlockGrades = function (blockID) {
        // get the last iteration of each page
        var recentRecords = _.map(this.trialRecords, function (trlist) {
            return _.last(trlist);
        });

        // get only records contained by the given block
        var relevantRecords = _.filter(recentRecords, function (tr) {
            return _.contains(tr.blockIDs, blockID);
        });

        // gather correctness info, flatten nonexclusive responses
        var grades = _.flatten(_.pluck(relevantRecords, "correct"));

        // correct answers separated by pages with no specified answers count as in a row
        grades = _.reject(grades, function (g) {
            return _.isNull(g) || _.isUndefined(g);
        });
        return grades;
    };

    ExperimentRecord.prototype.submitRecords = function () {
        var records = _.toArray(this.trialRecords);
        var flatRecords = _.flatten(records);
        var dataArrays = _.map(flatRecords, function (fr) {
            return [
                fr.pageID,
                fr.blockIDs,
                fr.startTime,
                fr.endTime,
                fr.iteration,
                fr.condition,
                fr.selected,
                fr.correct].concat(fr.pageTags).concat(fr.optionTags);
        });
        _.each(dataArrays, this.psiturk.recordTrialData);
        this.psiturk.savedata(this.psiturk.completeHIT);
    };
    return ExperimentRecord;
})();
//TODO decide how to handle errors
//TODO make decimal criterion check against number of expected trues rather than number of questions
//TODO latin square using condition
//TODO interface with HTML, JSON, Java
//TODO create page html from text and resources; preload audio
//TODO placeholders
//TODO other radio/check with text box
//TODO allow runIf to be dependent on regex matching
//TODO matching any text ever given isn't very precise - change to match a certain option id and its text
//TODO maybe: allow option-by-option answers on nonexclusive questions
//TODO maybe: allow text box to start with text already in it
//TODO (css) spread checkboxes out by default, it's hard to know which label is for which box
/// <reference path="container.ts"/>
/// <reference path="block.ts"/>
/// <reference path="question.ts"/>
/// <reference path="option.ts"/>
/// <reference path="record.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
// global constants for referring to HTML
var PAGE = "p.question", OPTIONS = "p.answer", NAVIGATION = "div.navigation", CONTINUE = "#continue", BREAKOFF = "div.breakoff";

var Survey = (function () {
    function Survey(jsonSurvey, version, psiturk) {
        jsonSurvey = _.defaults(jsonSurvey, { breakoff: true, exchangeable: [] });
        this.version = version;
        this.exchangeable = jsonSurvey.exchangeable;
        this.showBreakoff = jsonSurvey.breakoff;
        this.contents = makeBlocks(jsonSurvey.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable);
        this.experimentRecord = new ExperimentRecord(psiturk);
    }
    Survey.prototype.start = function () {
        this.tellLast();
        this.addElements();
        if (this.showBreakoff) {
            this.showBreakoffNotice();
        } else {
            this.advance(this.experimentRecord);
        }
    };

    Survey.prototype.tellLast = function () {
        _.last(this.contents).tellLast();
    };

    Survey.prototype.addElements = function () {
        var experimentDiv = document.createElement('div');
        $(experimentDiv).attr("id", "experimentDiv");

        var questionPar = document.createElement('p');
        $(questionPar).addClass('question');

        var answerPar = document.createElement('p');
        $(answerPar).addClass('answer');

        var navigationDiv = document.createElement('div');
        $(navigationDiv).addClass('navigation');

        var breakoffDiv = document.createElement('div');
        $(breakoffDiv).addClass('breakoff');

        var nextButton = document.createElement("input");
        $(nextButton).attr({ type: "button", id: "continue", value: "Next" });

        $('body').append(experimentDiv);
        $(experimentDiv).append(questionPar, answerPar, navigationDiv, breakoffDiv);
        $(navigationDiv).append(nextButton);
    };

    Survey.prototype.showBreakoffNotice = function () {
        var breakoff = new Statement({ text: Survey.breakoffNotice, id: "breakoffnotice" }, this);
        var breakoffButton = document.createElement("input");
        $(breakoffButton).attr({ type: "submit", value: "Submit Early" });
        $(BREAKOFF).append(breakoffButton);
        breakoff.display(this.experimentRecord);
    };

    Survey.prototype.advance = function (experimentRecord) {
        if (!_.isEmpty(this.contents)) {
            var block = this.contents.shift();
            block.advance(experimentRecord);
        }
    };
    Survey.breakoffNotice = "<p>This survey will allow you to " + "submit partial responses. The minimum payment is the quantity listed. " + "However, you will be compensated more for completing more of the survey " + "in the form of bonuses, at the completion of this study. The quantity " + "paid depends on the results returned so far. Note that submitting partial " + "results does not guarantee payment.</p>";
    return Survey;
})();
/// <reference path="survey.ts"/>
/// <reference path="container.ts"/>
/// <reference path="question.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
// function getResponses(fromPage?){
//     var data = JSON.parse($(FORM).val()).responses;
//     if (fromPage){
//         var pageIds = _.pluck(data, 'page')
//         var fromIndex = _.lastIndexOf(pageIds, fromPage);
//         return _.rest(data, fromIndex);
//     } else {
//         return data;
//     }
// }
var Block = (function () {
    function Block(jsonBlock) {
        jsonBlock = _.defaults(jsonBlock, { runIf: null });
        this.runIf = jsonBlock.runIf; // {pageID, optionID | regex}
        this.id = jsonBlock.id;
        this.oldContents = [];
    }
    Block.prototype.tellLast = function () {
    };

    Block.prototype.run = function (nextUp, experimentRecord) {
    };

    // whether this block should run, depending on a previous answer
    Block.prototype.shouldRun = function (experimentRecord) {
        if (this.runIf) {
            return experimentRecord.responseGiven(this.runIf);
            // var answersGiven = _.flatten(_.pluck(getResponses(), 'selected'));
            // return _.contains(answersGiven, this.runIf); //TODO make it possible to do regex matching for text options
        } else {
            return true;
        }
    };

    Block.prototype.advance = function (experimentRecord) {
        if (!_.isEmpty(this.contents) && this.shouldRun(experimentRecord)) {
            var nextUp = this.contents.shift();
            this.oldContents.push(nextUp);
            this.run(nextUp, experimentRecord);
        } else {
            this.container.advance(experimentRecord);
        }
    };
    return Block;
})();

// an OuterBlock can only contain Blocks (InnerBlocks or OuterBlocks)
var OuterBlock = (function (_super) {
    __extends(OuterBlock, _super);
    function OuterBlock(jsonBlock, container) {
        _super.call(this, jsonBlock);
        this.container = container;
        jsonBlock = _.defaults(jsonBlock, { exchangeable: [] });
        this.exchangeable = jsonBlock.exchangeable;
        this.version = container.version;
        this.contents = makeBlocks(jsonBlock.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable);
    }
    OuterBlock.prototype.tellLast = function () {
        _.last(this.contents).tellLast();
    };

    OuterBlock.prototype.run = function (block, experimentRecord) {
        block.advance(experimentRecord);
    };
    return OuterBlock;
})(Block);

// an InnerBlock can only contain Pages
var InnerBlock = (function (_super) {
    __extends(InnerBlock, _super);
    function InnerBlock(jsonBlock, container) {
        _super.call(this, jsonBlock);
        this.container = container;
        jsonBlock = _.defaults(jsonBlock, { latinSquare: false, pseudorandomize: false, training: false, criterion: null });
        this.latinSquare = jsonBlock.latinSquare;
        this.pseudorandom = jsonBlock.pseudorandomize;
        this.criterion = jsonBlock.criterion;
        if (jsonBlock.groups) {
            this.contents = this.choosePages(jsonBlock.groups, container.version);
        } else {
            this.contents = this.makePages(jsonBlock.pages);
        }
        this.orderPages();
    }
    InnerBlock.prototype.run = function (page, experimentRecord) {
        page.display(experimentRecord);
    };

    InnerBlock.prototype.tellLast = function () {
        _.last(this.contents).isLast = true;
    };

    InnerBlock.prototype.makePages = function (jsonPages) {
        var _this = this;
        var pages = _.map(jsonPages, function (p) {
            if (p.options) {
                return new Question(p, _this);
            } else {
                return new Statement(p, _this);
            }
        });
        return pages;
    };

    InnerBlock.prototype.choosePages = function (groups, version) {
        var pages = this.latinSquare ? this.chooseLatinSquare(groups, version) : this.chooseRandom(groups);
        return this.makePages(pages);
    };

    InnerBlock.prototype.orderPages = function () {
        if (this.pseudorandom) {
            this.pseudorandomize();
        } else {
            this.contents = _.shuffle(this.contents);
        }
    };

    InnerBlock.prototype.chooseLatinSquare = function (groups, version) {
        var numConditions = groups[0].length;
        var lengths = _.pluck(groups, "length");
        var pages = [];
        if (_.every(lengths, function (l) {
            return l === lengths[0];
        })) {
            for (var i = 0; i < groups.length; i++) {
                var cond = (i + version) % numConditions;
                pages.push(groups[i][cond]);
            }
        } else {
            throw "Can't do Latin Square on groups of uneven sizes.";
        }
        return pages;
    };

    InnerBlock.prototype.chooseRandom = function (groups) {
        var pages = _.map(groups, function (g) {
            return _.sample(g);
        });
        return pages;
    };

    InnerBlock.prototype.swapInto = function (nextP, pages) {
        var conds = _.pluck(pages, 'condition');
        var cond = nextP.condition;
        var swappable = _.map(_.range(pages.length), function (i) {
            var firstIndex = (i === 0) ? 0 : i - 1;
            return _.isEmpty(_.intersection(conds.slice(firstIndex, i + 2), [cond]));
        });
        var swapTo = _.indexOf(swappable, true);
        if (swapTo > -1) {
            pages.push(pages[swapTo]);
            pages[swapTo] = nextP;
            return pages;
        } else {
            pages.push(nextP); //TODO throw error, not pseudorandomizing
            return pages;
        }
    };

    InnerBlock.prototype.pseudorandomize = function () {
        var _this = this;
        var pages = [];
        var remaining = _.shuffle(this.contents);
        pages.push(remaining.shift());
        _.each(_.range(remaining.length), function (i) {
            var conds = _.pluck(remaining, 'condition');
            var cond = _.last(pages).condition;
            var addable = _.map(conds, function (c) {
                return c != cond;
            });
            var addFrom = _.indexOf(addable, true);
            if (addFrom > -1) {
                pages.push(remaining.splice(addFrom, 1)[0]);
            } else {
                var nextP = remaining.shift();
                pages = _this.swapInto(nextP, pages);
            }
        });
        this.contents = pages;
    };

    // have to meet or exceed criterion to move on; otherwise you repeat this block
    InnerBlock.prototype.shouldLoop = function (experimentRecord) {
        if (!this.criterion) {
            return false;
        } else {
            var grades = experimentRecord.getBlockGrades(this.id);
            var metric;

            // this.criterion is necessary percent correct
            if (this.criterion < 1) {
                metric = _.compact(grades).length / grades.length;
                // this.criterion is necessary number correct in a row from the end
            } else {
                var lastIncorrect = _.lastIndexOf(grades, false);
                var metric = grades.length - (lastIncorrect + 1);
            }

            return metric < this.criterion;
        }
    };

    InnerBlock.prototype.advance = function (experimentRecord) {
        if (_.isEmpty(this.contents) && this.shouldLoop(experimentRecord)) {
            this.contents = this.oldContents;
            this.oldContents = [];
            this.orderPages();
        }
        _super.prototype.advance.call(this, experimentRecord);
    };
    return InnerBlock;
})(Block);
