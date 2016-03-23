class Resource:
    def __init__(self, source, media_type = None, autoplay = False, controls = True, required = False):
        self.source = source
        self.media_type = media_type
        self.autoplay = autoplay
        self.controls = controls
        self.required = required
