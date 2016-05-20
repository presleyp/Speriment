/// <reference path="experiment.ts"/>
/// <reference path="block.ts"/>
/// <reference path="page.ts"/>
/// <reference path="viewable.ts"/>
/// <reference path="../typings/jquery/jquery.d.ts" />
/// <reference path="../typings/underscore/underscore.d.ts" />

class ResponseOption implements Viewable, Resettable{

    public text: string;
    public id: string;
    public feedback: Statement;
    public correct: boolean;
    public tags;
    public resourceNames: string[];
    public resources: string[];
    public runIf: RunIf;
    public element;

    constructor(jsonOption, public question: Question){
        jsonOption = _.defaults(jsonOption, {feedback: null, correct: null, tags: [], text: null, resources: null});
        this.id = jsonOption.id;
        this.text = setText(jsonOption.text, this.question.block);
        this.feedback = getFeedback(jsonOption.feedback, this.id, this.question.item);
        this.resourceNames = _.map(jsonOption.resources, (r) => {return setOrSample(r, this.question.block)});
        this.correct = jsonOption.correct; // has to be specified as false in the input for radio/check/dropdown if it should count as wrong
        _.each(jsonOption.tags, (value, key) => {jsonOption.tags[key] = setOrSample(jsonOption.tags[key], this.question.block)});
        this.runIf = createRunIf(jsonOption.runIf);
        this.tags = jsonOption.tags;
    }

    public run(experimentRecord: ExperimentRecord){
        if (this.runIf.shouldRun(experimentRecord)){
            this.display();
        }
    }

    public display(){}

    public getResponse(){
        return [this.id, this.text];
    }

    public onChange(){
        if ($(OPTIONS+" :checked").length !== 0){
            this.question.enableNext();
        } else {
            this.question.disableNext();
        }
    }

    public selected(): boolean {
        return $('#'+this.id).is(':checked');
    }

    public isCorrect(){
        return this.correct;
    }

    public reset(){
        if (this.feedback){
            this.feedback.reset();
        }
    }

    public useKey(key: number){
        $(CONTINUE).hide();
        var elem = '#' + this.id;
        $(elem).prop('disabled', 'true');
        $(document).keypress((k: KeyboardEvent) => {
            if (k.which === key){
                $(elem).prop('checked', (i, val) => {return !val});
                this.onChange();
            }
        });
    }

    public wrapResource(resource: string): HTMLElement{
        var par = document.createElement('p');
        $(par).append(resource);
        return par;
    }

    public wrapOption(parts){
        var optionDiv = document.createElement('div');
        $(optionDiv).addClass('response');
        $(optionDiv).append(parts);
        return optionDiv;
    }

    public enable(){
        $(this.element).prop({disabled: false});
    }

    public disable(){
        $(this.element).prop({disabled: true});
    }

}

class RadioOption extends ResponseOption{
    display(){
        var label = document.createElement("label");
        $(label).attr("for", this.id);
        $(label).append(this.text);

        this.element = document.createElement("input");
        $(this.element).attr({type: "radio", id: this.id, name: this.question.id});
        $(this.element).change((m:MouseEvent) => {this.onChange();});

        var resources = _.map(this.resourceNames, (rn) => makeResource(rn, this.question));
        var optionParts = _.map(resources, this.wrapResource).concat([label, this.element]);
        $(OPTIONS).append(this.wrapOption(optionParts));
    }

}

class CheckOption extends ResponseOption{
    display(){
        var label = document.createElement("label");
        $(label).attr("for", this.id);
        $(label).append(this.text);

        this.element = document.createElement("input");
        $(this.element).attr({type: "checkbox", id: this.id, name: this.question.id});
        $(this.element).change((m:MouseEvent) => {this.onChange();});

        var resources = _.map(this.resourceNames, (rn) => makeResource(rn, this.question));
        var optionParts = _.map(resources, this.wrapResource).concat([label, this.element]);
        $(OPTIONS).append(this.wrapOption(optionParts));
    }
}

class TextOption extends ResponseOption{
    private regex: RegExp;

    constructor(jsonOption, block){
        jsonOption = _.defaults(jsonOption, {text: "", correct: null});
        super(jsonOption, block);
        if (jsonOption.correct){
            this.regex = new RegExp(jsonOption.correct);
        }
    }

    display(){
        this.element = document.createElement("input");
        $(this.element).attr({type: "text", id: this.id, name: this.question.id});
        var resources = _.map(this.resourceNames, (rn) => makeResource(rn, this.question));
        var optionParts = _.map(resources, this.wrapResource).concat([this.element]);
        $(OPTIONS).append(this.wrapOption(optionParts));
        $(this.element).keypress((k:KeyboardEvent) => {
            // space shouldn't trigger clicking next
            k.stopPropagation();
            // this.onChange();
        });
        $(this.element).focus();
        this.question.enableNext(); // currently text options don't require answers
    }

    public getResponse(){
        return [this.id, $("#"+this.id).val()];
    }

    public onChange(){} // currently text options don't require answers

    public selected(){
        return this.getResponse()[1].length > 0;
    }

    public isCorrect(): boolean{
        if (this.regex){
            return Boolean(this.getResponse()[1].match(this.regex));
        } else {
            return null;
        }
    }

    useKey(key: number): void {} // nonsensical for text

}

class DropDownOption extends ResponseOption{
    private exclusive: boolean;

    constructor(jsonOption, block, exclusive){
        super(jsonOption, block);
        this.exclusive = exclusive;
    }

    display(){//TODO changed OPTION+" select" to select, check if it broke
        //if select element exists, append to it, otherwise create it first
        if ($("select").length === 0){
            this.element = document.createElement("select");
            if (!this.exclusive){
                $(this.element).attr({multiple: "multiple", name: this.question.id});
            }
            $(this.element).change((m:MouseEvent) => {this.onChange();});
            var resources = _.map(this.resourceNames, (rn) => makeResource(rn, this.question));
            var optionParts = _.map(resources, this.wrapResource).concat([this.element]);
            $(OPTIONS).append(this.wrapOption(optionParts));
            var defaultOption = document.createElement("option");
            $(defaultOption).attr("id", "defaultOption");
            $(this.element).append(defaultOption);
            $(this.element).change((e: Event) => {$("#defaultOption").prop({disabled: true})});
        }
        var option = document.createElement("option");
        $(option).attr("id", this.id);
        $(option).append(this.text);
        $("select").append(option);
    }

    useKey(key: number){
        $(CONTINUE).hide();
        $(this.element).prop('disabled', 'true');
        $(document).keypress((k: KeyboardEvent) => {
            if (k.which === key){
                $(this.element).prop('selected', (i, val) => {return !val});
                this.onChange();
            }
        });
    }

}
