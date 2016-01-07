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
    oldContents: Page[] = [];

    constructor(jsonItem, public block: Block){
        this.id = this.getID(jsonItem.id, jsonItem.pages);
        this.contents = this.makePages(jsonItem.pages);
        this.condition = this.getCondition(jsonItem.condition);
    }

    getID(id, jsonPages): string {
        if (!_.isUndefined(id)) {
            return id;
        } else {
            return jsonPages[0].id + '-item';
        }
    }

    getCondition(cond): string {
        if (!_.isUndefined(cond)) {
            return cond;
        } else {
            var conds = _.pluck(this.contents, 'condition');
            return _.find(conds, (c) => !_.isUndefined(c));
        }
    }

    makePages(jsonPages): Page[] {
        var pages = _.map<any,Page>(jsonPages, (p)=>{
            if (p.options){
                return new Question(p, this);
            } else {
                return new Statement(p, this);
            }
        });
        return pages;
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
