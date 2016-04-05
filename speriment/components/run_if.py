from speriment.utils import exactly_one

class RunIf:
    def __init__(self, item = None, page = None, option = None, regex = None, permutation =
            None):
        '''
        Exactly one of item, page, and permutation must be given.

        item: Item, the Item to look at to see which answer was given. Use only for Items
        that display only one page.

        page: Page, the Page to look at to see which answer was given.

        option: Option, optional. If given, the block containing this RunIf will
        only run if this Option was chosen the last time page was displayed.

        regex: string, optional. If given, the block containing this RunIf will
        only run if a response matching a regular expression made from the
        string regex was given the last time page was displayed.

        permutation: integer, optional. If given, the block containing this
        RunIf will only run if PsiTurk gives the experiment a permutation
        variable matching this integer. This requires editing the counterbalance
        setting in config.txt.

        The reason RunIfs depend on "the last time" their page was displayed is
        that Pages can display multiple times if they are in Blocks with a
        criterion.'''
        if item != None:
            self.item = item
        if page != None:
            self.page = page
        if option != None:
            self.option = option
        elif regex != None:
            self.regex = regex
        if permutation != None:
            self.permutation = permutation

    def _validate(self):
        exactly_one(self, ['item', 'page', 'permutation'])
        if hasattr(self, 'item'):
            item_contents = self.item.contents if hasattr(self.item, 'contents') else self.item.pages
            if not (type(item_contents) != list or len(item_contents) == 1):
                raise ValueError, '''Cannot set RunIf by Item if Item has more than one Page.'''

    def comp(self):
        if hasattr(self, 'page'):
            self.pageID = self.page.id_str if self.page.id_str else self.page.id
            del self.page
        if hasattr(self, 'option'):
            self.optionID = self.option.id_str if self.option.id_str else self.option.id
            del self.option
        if hasattr(self, 'item'):
            page = self.item.pages[0]
            self.pageID = page.id_str if page.id_str else page.id
            del self.item
        return self
