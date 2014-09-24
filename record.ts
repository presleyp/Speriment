/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />

class TrialRecord {
    public blockIDs;
    public startTime;
    public endTime;
    public selected; // only for Question
    public correct; // only for Question
    public iteration;

    constructor(containers){
        this.blockIDs = containers;
    }
}

/* Each record is actually a list of TrialRecords, in case the
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

    constructor(){
        this.trialRecords = {};
    }

    public addRecord(pageID: string, trialRecord: TrialRecord){
        if (!_.has(this.trialRecords, pageID)){
            trialRecord.iteration = 1;
            this.trialRecords[pageID] = [trialRecord];
        } else {
            var iter = this.trialRecords[pageID].length + 1;
            trialRecord.iteration = iter;
            this.trialRecords[pageID].push(trialRecord);
        }
    }

    public responseGiven(runIf){
        if (_.has(this.trialRecords, runIf.pageID)) {
            var pageResponses: TrialRecord[] = this.trialRecords[runIf.pageID];
            var response: TrialRecord = _.last(pageResponses);
            if (runIf.optionID){
                return _.contains(response.selected, runIf.optionID);
            } else if (runIf.regex && response.selected.length === 1){
                return response.selected[0].search(runIf.regex) >= 0;
            } else {
                throw "runIf does not contain optionID or regex.";
            }
        } else {
            return false;
        }
    }

    public getBlockGrades(blockID: string): boolean[] {
        // get the last iteration of each page
        var recentRecords: TrialRecord[] = _.map(this.trialRecords, (trlist: TrialRecord[]) => {
            return _.last(trlist);
        });
        // get only records contained by the given block
        var relevantRecords: TrialRecord[] = _.filter(recentRecords, (tr: TrialRecord) => {
            return _.contains(tr.blockIDs, blockID);
        });
        // gather correctness info, flatten nonexclusive responses
        var grades = _.flatten(_.pluck(relevantRecords, "correct"));
        // correct answers separated by pages with no specified answers count as in a row
        grades = _.reject<boolean[]>(grades, (g) => {return _.isNull(g) || _.isUndefined(g)});
        return grades;
    }

}

