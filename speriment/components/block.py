from component import Component
from collections import Counter

class Block(Component):
    def __init__(self, pages = None, groups = None, blocks = None, id_str = None,
            exchangeable = [], counterbalance = [], treatments = [], latin_square = None, pseudorandom = None, **kwargs):
        '''
        Exactly one of pages, groups, and blocks must be provided.

        pages: [Page], the pages contained by this Block.

        groups: [[Page]], the groups contained by this Block. One page from each
        inner list of Pages will be displayed per participant.

        blocks: [Block], the blocks contained by this Block.

        id_str: String, optional, identifier unique among the Blocks in this
        experiment.

        exchangeable: [Block], only valid if contents is [Block]. A subset of
        contents. The Blocks in this list are allowed to switch places with each
        other. Blocks which are not exchangeable run only in the order in which
        they were given. Exchangeable blocks can be used for counterbalancing
        designs. For example, if there are three blocks, A, B, and C, and A and
        C are exchangeable, they can run in the order A, B, C or C, B, A.

        counterbalance: [Block], only valid if contents is [Block]. Works like
        exchangeable except exchangeable blocks are permuted randomly and
        counterbalance blocks are permuted deterministically, so that
        approximately the same number of participants will see each permutation.
        There should be no overlap between the blocks in exchangeable and the
        blocks in counterbalance.

        treatments: [[Block]], only valid if contents is [Block]. Uses
        num_counters in PsiTurk's config.txt. The blocks listed in treatments
        are specified as running conditionally, based on a variable that changes
        per participant and can take on as many values as you specify in
        num_counters in PsiTurk's config.txt. Each sublist of blocks shows which
        blocks will run when the counter is set to one of its possible
        variables. The number of sublists should equal num_counters. Blocks
        contained by this block that are not listed in treatments will run by
        default.

        latin_square: boolean, only valid if contents is [[Page]], that is,
        groups of Pages. If True, Pages are chosen from groups according to a
        Latin Square. This process requires that all groups in the Block have
        equal length. Additionally, the number of groups in the Block should be
        a multiple of the number of Pages in a group, and the Pages in each
        group should be in the same order in terms of their experimental
        condition. The condition attribute of Pages is not used to check the
        order.

        pseudorandom: boolean, only valid if contents is [[Pages]] or [Pages],
        all Pages have a condition attribute specified, and there will be an equal
        number of each Pages of each condition displayed (therefore it is not
        valid if contents is [[Pages]] and latin_square is False, because there's
        no guarantee about how many Pages of each condition will display). If True,
        no two Pages with the same condition will display in a row.

        **kwargs: optional keyword arguments, which can include:

        criterion: integer or float between 0 and 1. If integer, it represents
        the number of Pages that can be correct (the Page or its Options have a
        'correct' argument) and were correct in a row at the end of the Block.
        The idea is that participants may make mistakes at the beginning, but by
        the end of the Block should give correct answers for this long of a
        streak in order to show mastery. If it's a float, it represents a
        percentage of Pages that can be correct that were correct out of the
        entire block, not in a streak. Whether it's an integer or a float, this
        attribute signals that a participant should see the (reshuffled)
        contents of this Block as many times as it takes to reach criterion
        before moving on to later Blocks, and can be used to train participants
        before later testing them on novel information. Pages are reshuffled but
        Blocks are not re-exchanged.

        run_if: RunIf, gives a condition that must be met in order for this Block
        to display its contents, no matter the type of contents. See the RunIf
        documentation for more information.

        banks: {string: [string]} or {string: [{string: string}]}. A dictionary
        mapping bank names to banks, where a bank is a list of pieces of
        information (which may be simple - strings - or complex - dictionaries
        of strings). Within a bank, all items should be for the same purpose. If
        the pieces of information are complex, all dictionaries in the same bank
        should have the same keys. Bank information can be used for page text,
        option text, page feedback, option feedback, resource filenames, or page
        condition.

        cutoff: integer, defaults to 1. The maximum number of times (counting
        from 1) that a block can run. This keeps the experiment from running
        forever if the participant fails to learn well enough to ever reach the
        criterion. If you supply a criterion, you should also supply a cutoff.
        The cutoff applies to the entire block only, so if a block within this
        block loops, that will not affect the count.
        '''

        self._set_id(id_str)
        self._set_optional_args(**kwargs)
        if pages != None:
            self.pages = pages
        if groups != None:
            self.groups = groups
        if blocks != None:
            self.blocks = blocks
        self._validate_contents()
        self._set_optional_args(**kwargs)

        if exchangeable:
            self.exchangeable = [b.id_str for b in exchangeable]

        if counterbalance:
            self.counterbalance = [b.id_str for b in counterbalance]

        if latin_square:
            self.latin_square = latin_square
            self._validate_latin_square()

        if pseudorandom:
            self.pseudorandom = pseudorandom

        # TODO what about mutated blocks
        if treatments:
            self.treatments = treatments
            # for (i, treatment) in enumerate(treatments):
            #     for block in treatment:
            #         block.run_if = RunIf(permutation = i)

    def _validate(self):
        self._validate_contents()
        self._validate_pseudorandom()
        self._validate_latin_square()
        self._validate_counterbalancing()

    def _validate_counterbalancing(self):
        if hasattr(self, 'counterbalance') and hasattr(self, 'treatments'):
            print '''Warning: counterbalance and treatments depend on the same
            variable, so using both in one experiment will cause
            correlations between which blocks are used and how blocks are
            ordered. If you want these to be decided independently, change
            'counterbalance' to 'exchangeable' so the order will be decided
            randomly for each participant.'''


    def _validate_contents(self):
        content_types = [attribute for attribute in
                ['pages', 'groups', 'blocks'] if hasattr(self, attribute)]
        if len(content_types) != 1:
            raise ValueError, '''Block must have exactly one of pages, groups,
            and blocks.'''

    def _validate_pseudorandom(self):
        if hasattr(self, 'pseudorandom'):
            if hasattr(self, 'groups'):
                if self.latin_square == False:
                    raise ValueError, '''Can't choose pages from groups randomly and
                    ensure that pseudorandomization will work. Supply pages instead of
                    groups, change latin_square to True, or change pseudorandom to
                    False.'''
                try:
                    conditions = [page.condition for group in self.groups for page in
                        group]
                except AttributeError:
                    raise ValueError, '''In block {0}, can't pseudorandomize pages without
                    conditions.'''.format(self.id_str)
                cond_counter = Counter(conditions)
                cond_counts = cond_counter.values()
                num_cond_counts = len(set(cond_counts))
                if num_cond_counts != 1:
                    raise ValueError, '''Can't pseudorandomize pages if not all
                    conditions are represented the same number of times in the
                    block.'''
        #TODO elif hasattr('pages')

    def _validate_latin_square(self):
        pass
