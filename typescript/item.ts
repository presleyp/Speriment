/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="resettable.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class Item implements Resettable {
    id: string;
    condition: string;
    contents: Page[];
    oldContents: Page[];

    constructor(jsonItem, public block){
        this.id = jsonItem.id;
        this.contents = makePages(jsonItem.pages, this);
        this.condition = this.getCondition(jsonItem.condition);
    }

    getCondition(cond): string {
        if (!_.isUndefined(cond)) {
            return cond;
        } else {
            var conds = _.pluck(this.contents, 'condition');
            return _.find(conds, (c) => !_.isUndefined(c));
        }
    }

    run(experimentRecord: ExperimentRecord): void {
        if (_.isEmpty(this.contents)){
            this.block.run(experimentRecord);
        } else {
            runChild(this.contents, this.oldContents, experimentRecord);
        }
    }

    reset(): void {
        var newContents = resetContents(this.contents, this.oldContents);
        this.contents = newContents.contents;
        this.oldContents = newContents.oldContents;
    }

}
