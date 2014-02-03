Package.describe({
    summary: "MessageFormat support, the Meteor way"
});

Npm.depends({
  "walk": "2.2.1"
});

Package.on_use(function (api) {
	api.use(['headers', 'underscore'], ['client', 'server']);
	api.use(['handlebars', 'templating', 'session', 'deps'], 'client');

	// Iron Router will be required until Issue #1358 is fixed
	// For now we're kind of coding like it's required
	api.use('iron-router', ['client', 'server']);

	api.add_files('lib/messageformat.js/messageformat.js', ['client', 'server']);
	api.add_files(['messageformat.js', 'locale-all.js'], ['client', 'server']);  
	api.add_files('messageformat-server.js', 'server');
	api.add_files(['messageformat.html', 'messageformat-client.js', 'messageformat.css'], 'client');
	if (api.export)
		api.export(['mfPkg', 'mf'], ['client', 'server']);
});
