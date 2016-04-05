class Item(Component):
    def __init__(self, contents, id_str = None, condition = None, tags = None, run_if = None, **kwargs):
        '''
        contents: string, Page, or [Page]. Items contain one or more Pages and display
        their Pages in order. If contents is a string, a Page will be made with that string
        as its text.

        id_str: String, optional, an identifier for this item unique among all
        items in the experiment.

        condition: string, the condition this Item belongs to in the
        experimental manipulation. Used if this Item is in a block where
        pseudorandom is True, to keep Items with the same condition from
        appearing in a row. Can also be SampleFrom.

        tags: {string: string}, a dictionary for any metadata you want to
        associate with this Item. The keys of the dictionary will become
        columns in your output file. It will not be used in the experiment,
        but will be passed through to the data file.

        run_if: RunIf, optional. If given, this Item will only display if its
        condition is satisfied.
        '''
        self._set_id(id_str)
        self.contents = contents
        if condition != None:
            self.condition = condition
        if tags != None:
            self.tags = tags
        if run_if != None:
            self.run_if = run_if

    def comp(self):
        self.compile_item()
        self.compile_feedback()
        super(Item, self).comp()
        return self

    def _validate(self):
        if not type(self.contents) == str and \
            not (type(self.contents) == list and isinstance(self.contents[0], Page)) and \
            not isinstance(self.contents, Page):
                raise ValueError, '''Item must have a string, Page, or list of Pages as its first argument.'''

    def compile_item(self):
        if type(self.contents) == str or isinstance(self.contents, SampleFrom):
            self.pages = [Page(self.contents)]
        elif type(self.contents) == list:
            self.pages = self.contents
        else:
            self.pages = [self.contents]
        del self.contents
        return self

    def compile_feedback(self):
        '''Feedback is a string or Page to run either unconditionally after a Page,
        or conditionally after an Option is chosen. Remove this variable and instantiate
        the Page with a RunIf if needed.'''
        new_pages = []
        for (i, page) in enumerate(self.pages):
            feedback_pages = []
            if hasattr(page, 'feedback'):
                page_feedback = page.feedback if isinstance(page.feedback, Page) else Page(page.feedback)
                feedback_pages.append(page_feedback)
                del page.feedback
            if hasattr(page, 'options'):
                for option in page.options:
                    if hasattr(option, 'feedback'):
                        option_feedback = None
                        run_if = RunIf(page = page, option = option)
                        if isinstance(option.feedback, Page):
                            option_feedback = option.feedback
                            option_feedback.run_if = run_if
                        else:
                            option_feedback = Page(option.feedback, run_if = run_if)
                        feedback_pages.append(option_feedback)
                        del option.feedback
            new_pages.append(page)
            new_pages += feedback_pages
        self.pages = new_pages
        return self
