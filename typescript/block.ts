/// <reference path="experiment.ts"/>
/// <reference path="container.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class Block{

    id: string;
    container: Container;
    contents;
    runIf;
    oldContents;

    constructor(jsonBlock){
        jsonBlock = _.defaults(jsonBlock, {runIf: null});
        this.runIf = jsonBlock.runIf; // {pageID, optionID | regex}
        this.id = jsonBlock.id;
        this.oldContents = [];
    }


    tellLast(): void{}

    run(nextUp, experimentRecord: ExperimentRecord){}

    // whether this block should run, depending on a previous answer
    shouldRun(experimentRecord: ExperimentRecord): boolean {
        if (this.runIf){
            return experimentRecord.responseGiven(this.runIf);
        } else {
            return true;
        }
    }

    advance(experimentRecord: ExperimentRecord): void {
        if (!_.isEmpty(this.contents) && this.shouldRun(experimentRecord)){
            var nextUp = this.contents.shift();
            this.oldContents.push(nextUp);
            this.run(nextUp, experimentRecord);
        } else {
            this.container.advance(experimentRecord);
        }
    }
}

// an OuterBlock can only contain Blocks (InnerBlocks or OuterBlocks)
class OuterBlock extends Block implements Container{
    exchangeable;
    version: number;
    contents: Block[];

    constructor(jsonBlock, public container: Container){
        super(jsonBlock);
        jsonBlock = _.defaults(jsonBlock, {exchangeable: []});
        this.exchangeable = jsonBlock.exchangeable;
        this.version = container.version;
        this.contents = makeBlocks(jsonBlock.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable);
    }

    tellLast(){
        _.last<Block>(this.contents).tellLast();
    }

    run(block: Block, experimentRecord: ExperimentRecord){
        block.advance(experimentRecord);
    }

}

// an InnerBlock can only contain Pages or groups of Pages
class InnerBlock extends Block{
    contents: Page[];
    private latinSquare: boolean;
    private pseudorandom: boolean;
    private criterion: number;

    constructor(jsonBlock, public container: Container){
        super(jsonBlock);
        jsonBlock = _.defaults(jsonBlock, {latinSquare: false, pseudorandom: false, criterion: null});
        this.latinSquare = jsonBlock.latinSquare;
        this.pseudorandom = jsonBlock.pseudorandom;
        this.criterion = jsonBlock.criterion;
        if (jsonBlock.groups){
            this.contents = this.choosePages(jsonBlock.groups, container.version);
        } else {
            this.contents = this.makePages(jsonBlock.pages);
        }
        this.orderPages();
    }

    run(page: Page, experimentRecord: ExperimentRecord){
        page.display(experimentRecord);
    }

    tellLast(){
        _.last(this.contents).isLast = true;
    }

    private makePages(jsonPages): Page[] {
        var pages = _.map<any,Page>(jsonPages, (p)=>{
            if (p.options){
                return new Question(p, this);
            } else {
                return new Statement(p, this);
            }
        });
        return pages;
    }

    private choosePages(groups, version): Page[] {
        var pages = this.latinSquare ? this.chooseLatinSquare(groups, version) : this.chooseRandom(groups);
        return this.makePages(pages);
    }

    private orderPages(): void{
        if (this.pseudorandom){
            this.pseudorandomize();
        } else {
            this.contents = _.shuffle<Page>(this.contents);
        }
    }

    private chooseLatinSquare(groups, version): any[]{
        var numConditions = groups[0].length;
        var lengths = _.pluck(groups, "length");
        var pages = [];
        if (_.every(lengths, (l:number):boolean => {return l === lengths[0]})){
            for (var i = 0; i < groups.length; i++){
                var cond = (i + version) % numConditions;
                pages.push(groups[i][cond]);
            }
        } else {
            throw "Can't do Latin Square on groups of uneven sizes.";
        }
        return pages;
    }

    private chooseRandom(groups): any[]{
        var pages = _.map(groups, (g)=>{return _.sample(g)});
        return pages;
    }

    private swapInto(nextP: Page, pages: Page[]): Page[]{
        var conds = _.pluck(pages, 'condition');
        var cond = nextP.condition;
        var swappable = _.map(_.range(pages.length), (i):boolean =>{
            var firstIndex = (i === 0) ? 0 : i-1;
            return _.isEmpty(_.intersection(conds.slice(firstIndex, i+2), [cond]));
        });
        var swapTo = _.indexOf(swappable, true);
        if (swapTo > -1){
            pages.push(pages[swapTo]);
            pages[swapTo] = nextP;
            return pages;
        } else {
            throw "Pseudorandomization may not work if there are not an equal number of all conditions.";
        }
    }

    private pseudorandomize(): void{
        if (_.any(this.contents, (page: Page) => {return _.isUndefined(page.condition);})){
            throw "Can't pseudorandomize if not all pages have a condition.";
        }
        var pages: Page[] = [];
        var remaining: Page[] = _.shuffle<Page>(this.contents);
        pages.push(remaining.shift());
        _.each(_.range(remaining.length), (i) => {
            var conds = _.pluck(remaining, 'condition');
            var cond = _.last(pages).condition;
            var addable = _.map(conds, (c)=>{
                return c != cond;
            });
            var addFrom = _.indexOf(addable, true);
            if (addFrom > -1){
                pages.push(remaining.splice(addFrom, 1)[0]);
            } else {
                var nextP: Page = remaining.shift();
                pages = this.swapInto(nextP, pages);
            }
        });
        this.contents = pages;
    }

    //TODO move to Block
    // have to meet or exceed criterion to move on; otherwise you repeat this block
    shouldLoop(experimentRecord: ExperimentRecord): boolean {
        if (!this.criterion){
            return false;
        } else {
            var grades: boolean[] = experimentRecord.getBlockGrades(this.id);
            var metric: number;

            // this.criterion is necessary percent correct
            if (this.criterion < 1){
                metric = _.compact(grades).length / grades.length;

            // this.criterion is necessary number correct in a row from the end
            } else {
                var lastIncorrect = _.lastIndexOf(grades, false);
                var metric = grades.length - (lastIncorrect + 1);
            }

            return metric < this.criterion;
        }
    }

    advance(experimentRecord: ExperimentRecord){
        if (_.isEmpty(this.contents) && this.shouldLoop(experimentRecord)){
            this.contents = this.oldContents;
            this.oldContents = [];
            this.orderPages();
        }
        super.advance(experimentRecord);
    }


}