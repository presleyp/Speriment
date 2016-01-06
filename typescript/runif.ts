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


