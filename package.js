Package.describe({
    summary: "MessageFormat support for Meteor"
});

Package.on_use(function (api) {
	// api.use('jquery', 'client');
    api.add_files('lib/messageformat.js/messageformat.js', 'client');
    api.add_files('messageformat.js', 'client');
});
