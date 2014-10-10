/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />

class TrialRecord {
    public pageID;
    public blockIDs;
    public startTime;
    public endTime;
    public selected; // only for Question
    public correct; // only for Question
    public iteration;
    public condition;
    public pageTags;
    public optionTags;

    constructor(pageID, condition, containers, tags){
        this.pageID = pageID;
        this.condition = condition;
        this.blockIDs = containers;
        this.pageTags = tags;
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
    private psiturk;

    constructor(psiturk){
        this.psiturk = psiturk;
        this.trialRecords = {};
    }

    public addRecord(trialRecord: TrialRecord){
        if (!_.has(this.trialRecords, trialRecord.pageID)){
            trialRecord.iteration = 1;
            this.trialRecords[trialRecord.pageID] = [trialRecord];
        } else {
            var iter = this.trialRecords[trialRecord.pageID].length + 1;
            trialRecord.iteration = iter;
            this.trialRecords[trialRecord.pageID].push(trialRecord);
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

    public submitRecords(): void {
        var records = _.toArray(this.trialRecords);
        var flatRecords = _.flatten(records);
        var dataArrays = _.map(flatRecords, (fr) => {
            return [fr.pageID,
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
    }

}

