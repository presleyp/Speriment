from component import Component

class Option(Component):
    def __init__(self, text = None, id_str = None, **kwargs):
        '''
        text: string or [string]. If the Option is not a text box, this is the label for the Option
        that will be displayed on the page. If the Option is a text box, this is
        not currently used. The string or any string(s) in the list can be
        SampleFrom.

        id_str: String, optional, an identifier unique among all options in this
        experiment. (Currently uniqueness in its page is sufficient but this may
        change in the future.)

        **kwargs: optional keyword arguments, which can include:

        feedback: string or Page (without options), the feedback to be displayed
        if this Option is chosen.  Can use SampleFrom to choose string.

        resources: [string], filenames of any images, audio, or video that
        should display with the option. Any resource can be SampleFrom. Make sure
        resources are inside your project directory.

        correct: If the Option is not a text box, a boolean representing whether
        this Option is correct. If the Option is a text box, a string
        representing a regular expression that any correct answers will match.
        For example, correct = 'hi.*' would mean that 'hi' and 'high' are both
        correct inputs.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Option. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        Note that the type of an Option (radio button, check box, dropdown, or
        text box) is determined based on its data and the attributes of its
        containing Page. It is not set directly in the Option.'''
        self._set_id(id_str)
        if text != None:
            self.text = text
        self._set_optional_args(**kwargs)
