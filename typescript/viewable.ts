/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

interface Viewable {
    text;
    id: string;
    resources;

    wrapResource(resource: string): HTMLElement;
}

function setText(text, block: Block): string{
    if (_.isArray(text)){
        var textParts = _.map(text, (t) => setOrSample(t, block));
        return textParts.join('');
    } else {
        return setOrSample(text, block);
    }
}

function getFeedback(feedback, ident: string, item: Item): Statement{
    if (feedback){
        if (_.isObject(feedback)){
            return new Statement(feedback, item);
        } else {
            return new Statement({text: setOrSample(feedback, item.block), id: ident + "_feedback"}, item);
        }
    } else {
        return null;
    }
}

function makeResource(resource: string): string{ //TODO ogg can also be video, need to disambiguate
    var fileTypeMap = {'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'pdf':
        'img', 'gif': 'img', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'mp4':
        'video', 'webm': 'video'};
    var extension = resource.split('.').pop().toLowerCase();
    var fileType = fileTypeMap[extension];
    if (fileType === 'img') {
        var image = new Image();
        image.src = resource;
        return '<img src="' + resource + '" alt="' + resource + '">';
    } else {
        if (fileType == 'audio') {
            var audio = new Audio();
            audio.src = resource;
        }
        var mediaType = extension === 'mp3' ? 'audio/mpeg' : fileType + '/' + extension;
        return '<' + fileType + ' controls><source src="' + resource + '" type="' + mediaType + '"></' + fileType + '>';
    }
}

function setOrSample(property, block: Block){
    if (_.isObject(property) && _.has(property, 'sampleFrom')){
        return sampleFromBank(block, property);
    } else {
        return property;
    }
}

function getRow(property, bank){
    if (_.has(property, 'variable')){
        return bank[property.variable];
    } else if (_.has(property, 'notVariable')){
        var offset = Math.floor(Math.random() * (bank.length - 1) + 1);
        var index = (property.notVariable + offset) % bank.length;
        return bank[index];
    } else {
        var index = Math.floor(Math.random() * bank.length);
        return bank[index];
    }
}

function sampleFromBank(ancestor, property){
    if (_.has(ancestor.banks, property.sampleFrom)){
        var bank = ancestor.banks[property.sampleFrom];
        var row = getRow(property, bank);
        return _.has(property, 'field') ? row[property.field] : row;
    } else {
        return sampleFromBank(ancestor.container, property);
    }
}
