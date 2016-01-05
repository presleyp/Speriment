interface Resettable{
    reset(): void;
    run(experimentRecord: ExperimentRecord): void;
}

function reset(contents, oldContents) {
    contents = oldContents;
    oldContents = [];
    _.each(contents, (c) => {c.reset()});
}

function runChild(contents, oldContents, experimentRecord: ExperimentRecord){
    var nextChild = contents.shift();
    oldContents.push(nextChild);
    nextChild.run(experimentRecord);
}
