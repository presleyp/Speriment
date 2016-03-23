/// <reference path="page.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

interface Viewable {
    text;
    id: string;
    resourceNames;

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

function makeResource(resource, page): any { // TODO Resource enum
    var fileTypeMap = {'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'pdf':
        'img', 'gif': 'img', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'mp4':
        'video', 'webm': 'video'};
    if (!_.has(resource, 'source')){ // if sampled string
        resource = {source: resource, autoplay: false, controls: true};
    }
    if (!resource.mediaType) {
        var extension = resource.source.split('.').pop().toLowerCase();
        resource.mediaType = fileTypeMap[extension];
    }
    if (resource.mediaType === 'img') {
        var image = new Image();
        image.src = resource.source;
        image.alt = resource.source;
        return image;
    } else {
        var res = (resource.mediaType == 'audio') ? new Audio() : document.createElement('video');
        res.src = resource.source;
        res.preload = 'auto'; // this is default but just in case
        if (resource.autoplay){
            res.autoplay = true;
        }
        if (resource.controls){
            res.controls = true;
        } else {
            res.autoplay = true; // can't play without at least one of controls and autoplay
        }
        if (resource.required){
            page.waitForResource();
            $(res).on('ended', (e: Event) => {page.ready()});
        }
        return res;
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
