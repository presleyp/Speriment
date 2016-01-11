/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="viewable.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class Page implements Viewable, Resettable{
    public static dropdownThreshold: number = 7;
    public static SPACEKEY = 32;
    public text: string;
    public id: string;
    public block: Block;
    public condition: string;
    public resourceNames: string[];
    public resources: string[];
    public tags;
    public record: TrialRecord;
    public runIf: RunIf;

    constructor(jsonPage, public item){
        jsonPage = _.defaults(jsonPage, {condition: null, resources: null, tags: []});
        this.block = this.item.block;
        this.id = jsonPage.id;
        this.text = setText(jsonPage.text, this.block);
        this.condition = setOrSample(jsonPage.condition, this.block);
        this.resourceNames = _.map(jsonPage.resources, (r) => {return setOrSample(r, this.block)});
        this.resources = _.map(this.resourceNames, makeResource);
        _.each(jsonPage.tags, (value, key) => {jsonPage.tags[key] = setOrSample(jsonPage.tags[key], this.block)});
        this.runIf = createRunIf(jsonPage.runIf);
        this.tags = jsonPage.tags;
        this.record = new TrialRecord(
                this.id,
                this.text,
                this.condition,
                this.item.id,
                this.item.tags,
                this.block.containerIDs,
                this.tags,
                this.resourceNames);
    }

    public advance(experimentRecord):void {}

    public disableNext(){
        $(CONTINUE).prop({disabled: true});
    }

    public enableNext(){
        $(CONTINUE).prop({disabled: false});
    }

    public wrapResource(resource: string): HTMLElement {
        var wrapper = document.createElement('div');
        $(wrapper).addClass('resource');
        $(wrapper).append(resource);
        return wrapper;
    }

    public run(experimentRecord){
        if (this.runIf.shouldRun(experimentRecord)) {
            $(CONTINUE).off('click').click((m:MouseEvent) => {this.advance(experimentRecord)});
            $(document).off('keypress').keypress((k:KeyboardEvent) => {
                if (k.which === Page.SPACEKEY && !$(CONTINUE).prop('disabled')){
                    this.advance(experimentRecord);
                    k.preventDefault();
                }
            });
            this.disableNext();
            $(OPTIONS).empty();
            $(PAGE).empty().append(this.text);
            $(RESOURCES).empty().append(_.map(this.resources, this.wrapResource));
            $(CONTINUE).show();
        } else {
            this.item.run();
        }
    }

    reset(){
        this.record = this.record.reset();
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
        var jQuestion = _.defaults(jsonQuestion, {ordered: false, exclusive: true, freetext: false, keyboard: null, feedback: null});
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
        this.feedback = getFeedback(jQuestion.feedback, this.id, this.item);
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
        this.orderOptions();
    }

    public run(experimentRecord): void{
        super.run(experimentRecord);
        _.each(this.options, (o:ResponseOption):void => {o.run(experimentRecord)});
        if (this.keyboard){
            _.each(this.options, (o, i) => {o.useKey(this.keyboard[i].charCodeAt(0))});
        }
        this.record.setStartTime(new Date().getTime());
    }

    public advance(experimentRecord): void{
        // recording
        this.record.setEndTime(new Date().getTime());
        var selected: ResponseOption[] = _.filter<ResponseOption>(this.options, (o) => {return o.selected()});
        this.recordResponses(selected);
        experimentRecord.addRecord(this.record);
        // feedback
        var optionFeedback: Statement[] = _.compact(_.pluck(selected, 'feedback'));
        if (!_.isEmpty(optionFeedback) && this.exclusive){ // ignoring option-by-option feedback if nonexclusive TODO
            optionFeedback[0].run(experimentRecord);
        } else if (this.feedback){
            this.feedback.run(experimentRecord);
        } else {
            this.item.run(experimentRecord);
        }
    }

    private recordResponses(selected: ResponseOption[]){
        // ids of selections and value of text
        var responses: string[][] = _.map(selected, (s) => {return s.getResponse()});
        var response_parts = _.zip.apply(_, responses);
        var selectedID = response_parts[0];
        var selectedText = response_parts[1];
        var selectedPosition = _.map(selected, (s) => {return _.indexOf(this.options, s);});
        var correct = _.map(selected, (s) => {return s.isCorrect()});
        this.record.addResponseData(selectedPosition, selectedID, selectedText, correct);
    }

    reset(){
        this.record = this.record.reset();
        this.orderOptions();
        if (this.feedback){
            this.feedback.reset();
        }
        _.each(this.options, (o) => {o.reset()});
    }

    private orderOptions(){
        if (this.ordered){
            if (Math.random() > 0.5){
                this.options = this.options.reverse();
            }
        } else {
            this.options = _.shuffle<ResponseOption>(this.options);
        }
        var optionOrder = _.pluck(this.options, 'id');
        var optionTexts = _.pluck(this.options, 'text');
        var optionResources = _.pluck(this.options, 'resourceNames');
        var optionTags = _.pluck(this.options, 'tags');
        this.record.addOptionData(optionOrder, optionTexts, optionResources, optionTags);
    }

}

class Statement extends Page{

    public run(experimentRecord){
        super.run(experimentRecord);
        this.record.setStartTime(new Date().getTime());
        this.enableNext();
    }

    public advance(experimentRecord){
        this.record.setEndTime(new Date().getTime());
        experimentRecord.addRecord(this.record);
        this.item.run(experimentRecord);
    }

}
