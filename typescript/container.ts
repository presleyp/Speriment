
/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />


// A Container contains Blocks, so Experiments and OuterBlocks are Containers.
interface Container{
    exchangeable: string[];
    version: number;
    permutation: number;
    contents;
    containerIDs: string[];
    banks;

    run(experimentRecord: ExperimentRecord): void;
}

// functions Containers use

function makeBlocks(jsonBlocks, container: Container): Block[] {
    var blockList = _.map(jsonBlocks, (block):Block => {
            if ('blocks' in block){
                return new OuterBlock(block, container);
            } else {
                return new InnerBlock(block, container);
            }
        });
    return blockList;
}

function orderBlocks(blocks: Block[], exchangeable: string[], permutation: number, counterbalance: string[]): Block[] {
    var exchangedBlocks = reorderBlocks(blocks, exchangeable, _.shuffle);
    var counterbalanceBlockIds = makePermuter(permutation);
    var counterbalancedBlocks = reorderBlocks(exchangedBlocks, counterbalance, counterbalanceBlockIds);
    return counterbalancedBlocks;
}

function reorderBlocks(blocks: Block[], blockIDs: string[], orderingFunction): Block[] {
    var targetIndices: number[] = _.without(_.map(blocks, (b, i) => {
        if (_.contains(blockIDs, b.id)) {
            return i;
        } else {
            return null;
        }
    }), null);
    var reorderedIDs: string[] = orderingFunction(blockIDs);
    var blocksToReorder: Block[] = _.map(targetIndices, (i) => {return blocks[i]});
    var reorderedBlocks: Block[] = _.sortBy(blocksToReorder, (b) => {return _.indexOf(reorderedIDs, b.id)});
    _.each(targetIndices, (index, i): void => {
        blocks[index] = reorderedBlocks[i];
    });
    return blocks;
}

function makePermuter(permutation: number) {

    function counterbalanceBlockIds(counterbalance: string[]): string[] {
        var f = [];
        function factorial (n) { // performance?
          if (n == 0 || n == 1)
            return 1;
          if (f[n] > 0)
            return f[n];
          return f[n] = factorial(n-1) * n;
        }
        var sortedBlockIds = counterbalance.concat().sort();
        var orderedBlockIds = [];
        var perm = permutation;
        _.times(sortedBlockIds.length, (i) => {
            var size = sortedBlockIds.length;
            var binSize = factorial(size - 1);
            var index = Math.floor(perm / binSize);
            var nextBlockId = sortedBlockIds.splice(index, 1);
            orderedBlockIds.push(nextBlockId[0]);
            perm = perm % binSize;
        });
        return orderedBlockIds;
    }

    return counterbalanceBlockIds;
}

function shuffleBanks(banks){
    _.each(banks, (bankList, bankName) => {banks[bankName] = _.shuffle(bankList)});
    return banks;
}
