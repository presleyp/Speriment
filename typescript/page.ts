/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="../node_modules/jquery/jquery.d.ts" />
/// <reference path="../node_modules/underscore/underscore.d.ts" />

class Page{
    public static dropdownThreshold: number = 7;
    public static SPACEKEY = 32;
    public text: string;
    public id: string;
    public condition: string;
    public resources: string[];
    public tags: string[];
    public record;

    constructor(jsonPage, public block){
        jsonPage = _.defaults(jsonPage, {condition: null, resources: null, tags: []});
        this.id = jsonPage.id;
        this.text = setOrSample(jsonPage.text, this.block);
        this.condition = setOrSample(jsonPage.condition, this.block);
        this.resources = _.map(jsonPage.resources, (r: string):string => {return this.makeResource(r, this.block)});
        this.tags = jsonPage.tags;
        this.record = new TrialRecord(this.id, this.text, this.condition, this.block.containerIDs, this.tags);
    }

    public advance(experimentRecord):void {}

    public disableNext(){
        $(CONTINUE).prop({disabled: true});
    }

    public enableNext(){
        $(CONTINUE).prop({disabled: false});
    }

    private makeResource(jsonResource: string, block: Block): string{ //TODO ogg can also be video, need to disambiguate
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

    public display(experimentRecord){
        $(CONTINUE).off('click').click((m:MouseEvent) => {this.advance(experimentRecord)});
        $(document).off('keyup').keypress((k:KeyboardEvent) => {
            if (k.which === Page.SPACEKEY && !$(CONTINUE).prop('disabled')){
                this.advance(experimentRecord);
            }
        });
        this.disableNext();
        $(OPTIONS).empty();
        $(PAGE).empty().append(this.text, this.resources);
        $(CONTINUE).show();
    }

}

class Question extends Page{
    private static LEFTKEY = 'f';
    private static RIGHTKEY = 'j';
    private ordered: boolean;
    private exclusive: boolean;
    private freetext: boolean;
    private keyboard: string[];
    private options: ResponseOption[];
    private feedback: Statement;

    constructor(jsonQuestion, block){
        super(jsonQuestion, block);
        var jQuestion = _.defaults(jsonQuestion, {ordered: false, exclusive: true, freetext: false, keyboard: null});
        this.ordered = jQuestion.ordered;
        this.exclusive = jQuestion.exclusive;
        this.freetext = jQuestion.freetext;
        if (jQuestion.keyboard){
            if (_.isBoolean(jQuestion.keyboard)){ // true -> default mappings
                jQuestion.keyboard = [Question.LEFTKEY, Question.RIGHTKEY];
            } else if (jQuestion.keyboard.length !== jQuestion.options.length){ // TODO python validation
                jQuestion.keyboard = null;
            }
        }
        this.keyboard = jQuestion.keyboard;
        if (!_.isUndefined(jQuestion.feedback)){ //TODO will probably want to use resources in feedback
            this.feedback = new Statement({text: setOrSample(jQuestion.feedback, block), id: this.id + "_feedback"}, block);
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
        if (this.keyboard){
            _.each(this.options, (o, i) => {o.useKey(this.keyboard[i].charCodeAt(0))});
        }
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

    private recordResponses(selected: ResponseOption[]){
        // ids of selections and value of text
        var responses: string[][] = _.map(selected, (s) => {return s.getResponse()});
        var response_parts = _.zip.apply(_, responses);
        this.record.selectedID = response_parts[0];
        this.record.selectedText = response_parts[1];
        this.record.selectedPosition = _.map(selected, (s) => {return _.indexOf(this.options, s);});
        this.record.optionTags = _.zip.apply(_, _.pluck(selected, 'tags'));
    }

    private recordCorrect(selected: ResponseOption[]){
        this.record.correct = _.map(selected, (s) => {return s.isCorrect()});
    }

    private orderOptions(): void{
        if (this.ordered){
            if (Math.random() > 0.5){
                this.options = this.options.reverse();
            }
        } else {
            this.options = _.shuffle<ResponseOption>(this.options);
        }
        this.recordOptionOrder();
    }

    private recordOptionOrder(){
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
