/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class TrialRecord {
    public pageID: string;
    public pageText: string;
    public blockIDs: string[];
    public startTime;
    public endTime;
    public selectedID: string = null;
    public selectedText: string = null;
    public correct = null;
    public iteration: number = 1;
    public condition: string = null;
    public pageTags: string[] = [];
    public optionTags: string[] = [];
    public optionOrder: string[] = null;
    public selectedPosition: number = null;

    constructor(pageID, pageText, condition, containers, tags){
        this.pageID = pageID;
        this.pageText = pageText;
        this.condition = condition;
        this.blockIDs = containers;
        this.pageTags = tags;
    }
}

/* Each record is actually an array of TrialRecords, in case the
   page is displayed more than once (as in a training block). In many cases,
   this will be a list of one item. But when the page was displayed multiple
   time and it is a longer list, only the last item in the list - the final
   attempt at the page - will be used by responseGiven and getBlockGrades.
   So in an experiment where block 2 runs only if a certain answer was given in
   block 1, or block 2 reruns if not enough correct answers were given in it,
   these decisions will be made based on the most recent answers.
*/
class ExperimentRecord {
    private trialRecords; // {pageID: TrialRecord[]}
    private psiturk;
    private permutation;

    constructor(psiturk, permutation){
        this.psiturk = psiturk;
        this.trialRecords = {};
        this.permutation = permutation;
    }

    public addRecord(trialRecord: TrialRecord){
        if (!_.has(this.trialRecords, trialRecord.pageID)){
            this.trialRecords[trialRecord.pageID] = [trialRecord];
        } else {
            var iter = this.trialRecords[trialRecord.pageID].length + 1;
            trialRecord.iteration = iter;
            this.trialRecords[trialRecord.pageID].push(trialRecord);
        }
    }

    getPermutation(){
        return this.permutation;
    }

    private getLatestPageInfo(pageID: string): TrialRecord {
        if (_.has(this.trialRecords, pageID)) {
            var pageResponses: TrialRecord[] = this.trialRecords[pageID];
            return _.last(pageResponses);
        } else {
            return null;
        }
    }

    responseGiven(pageID: string, optionID: string): boolean {
        var pageInfo = this.getLatestPageInfo(pageID);
        if (pageInfo) {
            return _.contains(pageInfo.selectedID, optionID);
        } else {
            return false;
        }
    }

    textMatch(pageID: string, regex: string): boolean {
        var pageInfo = this.getLatestPageInfo(pageID);
        if (pageInfo && pageInfo.selectedID.length === 1) {
            return pageInfo.selectedText[0].search(regex) >= 0;
        } else {
            return false;
        }
    }

    // public responseGiven(runIf){
    //     if (_.has(this.trialRecords, runIf.pageID)) {
    //         var pageResponses: TrialRecord[] = this.trialRecords[runIf.pageID];
    //         var response: TrialRecord = _.last(pageResponses);
    //         if (runIf.optionID){
    //             return _.contains(response.selectedID, runIf.optionID);
    //         } else if (runIf.regex && response.selectedID.length === 1){
    //             return response.selectedText[0].search(runIf.regex) >= 0;
    //         } else if (runIf.counterbalance){
    //             return runIf.counterbalance === this.permutation;
    //         } else {
    //             throw "runIf does not contain optionID or regex.";
    //         }
    //     } else {
    //         return false;
    //     }
    // }

    public getBlockGrades(blockID: string): boolean[] {
        // get the last iteration of each page
        var recentRecords: TrialRecord[] = _.map(this.trialRecords, (trlist: TrialRecord[]) => {
            return _.last(trlist);
        });
        // get only records contained by the given block
        var relevantRecords: TrialRecord[] = _.filter(recentRecords, (tr: TrialRecord) => {
            return _.contains(tr.blockIDs, blockID);
        });
        // order by time so you can check the number correct in a row
        var orderedRecords = this.sortByStart(relevantRecords);
        // gather correctness info, flatten nonexclusive responses
        var grades = _.flatten(_.pluck(orderedRecords, "correct"));
        // correct answers separated by pages with no specified answers count as in a row
        grades = _.reject<boolean[]>(grades, (g) => {return _.isNull(g) || _.isUndefined(g)});
        return grades;
    }

    public submitRecords(): void {
        var records = _.toArray(this.trialRecords);
        var flatRecords = _.flatten(records);
        var orderedRecords = this.sortByStart(flatRecords);
        var dataArrays = _.map(orderedRecords, (fr) => {
            return [
                fr.pageID,
                fr.pageText,
                fr.blockIDs,
                fr.startTime,
                fr.endTime,
                fr.iteration,
                fr.condition,
                fr.selectedID,
                fr.selectedText,
                fr.correct,
                fr.optionOrder,
                fr.selectedPosition]
            .concat(fr.pageTags)
            .concat(fr.optionTags);
        });
        _.each(dataArrays, this.psiturk.recordTrialData);
        this.psiturk.saveData();
        this.psiturk.completeHIT();
    }

    private sortByStart(records: TrialRecord[]): TrialRecord[] {
        return records.sort((r1, r2) => {return r1.startTime - r2.startTime});
    }

}

