/// <reference path="survey.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
// function record(pageID, pageRecord){
//     responses[pageID] = pageRecord;
// }
var Page = (function () {
    function Page(jsonPage, block) {
        this.block = block;
        jsonPage = _.defaults(jsonPage, { condition: null, resources: null });
        this.id = jsonPage.id;
        this.text = jsonPage.text;
        this.condition = jsonPage.condition;
        var containers = getContainers(block);
        this.record = new TrialRecord(containers);
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
        // $(CONTINUE).submit(); //TODO
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
        $(PAGE).empty().append(this.text);
    };

    Page.prototype.finish = function (experimentRecord) {
        experimentRecord.addRecord(this.record);
        //TODO
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
        experimentRecord.addRecord(this.id, this.record);

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
        experimentRecord.addRecord(this.id, this.record);
        this.block.advance(experimentRecord);
    };
    return Statement;
})(Page);
