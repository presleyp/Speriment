/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class Page{
    public static dropdownThreshold: number = 7;
    public text: string;
    public id: string;
    public condition: string;
    public resources: string[];
    public tags: string[];
    // public isLast: boolean;
    public record;

    constructor(jsonPage, public block){
        jsonPage = _.defaults(jsonPage, {condition: null, resources: null, tags: []});
        this.id = jsonPage.id;
        this.text = jsonPage.text;
        this.condition = jsonPage.condition;
        this.resources = _.map(jsonPage.resources, this.makeResource);
        this.tags = jsonPage.tags;
        var containers = getContainers(block);
        this.record = new TrialRecord(this.id, this.text, this.condition, containers, this.tags);
    }

    public advance(experimentRecord):void {}

    public disableNext(){
        $(CONTINUE).prop({disabled: true});
        // if (this.isLast){
        //     $(BREAKOFF).show();
        // }
    }

    public enableNext(){
        $(CONTINUE).prop({disabled: false});
        // if (this.isLast){
        //     $(BREAKOFF).hide();
        // }
    }

    // public nextToSubmit(experimentRecord){
    //     $(CONTINUE).attr({type: "submit", value: "Submit"});
    //     $(CONTINUE).off('click').click((m:MouseEvent) => {this.finish(experimentRecord)});
    // }

    private makeResource(resource: string): string{ //TODO ogg can also be video, need to disambiguate
        var fileTypeMap = {'jpg': 'img', 'jpeg': 'img', 'png': 'img', 'pdf':
            'img', 'gif': 'img', 'mp3': 'audio', 'wav': 'audio', 'ogg': 'audio', 'mp4':
            'video', 'webm': 'video'};
        var extension = resource.split('.').pop().toLowerCase();
        var fileType = fileTypeMap[extension];
        if (fileType === 'img') {
            return '<img src="' + resource + '" alt="' + resource + '">';
        } else {
            var mediaType = extension === 'mp3' ? 'audio/mpeg' : fileType + '/' + extension;
            return '<' + fileType + ' controls><source src="' + resource + '" type="' + mediaType + '"></' + fileType + '>';
        }
    }

    public display(experimentRecord){
        // if (this.isLast){
        //     this.nextToSubmit(experimentRecord);
        // } 
        // else {
        $(CONTINUE).off('click').click((m:MouseEvent) => {this.advance(experimentRecord)});
        // }
        this.disableNext();
        $(OPTIONS).empty();
        $(PAGE).empty().append(this.text, this.resources);
    }

    // public finish(experimentRecord) {
    //     this.save(experimentRecord);
    //     experimentRecord.submitRecords();
    // }

}

class Question extends Page{
    private ordered: boolean;
    private exclusive: boolean;
    private freetext: boolean;
    private options: ResponseOption[];
    private feedback: Statement;

    constructor(jsonQuestion, block){
        super(jsonQuestion, block);
        var jQuestion = _.defaults(jsonQuestion, {ordered: false, exclusive: true, freetext: false});
        this.ordered = jQuestion.ordered;
        this.exclusive = jQuestion.exclusive;
        this.freetext = jQuestion.freetext;
        if (!_.isUndefined(jQuestion.feedback)){ //TODO will probably want to use resources in feedback
            this.feedback = new Statement({text: jQuestion.feedback, id: this.id + "_feedback"}, block);
        }
        this.options = _.map(jQuestion.options, (o):ResponseOption => {
            if (jQuestion.options.length > Page.dropdownThreshold){
                return new DropDownOption(o, this, this.exclusive);
            } else if (this.freetext){
                return new TextOption(o, this);
            } else if (this.exclusive){
                return new RadioOption(o, this);
            } else {
                return new CheckOption(o, this);
            }
        });
    }

    public display(experimentRecord): void{
        super.display(experimentRecord);
        this.orderOptions();
        _.each(this.options, (o:ResponseOption):void => {o.display()});
        this.record.startTime = new Date().getTime();
    }

    public advance(experimentRecord): void{
        this.record.endTime = new Date().getTime();
        var selected: ResponseOption[] = _.filter<ResponseOption>(this.options, (o) => {return o.selected()});
        // feedback that should be displayed to the respondent
        var optionFeedback: Statement[] = _.compact(_.map(selected, (o) => {return o.getFeedback();}));
        this.recordResponses(selected);
        this.recordCorrect(selected);
        experimentRecord.addRecord(this.record);

        if (!_.isEmpty(optionFeedback) && this.exclusive){ // ignoring option-by-option feedback if nonexclusive TODO
            optionFeedback[0].display(experimentRecord);
        } else if (this.feedback){
            this.feedback.display(experimentRecord);
        } else {
            this.block.advance(experimentRecord);
        }
    }

    public recordResponses(selected: ResponseOption[]){
        // ids of selections and value of text
        var responses: string[][] = _.map(selected, (s) => {return s.getResponse()});
        var response_parts = _.zip.apply(_, responses);
        this.record.selectedID = response_parts[0];
        this.record.selectedText = response_parts[1];
        this.record.selectedPosition = _.map(selected, (s) => {return _.indexOf(this.options, s);});
        this.record.optionTags = _.zip.apply(_, _.pluck(selected, 'tags'));
    }

    public recordCorrect(selected: ResponseOption[]){
        this.record.correct = _.map(selected, (s) => {return s.isCorrect()});
    }

    public orderOptions(): void{
        if (this.ordered){
            if (Math.random() > 0.5){
                this.options = this.options.reverse();
            }
        } else {
            this.options = _.shuffle<ResponseOption>(this.options);
        }
        this.recordOptionOrder();
    }

    public recordOptionOrder(){
        this.record.optionOrder = _.pluck(this.options, 'id');
    }

}

class Statement extends Page{

    public display(experimentRecord){
        super.display(experimentRecord);
        this.record.startTime = new Date().getTime();
        // setTimeout(() => {this.enableNext()}, 1000);
        this.enableNext();
    }

    public advance(experimentRecord){
        this.record.endTime = new Date().getTime();
        experimentRecord.addRecord(this.record);
        this.block.advance(experimentRecord);
    }

}
