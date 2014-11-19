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

class Experiment implements Container{
    public id: string;
    public exchangeable: string[];
    public counterbalance: string[];
    public version: number;
    public permutation: number;
    public contents: Block[];
    public experimentRecord: ExperimentRecord;

    constructor(jsonExperiment, version, permutation, psiturk){
        jsonExperiment = _.defaults(jsonExperiment, {exchangeable: [], counterbalance: []});
        this.version = version;
        this.permutation = permutation;
        this.exchangeable = jsonExperiment.exchangeable;
        this.counterbalance = jsonExperiment.counterbalance;
        this.contents = makeBlocks(jsonExperiment.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable, this.permutation, this.counterbalance);
        this.experimentRecord = new ExperimentRecord(psiturk);
    }

    public start(){
        this.tellLast();
        this.addElements();
        this.advance(this.experimentRecord);
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

        var nextButton = document.createElement("input");
        $(nextButton).attr({type: "button", id: "continue", value: "Next"});

        $('body').append(experimentDiv);
        $(experimentDiv).append(questionPar, answerPar, navigationDiv);
        $(navigationDiv).append(nextButton);
    }

    public advance(experimentRecord: ExperimentRecord){
        if (!_.isEmpty(this.contents)){
            var block = this.contents.shift();
            block.advance(experimentRecord);
        }
    }

}
