/// <reference path="experiment.ts"/>
/// <reference path="container.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class RunIf{
    constructor(){}
    shouldRun(experimentRecord: ExperimentRecord): boolean {
        return true;
    }
}

class RunIfSelected extends RunIf{
    constructor(private pageID, private optionID){
        super();
    }

    shouldRun(experimentRecord: ExperimentRecord): boolean {
        return experimentRecord.responseGiven(this.pageID, this.optionID);
    }
}

class RunIfMatched extends RunIf{
    constructor(private pageID, private regex){
        super();
    }

    shouldRun(experimentRecord: ExperimentRecord): boolean {
        return experimentRecord.textMatch(this.pageID, this.regex);
    }
}

class RunIfPermutation extends RunIf{
    constructor(private permutation) {
        super();
    }

    shouldRun(experimentRecord: ExperimentRecord){
        return experimentRecord.getPermutation() === this.permutation;
    }
}

function createRunIf(jsonRunIf): RunIf{
    var runIf;
    if (jsonRunIf){
        if (_.has(jsonRunIf, 'optionID')){
            runIf = new RunIfSelected(jsonRunIf.pageID, jsonRunIf.optionID);
        } else if (_.has(jsonRunIf, 'regex')){
            runIf = new RunIfMatched(jsonRunIf.pageID, jsonRunIf.regex);
        } else if (_.has(jsonRunIf, 'permutation')){
            runIf = new RunIfPermutation(jsonRunIf.permutation);
        } else {
            runIf = new RunIf();
        }
    } else {
        runIf = new RunIf();
    }
    return runIf;
}
