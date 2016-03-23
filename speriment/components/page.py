from component import Component

class Page(Component):
    def __init__(self, text, options = None, id_str = None, **kwargs):
        '''
        text: string or [string], the text to be displayed on the page. The
        string or any string(s) in the list can be SampleFrom.

        options: [Option], optional, the answer choices to be displayed on the
        page.

        id_str: String, optional, an identifier for this page unique among all
        pages in the experiment.

        **kwargs: optional keyword arguments, which can include:

        feedback: string or Page (without options), the feedback to be displayed
        after an answer is chosen. Can use SampleFrom to choose string.

        correct: If freetext is False, a string representing the id_str of the
        correct Option. If freetext is True, a string representing a regular
        expression that a correct answer will match.

        resources: [string], filenames of any images, audio, or video that
        should display on the page. Any resource can be SampleFrom. Make sure
        resources are inside your project directory.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Page. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        condition: string, the condition this Page belongs to in the
        experimental manipulation. Used if this Page is in a block where
        pseudorandom is True, to keep Pages with the same condition from
        appearing in a row. Can also be SampleFrom.

        ordered: boolean, whether the Options for this Page need to be kept in
        the order in which they were given. If True, the Options may be reversed
        but will not be shuffled.

        exclusive: boolean, whether the participant can choose only one Option
        as their response.

        freetext: boolean, whether the Option is a text box rather than multiple
        choice.

        keyboard: boolean or [character], representing how Options are to be
        selected. If False, they are selected with the mouse. If True and there
        are exactly two Options, the left is selected with the f key and the
        right with the j key. If a list of characters, there must be as many
        characters as options. They will be mapped onto the options from left to
        right, as the options are displayed on the screen in shuffled order.
        '''
        self._set_id(id_str)
        self.text = text
        self._set_optional_args(**kwargs)
        if options:
            self.options = options

    def _validate_resources(self):
        pass # check for supported filetypes

    def _validate_freetext(self):
        if hasattr(self, 'freetext') and self.freetext == True:
            if len(self.options) > 1:
                raise ValueError, '''If freetext is true, the page has a text box
                as its option, so there shouldn't be more than one option.'''
            if hasattr(self.options[0], 'correct') and self.options[0].correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
            if hasattr(self, 'correct') and self.correct in [True, False]:
                raise ValueError, '''A text box option should have a regular
                expression rather than a boolean as its "correct" attribute.'''
       #TODO reverse is true

    def _validate_keyboard(self):
        if hasattr(self, 'keyboard'): 
            if type(self.keyboard) == list:
                if len(self.keyboard) != len(self.options):
                    raise ValueError, '''List of keybindings must have as many
                    entries as there are options in the page.'''
            elif self.keyboard:
                if len(self.options) != 2:
                    raise ValueError, '''Default keybindings only compatible with
                    pages with two options.'''


    def _validate(self):
        self._validate_resources()
        self._validate_freetext()
        self._validate_keyboard()
