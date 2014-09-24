/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />
var TrialRecord = (function () {
    function TrialRecord(containers) {
        this.blockIDs = containers;
    }
    return TrialRecord;
})();

/* Each record is actually a list of TrialRecords, in case the
page is displayed more than once (as in a training block). In many cases,
this will be a list of one item. But when the page was displayed multiple
time and it is a longer list, only the last item in the list - the final
attempt at the page - will be used by responseGiven and getBlockGrades.
So in an experiment where block 2 runs only if a certain answer was given in
block 1, or block 2 reruns if not enough correct answers were given in it,
these decisions will be made based on the most recent answers.
*/
var ExperimentRecord = (function () {
    function ExperimentRecord() {
        this.trialRecords = {};
    }
    ExperimentRecord.prototype.addRecord = function (pageID, trialRecord) {
        if (!_.has(this.trialRecords, pageID)) {
            trialRecord.iteration = 1;
            this.trialRecords[pageID] = [trialRecord];
        } else {
            var iter = this.trialRecords[pageID].length + 1;
            trialRecord.iteration = iter;
            this.trialRecords[pageID].push(trialRecord);
        }
    };

    ExperimentRecord.prototype.responseGiven = function (runIf) {
        if (_.has(this.trialRecords, runIf.pageID)) {
            var pageResponses = this.trialRecords[runIf.pageID];
            var response = _.last(pageResponses);
            if (runIf.optionID) {
                return _.contains(response.selected, runIf.optionID);
            } else if (runIf.regex && response.selected.length === 1) {
                return response.selected[0].search(runIf.regex) >= 0;
            } else {
                throw "runIf does not contain optionID or regex.";
            }
        } else {
            return false;
        }
    };

    ExperimentRecord.prototype.getBlockGrades = function (blockID) {
        // get the last iteration of each page
        var recentRecords = _.map(this.trialRecords, function (trlist) {
            return _.last(trlist);
        });

        // get only records contained by the given block
        var relevantRecords = _.filter(recentRecords, function (tr) {
            return _.contains(tr.blockIDs, blockID);
        });

        // gather correctness info, flatten nonexclusive responses
        var grades = _.flatten(_.pluck(relevantRecords, "correct"));

        // correct answers separated by pages with no specified answers count as in a row
        grades = _.reject(grades, function (g) {
            return _.isNull(g) || _.isUndefined(g);
        });
        return grades;
    };
    return ExperimentRecord;
})();
