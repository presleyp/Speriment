/// <reference path="survey.ts"/>
/// <reference path="block.ts"/>
/// <reference path="option.ts"/>
/// <reference path="node_modules/jquery/jquery.d.ts" />
/// <reference path="node_modules/underscore/underscore.d.ts" />

// function record(pageID, pageRecord){
//     responses[pageID] = pageRecord;
// }


class Page{
    public static dropdownThreshold: number = 7;
    public text: string;
    public id: string;
    public condition: string;
    public isLast: boolean;
    public record;

    constructor(jsonPage, public block){
        jsonPage = _.defaults(jsonPage, {condition: null, resources: null});
        this.id = jsonPage.id;
        this.text = jsonPage.text;
        this.condition = jsonPage.condition;
        var containers = getContainers(block);
        this.record = new TrialRecord(this.id, this.condition, containers);
    }

    public advance(experimentRecord):void {}

    public disableNext(){
        $(CONTINUE).prop({disabled: true});
        if (this.isLast){
            $(BREAKOFF).show();
        }
    }

    public enableNext(){
        $(CONTINUE).prop({disabled: false});
        if (this.isLast){
            $(BREAKOFF).hide();
        }
    }

    public nextToSubmit(experimentRecord){
        $(CONTINUE).attr({type: "submit", value: "Submit", form: "surveyman"});
        $(CONTINUE).off('click').click((m:MouseEvent) => {this.finish(experimentRecord)});
    }

    public display(experimentRecord){
        if (this.isLast){
            this.nextToSubmit(experimentRecord);
        } else {
            $(CONTINUE).off('click').click((m:MouseEvent) => {this.advance(experimentRecord)});
        }
        this.disableNext();
        $(OPTIONS).empty();
        $(PAGE).empty().append(this.text);
    }

    public finish(experimentRecord) {
        experimentRecord.addRecord(this.record);
        experimentRecord.submitRecords();
    }

}

class Question extends Page{
    private ordered: boolean;
    private exclusive: boolean;
    private freetext: boolean;
    private options: ResponseOption[];
    private answer: Statement;

    constructor(jsonQuestion, block){
        super(jsonQuestion, block);
        var jQuestion = _.defaults(jsonQuestion, {ordered: false, exclusive: true, freetext: false});
        this.ordered = jQuestion.ordered;
        this.exclusive = jQuestion.exclusive;
        this.freetext = jQuestion.freetext;
        if (jQuestion.answer){
            this.answer = new Statement({text: jQuestion.answer, id: this.id + "_answer"}, block);
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
        // answers that should be displayed to the respondent
        var optionAnswers: Statement[] = _.compact(_.map(selected, (o) => {return o.getAnswer();}));

        this.recordResponses(selected);
        this.recordCorrect(selected);
        // record(this.id, this.record);
        experimentRecord.addRecord(this.record);

        if (!_.isEmpty(optionAnswers) && this.exclusive){ // ignoring option-by-option answers if nonexclusive
            optionAnswers[0].display(experimentRecord);
        } else if (this.answer){
            this.answer.display(experimentRecord);
        } else {
            this.block.advance(experimentRecord);
        }
    }

    public recordResponses(selected: ResponseOption[]){
        // ids of selections and value of text
        var responses: string[] = _.map(selected, (s) => {return s.getResponse()});
        this.record.selected = responses;
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
        // record(this.id, this.record);
        experimentRecord.addRecord(this.record);
        this.block.advance(experimentRecord);
    }

}
