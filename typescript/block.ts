/// <reference path="experiment.ts"/>
/// <reference path="container.ts"/>
/// <reference path="page.ts"/>
/// <reference path="item.ts"/>
/// <reference path="option.ts"/>
/// <reference path="runif.ts"/>
/// <reference path="resettable.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class Block implements Resettable{
    id: string;
    containerIDs: string[];
    contents: Resettable[];
    runIf;
    banks;
    oldContents;
    criterion: number;
    /* After a block has run cutoff times (count from 1), it will stop even
     * if the criterion has not been reached. Blocks inside of it may end up
     * running more times than that if they also have criteria. */
    cutoff: number;
    /* Block iterations are separate from Page iterations. Page iterations get
     * recorded. Block iterations are just used to determine if the cutoff for
     * looping has been reached. */
    iteration: number;

    constructor(jsonBlock, public container: Container){
        jsonBlock = _.defaults(jsonBlock, {runIf: null, banks: {}, criterion: null, cutoff: 1});
        this.runIf = createRunIf(jsonBlock.runIf);
        this.id = jsonBlock.id;
        this.criterion = jsonBlock.criterion;
        this.iteration = 1;
        this.cutoff = jsonBlock.cutoff;
        this.banks = shuffleBanks(jsonBlock.banks);
        this.oldContents = [];
        this.containerIDs = this.container.containerIDs.concat(this.id);
    }

    run(experimentRecord: ExperimentRecord){
        var shouldRun = this.runIf.shouldRun(experimentRecord);
        var shouldLoop = this.shouldLoop(experimentRecord);
        var done = _.isEmpty(this.contents);
        if (!shouldRun || done && !shouldLoop) {
            this.container.run(experimentRecord);
        } else {
            if (done) {
                this.reset();
            }
            runChild(this.contents, this.oldContents, experimentRecord);
        }
    }

    // have to meet or exceed criterion to move on; otherwise you repeat this block
    shouldLoop(experimentRecord: ExperimentRecord): boolean {
        if (!this.criterion){
            return false;
        } else if (this.iteration >= this.cutoff) {
            return false;
        }
        else {
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

    reset(){
        this.iteration += 1;
        var newContents = resetContents(this.contents, this.oldContents);
        this.contents = newContents.contents;
        this.oldContents = newContents.oldContents;
    }

}

// an OuterBlock can only contain Blocks (InnerBlocks or OuterBlocks)
class OuterBlock extends Block implements Container{
    exchangeable: string[];
    counterbalance: string[];
    version: number;
    permutation: number;
    contents: Block[];

    constructor(jsonBlock, public container: Container){
        super(jsonBlock, container);
        jsonBlock = _.defaults(jsonBlock, {exchangeable: [], counterbalance: []});
        this.exchangeable = jsonBlock.exchangeable;
        this.counterbalance = jsonBlock.counterbalance;
        this.version = container.version;
        this.permutation = container.permutation;
        this.contents = makeBlocks(jsonBlock.blocks, this);
        this.contents = orderBlocks(this.contents, this.exchangeable, this.permutation, this.counterbalance);
    }

}

// an InnerBlock contains Items, pages which will be wrapped in Items, or groups of Items
class InnerBlock extends Block{
    contents: Item[];
    private latinSquare: boolean;
    private pseudorandom: boolean;

    constructor(jsonBlock, public container: Container){
        super(jsonBlock, container);
        jsonBlock = _.defaults(jsonBlock, {latinSquare: false, pseudorandom: false});
        this.latinSquare = jsonBlock.latinSquare;
        this.pseudorandom = jsonBlock.pseudorandom;
        if (jsonBlock.groups){
            this.contents = this.chooseItems(jsonBlock.groups, container.version);
        } else if (jsonBlock.items) {
            this.contents = this.makeItems(jsonBlock.items);
        } else { //TODO inelegant solution
            this.contents = this.makeItems(jsonBlock.pages);
        }
        this.orderItems();
    }

    reset(){
        super.reset();
        this.orderItems();
    }

    private chooseItems(groups, version): Item[] {
        var chosen = this.latinSquare ? this.chooseLatinSquare(groups, version) : this.chooseRandom(groups);
        return this.makeItems(chosen);
    }

    // If block or groups contains unwrapped pages, wrap them each in an Item
    private makeItems(jsonItems): Item[] {
        var items = _.map<any,Item>(jsonItems, (x) => {
            if (_.has(x, 'text') || _.has(x, 'options')){
                return new Item({pages: [x]}, this);
            } else {
                return new Item(x, this);
            }
        });
        return items;
    }

    private orderItems(): void{
        if (this.pseudorandom){
            this.pseudorandomize();
        } else {
            this.contents = _.shuffle<Item>(this.contents);
        }
    }

    private chooseLatinSquare(groups, version): any[]{
        var numConditions = groups[0].length;
        var lengths = _.pluck(groups, "length");
        var items = [];
        if (_.every(lengths, (l:number):boolean => {return l === lengths[0]})){
            for (var i = 0; i < groups.length; i++){
                var cond = (i + version) % numConditions;
                items.push(groups[i][cond]);
            }
        } else {
            throw "Can't do Latin Square on groups of uneven sizes.";
        }
        return items;
    }

    private chooseRandom(groups): any[]{
        var items = _.map(groups, (g)=>{return _.sample(g)});
        return items;
    }

    private swapInto(nextItem: Item, items: Item[]): Item[]{
        var conds = _.pluck(items, 'condition');
        var cond = nextItem.condition;
        var swappable = _.map(_.range(items.length), (i):boolean =>{
            var firstIndex = (i === 0) ? 0 : i-1;
            return _.isEmpty(_.intersection(conds.slice(firstIndex, i+2), [cond]));
        });
        var swapTo = _.indexOf(swappable, true);
        if (swapTo > -1){
            items.push(items[swapTo]);
            items[swapTo] = nextItem;
            return items;
        } else {
            throw "Pseudorandomization may not work if there are not an equal number of all conditions.";
        }
    }

    private pseudorandomize(): void{
        if (_.any(this.contents, (item: Item) => {return _.isUndefined(item.condition);})){
            throw "Can't pseudorandomize if not all pages have a condition.";
        }
        var items: Item[] = [];
        var remaining: Item[] = _.shuffle<Item>(this.contents);
        items.push(remaining.shift());
        _.each(_.range(remaining.length), (i) => {
            var conds = _.pluck(remaining, 'condition');
            var cond = _.last(items).condition;
            var addable = _.map(conds, (c)=>{
                return c != cond;
            });
            var addFrom = _.indexOf(addable, true);
            if (addFrom > -1){
                items.push(remaining.splice(addFrom, 1)[0]);
            } else {
                var nextItem: Item = remaining.shift();
                items = this.swapInto(nextItem, items);
            }
        });
        this.contents = items;
    }
}
