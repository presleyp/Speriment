/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

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

function getFeedback(feedback, ident: string, block: Block): Statement{
    if (feedback){
        if (_.isObject(feedback)){
            return new Statement(feedback, block);
        } else {
            return new Statement({text: setOrSample(feedback, block), id: ident + "_feedback"}, block);
        }
    } else {
        return null;
    }
}

function makeResource(jsonResource: string, block: Block): string{ //TODO ogg can also be video, need to disambiguate
    var fileTypeMap = {'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'pdf':
        'img', 'gif': 'img', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'mp4':
        'video', 'webm': 'video'};
    var resource = setOrSample(jsonResource, block);
    var extension = resource.split('.').pop().toLowerCase();
    var fileType = fileTypeMap[extension];
    if (fileType === 'img') {
        return '<img src="' + resource + '" alt="' + resource + '">';
    } else {
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


