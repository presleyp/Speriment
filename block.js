/// <reference path="survey.ts"/>
/// <reference path="container.ts"/>
/// <reference path="question.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
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
            this.contents = this.choosePages(jsonBlock.groups);
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

    InnerBlock.prototype.choosePages = function (groups) {
        var pages = this.latinSquare ? this.chooseLatinSquare(groups) : this.chooseRandom(groups);
        return this.makePages(pages);
    };

    InnerBlock.prototype.orderPages = function () {
        if (this.pseudorandom) {
            this.pseudorandomize();
        } else {
            this.contents = _.shuffle(this.contents);
        }
    };

    InnerBlock.prototype.chooseLatinSquare = function (groups) {
        var numConditions = groups[0].length;
        var lengths = _.pluck(groups, "length");
        var pages = [];
        if (_.every(lengths, function (l) {
            return l === lengths[0];
        })) {
            var version = _.random(numConditions - 1);
            for (var i = 0; i < groups.length; i++) {
                var condition = (i + version) % numConditions;
                pages.push(groups[i][condition]);
            }
        } else {
            pages = this.chooseRandom(groups); // error passing silently - should be caught in Python
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
