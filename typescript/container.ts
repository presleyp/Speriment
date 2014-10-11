
/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />


// A Container contains Blocks, so Experiments and OuterBlocks are Containers.
interface Container{
    exchangeable;
    version;
    contents;

    advance(experimentRecord: ExperimentRecord): void;
}

// functions Containers use

function makeBlocks(jsonBlocks, container: Container): Block[] {
    var blockList = _.map(jsonBlocks, (block):Block => {
            if (block.groups || block.pages){
                return new InnerBlock(block, container);
            } else {
                return new OuterBlock(block, container);
            }
        });
    return blockList;
}

function orderBlocks(blocks: Block[], exchangeable: string[]): Block[] {
    if (exchangeable.length < 2) { return blocks; }

    // positions that can be swapped into
    var exchangeableIndices: number[] = _.map(exchangeable, (id: string):number => {
                                                  var blockids = _.pluck(blocks, 'id');
                                                  return _.indexOf(blockids, id)
                                              });
    // ids of exchangeable blocks shuffled
    var exchangedIds: string[] = _.shuffle<string>(exchangeable);
    // exchangeable blocks in shuffled order
    var exchangedBlocks = _.map(exchangedIds, (id:string):Block => {
                                    return _.filter(blocks, (b:Block):boolean => {
                                        return b.id === id
                                    })[0]
                                });
    // pair up each available position with a block
    var pairs = _.zip(exchangeableIndices, exchangedBlocks);
    // fill each position with the block it's paired with
    _.each(pairs, (pair:any[]):void => {blocks[pair[0]] = pair[1]});
    return blocks;
}

function getContainers(block: Block): string[] {
    function getC(current, acc){
        if (current.container && current.container.id){
            return getC(current.container, acc.concat([current.container.id]));
        } else {
            return acc;
        }
    }

    return getC(block, [block.id]);
}

