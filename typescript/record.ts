/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class TrialRecord {
    // page data
    private pageID: string;
    private pageText: string; // can be sampled
    private pageResources: string[]; // can be sampled
    private itemID: string;
    private itemTags: Object;
    private blockIDs: string[];
    private condition: string; // can be sampled
    private pageTags: Object;
    // trial data
    private startTime: number;
    private endTime: number;
    private iteration: number;
    // option data
    private optionOrder: string[]; // randomized each iteration
    private optionTexts: string[]; // can be sampled
    private optionResources: string[][]; // can be sampled
    private optionTags: Object;
    // response data
    private selectedPosition: number[];
    private selectedID: string[]; // redundant but used by RunIf
    private selectedText: string[]; // needed for text options
    private correct;

    constructor(pageID: string, pageText: string, condition: string, item: string, itemTags: Object, containers: string[], tags: Object, resources: string[]){
        this.pageID = pageID;
        this.pageText = pageText;
        this.condition = condition;
        this.itemID = item;
        this.itemTags = itemTags;
        this.blockIDs = containers;
        this.pageTags = tags;
        this.pageResources = resources;
    }

    getPageID(){
        return this.pageID;
    }

    addOptionData(optionOrder, optionText, optionResources, optionTags){
        this.optionOrder = optionOrder;
        this.optionTexts = optionText;
        this.optionResources = optionResources;
        this.optionTags = this.zipOptionTags(optionTags);
    }

    addResponseData(selectedPosition, selectedID, selectedText, correct){
        this.selectedPosition = selectedPosition;
        this.selectedID = selectedID;
        this.selectedText = selectedText;
        this.correct = correct;
    }

    getStartTime(){
        return this.startTime;
    }

    setStartTime(startTime){
        this.startTime = startTime;
    }

    setEndTime(endTime){
        this.endTime = endTime;
    }

    setIteration(iteration){
        this.iteration = iteration;
    }

    inBlock(blockID){
        return _.contains(this.blockIDs, blockID);
    }

    reset(): TrialRecord {
        return new TrialRecord(this.pageID, this.pageText, this.condition, this.itemID, this.itemTags, this.blockIDs, this.pageTags, this.pageResources);
    }

    zipOptionTags(optionTags: any[]): Object{
        // optionTags: [{tag1: option1value, tag2: option1value}, {tag1: option2value}, ...]
        // want: {tag1: [option1value, option2value, ...], tag2: [option1value, 'NA', ...], ...}
        var optionTagNames: string[] = _.union.apply(_, _.map(optionTags, (t) => {return _.keys(t)}));
        var tagObject = {};
        _.each(optionTagNames, (tag) => {
            var values = _.map(optionTags, (optionObject) => {
                return _.has(optionObject, tag) ? optionObject[tag] : 'NA';
            });
            tagObject[tag] = values;
        });
        return tagObject;
    }

    responseGiven(optionID){
        return _.contains(this.selectedID, optionID);
    }

    textMatch(regex){
        if (this.selectedID.length === 1){
            return this.selectedText[0].search(regex) >= 0;
        } else {
            return false;
        }
    }

   writeData(){
        var row = {
            PageID: this.pageID,
            PageText: this.pageText,
            ItemID: this.itemID,
            BlockIDs: this.blockIDs,
            StartTime: this.startTime,
            EndTime: this.endTime,
            Iteration: this.iteration,
            Condition: this.condition,
            SelectedID: this.selectedID,
            SelectedText: this.selectedText,
            Correct: this.correct,
            OptionOrder: this.optionOrder,
            SelectedPosition: this.selectedPosition,
            PageResources: this.pageResources,
            OptionTexts: this.optionTexts,
            OptionResources: this.optionResources
            }
        _.extend(row, this.itemTags, this.pageTags, this.optionTags);
        return row;
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
        // var newRecord = jQuery.extend(true, {}, pageRecord); // deep copy to avoid corruption in training loops
        var pageID = pageRecord.getPageID();
        if (!_.has(this.trialRecords, pageID)){
            pageRecord.setIteration(1);
            this.trialRecords[pageID] = [pageRecord];
        } else {
            pageRecord.setIteration(this.trialRecords[pageID].length + 1);
            this.trialRecords[pageID].push(pageRecord);
        }
    }

    getPermutation(): number {
        return this.permutation;
    }

    private getLatestTrialRecord(pageID: string): TrialRecord {
        if (_.has(this.trialRecords, pageID)) {
            var pageResponses: TrialRecord[] = this.trialRecords[pageID];
            return _.last(pageResponses);
        } else {
            return null;
        }
    }

    responseGiven(pageID: string, optionID: string): boolean {
        var latestRecord = this.getLatestTrialRecord(pageID);
        if (latestRecord) {
            return latestRecord.responseGiven(optionID);
        } else {
            return false;
        }
    }

    textMatch(pageID: string, regex: string): boolean {
        var latestRecord = this.getLatestTrialRecord(pageID);
        if (latestRecord){
            return latestRecord.textMatch(regex);
        } else {
            return false;
        }
    }

    public getBlockGrades(blockID: string): boolean[] {
        // get the last iteration of each page
        var recentRecords: TrialRecord[] = _.map(this.trialRecords, (tr: TrialRecord[]) => {return _.last(tr)});
        // get only records contained by the given block
        var relevantRecords: TrialRecord[] = _.filter(recentRecords, (tr: TrialRecord) => {
            return tr.inBlock(blockID);
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
        var dataObjects = _.map(orderedRecords, (r) => {return r.writeData()});
        _.each(dataObjects, this.psiturk.recordTrialData);
        this.psiturk.saveData({success: this.psiturk.completeHIT, error: this.psiturk.completeHIT});
    }

    private sortByStart(records: TrialRecord[]): TrialRecord[] {
        return records.sort((r1, r2) => {return r1.getStartTime() - r2.getStartTime()});
    }

}
