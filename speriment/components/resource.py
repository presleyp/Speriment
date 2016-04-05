class Resource:
    def __init__(self, source, media_type = None, autoplay = False, controls = True, required = False):
        self.source = source
        self.media_type = media_type
        self.autoplay = autoplay
        self.controls = controls
        self.required = required

    def _validate(self):
        pass

    def comp(self):
        if hasattr(self, 'media_type'):
            self.mediaType = self.media_type
            del self.media_type
        return self
