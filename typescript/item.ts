/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="resettable.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class Item implements Resettable {
    id: string;
    contents: Page[];
    oldContents: Page[];

    constructor(jsonItem, public block){
        this.id = jsonItem.id;
        this.contents = jsonItem.pages;
        this.condition = this.getCondition(jsonItem.condition);
    }

    getCondition(cond) {
        if (!_.isUndefined(cond)) {
            return cond;
        } else {
            conds = _.pluck(this.contents, 'condition');
            return _.find(conds, (c) => !_.isUndefined(c););
        }
    }

    run(experimentRecord: ExperimentRecord): void{
        if _.isEmpty(this.contents){
            this.block.run(experimentRecord);
        } else {
            runChild(this.contents, this.oldContents, experimentRecord);
        }
    }

    reset(): void {
        reset(this.contents, this.oldContents);
    }

}
