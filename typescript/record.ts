/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class TrialRecord {
    public pageID: string;
    public pageText: string; // can be sampled
    public pageResources: string[]; // can be sampled
    public blockIDs: string[];
    public startTime: number;
    public endTime: number;
    public iteration: number;
    public condition: string; // can be sampled
    public pageTags: Object;
    // info on all options, in presentation order
    public optionOrder: string[]; // randomized each iteration
    public optionTexts: string[]; // can be sampled
    public optionResources: string[][]; // can be sampled
    public optionTags: Object[];
    // info on selected option(s)
    public selectedPosition: number[];
    public selectedID: string[]; // redundant but used by RunIf
    public selectedText: string[]; // needed for text options
    public correct;

    constructor(pageID: string, pageText: string, condition: string, containers: string[], tags: Object, resources: string[]){
        this.pageID = pageID;
        this.pageText = pageText;
        this.condition = condition;
        this.blockIDs = containers;
        this.pageTags = tags;
        this.pageResources = resources;
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
    private permutation: number;

    constructor(psiturk, permutation){
        this.psiturk = psiturk;
        this.trialRecords = {};
        this.permutation = permutation;
    }

    public addRecord(pageRecord: TrialRecord): void {
        var newRecord = jQuery.extend(true, {}, pageRecord); // deep copy to avoid corruption in training loops
        newRecord.optionTags = this.zipOptionTags(newRecord.optionTags); // receive grouped by option, record grouped by tag
        if (!_.has(this.trialRecords, newRecord.pageID)){
            newRecord.iteration = 1;
            this.trialRecords[newRecord.pageID] = [newRecord];
        } else {
            newRecord.iteration = this.trialRecords[newRecord.pageID].length + 1;
            this.trialRecords[newRecord.pageID].push(newRecord);
        }
    }

    zipOptionTags(optionTags: any[]): Array<Object>{
        // optionTags: [{tag1: option1value, tag2: option1value}, {tag1: option2value}, ...]
        // want: {tag1: [option1value, option2value, ...], {tag2: [option1value, 'NA', ...], ...}
        var optionTagNames: string[] = _.union.apply(_, _.map(optionTags, (t) => {return _.keys(t)}));
        return _.map(optionTagNames, (tag: string): Object => {
            var values = _.map(optionTags, (optionObject) => {
                return _.has(optionObject, tag) ? optionObject[tag] : 'NA';
            });
            var tagObject = {};
            tagObject[tag] = values;
            return tagObject;
        });
    }

    getPermutation(): number {
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

    public getBlockGrades(blockID: string): boolean[] {
        // get the last iteration of each page
        var recentRecords: TrialRecord[] = _.map(this.trialRecords, _.last);
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
        var dataObjects = _.map(orderedRecords, (r) => {
            var row = {
                PageID: r.pageID,
                PageText: r.pageText,
                BlockIDs: r.blockIDs,
                StartTime: r.startTime,
                EndTime: r.endTime,
                Iteration: r.iteration,
                Condition: r.condition,
                SelectedID: r.selectedID,
                SelectedText: r.selectedText,
                Correct: r.correct,
                OptionOrder: r.optionOrder,
                SelectedPosition: r.selectedPosition,
                PageResources: r.pageResources,
                OptionTexts: r.optionTexts,
                OptionResources: r.optionResources
                }
            _.extend(row, r.pageTags);
            _.each(r.optionTags, (t) => {_.extend(row, t)});
            return row;
        });
        _.each(dataObjects, this.psiturk.recordTrialData);

        this.psiturk.saveData();
        this.psiturk.completeHIT();
    }

    private sortByStart(records: TrialRecord[]): TrialRecord[] {
        return records.sort((r1, r2) => {return r1.startTime - r2.startTime});
    }

}
