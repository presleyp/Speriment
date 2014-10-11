//TODO latin square using condition?
//TODO preload audio
//TODO placeholders
//TODO other radio/check with text box
//TODO maybe: allow option-by-option answers on nonexclusive questions
//TODO (css) spread checkboxes out by default, it's hard to know which label is for which box

/// <reference path="container.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="record.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

// global constants for referring to HTML
var PAGE = "p.question",
    OPTIONS = "p.answer",
    NAVIGATION = "div.navigation",
    CONTINUE = "#continue", // Next or Submit button
    BREAKOFF = "div.breakoff";


class Experiment implements Container{
    public id: string;
    public exchangeable: string[];
    public version: number;
    public contents: Block[];
    private showBreakoff: boolean;
    public experimentRecord: ExperimentRecord;
    private static breakoffNotice: string = "<p>This experiment will allow you to " +
        "submit partial responses. The minimum payment is the quantity listed. " +
        "However, you will be compensated more for completing more of the experiment " +
        "in the form of bonuses, at the completion of this study. The quantity " +
        "paid depends on the results returned so far. Note that submitting partial " +
        "results does not guarantee payment.</p>";

    constructor(jsonExperiment, version, psiturk){
        jsonExperiment = _.defaults(jsonExperiment, {breakoff: true, exchangeable: []});
        this.version = version;
        this.exchangeable = jsonExperiment.exchangeable;
        this.showBreakoff = jsonExperiment.breakoff;
        this.contents = makeBlocks(jsonExperiment.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable);
        this.experimentRecord = new ExperimentRecord(psiturk);
    }

    public start(){
        this.tellLast();
        this.addElements();
        if (this.showBreakoff){
            this.showBreakoffNotice();
        } else {
            this.advance(this.experimentRecord);
        }
    }

    private tellLast(){
        _.last<Block>(this.contents).tellLast();
    }

    private addElements(){
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
        $(nextButton).attr({type: "button", id: "continue", value: "Next"});

        $('body').append(experimentDiv);
        $(experimentDiv).append(questionPar, answerPar, navigationDiv, breakoffDiv);
        $(navigationDiv).append(nextButton);
    }

    private showBreakoffNotice(){
        var breakoff = new Statement({text: Experiment.breakoffNotice, id: "breakoffnotice"}, this);
        var breakoffButton = document.createElement("input");
        $(breakoffButton).attr({type: "submit", value: "Submit Early"});
        $(BREAKOFF).append(breakoffButton);
        breakoff.display(this.experimentRecord);
    }

    public advance(experimentRecord: ExperimentRecord){
        if (!_.isEmpty(this.contents)){
            var block = this.contents.shift();
            block.advance(experimentRecord);
        }
    }

}
