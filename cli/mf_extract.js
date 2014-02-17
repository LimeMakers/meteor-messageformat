#!/usr/bin/env node
var walk    = require('../.npm/package/node_modules/walk');
var fs 		= require('fs');
var _       = require('underscore');
var path	= require('path');
var files   = [];
var strings = {};
var projRoot;
var log = process.argv[2] == '-v';

for (projRoot = process.cwd();
	projRoot != '/' && !fs.existsSync(projRoot + '/.meteor/release');
	projRoot = path.normalize(projRoot + '/..'));

if (!fs.existsSync(projRoot + '/.meteor/release')) {
	console.log('Error: mf_extract must be run from inside a Meteor project directory')
	process.exit(1);
}

process.chdir(projRoot);

if (!fs.existsSync('server')) {
	console.log('Creating ./server directory');
	fs.mkdir('server');
}

mfPkg = {
	strings: {},
    addNative: function(strings, meta) {
    	this.strings = strings;
    }
};

if (fs.existsSync('server/mfExtracts.js'))
	eval(fs.readFileSync('server/mfExtracts.js').toString());

if (log) {
	var smart = JSON.parse(
		fs.readFileSync('./packages/messageformat/smart.json')
	);
	console.log('mf_extract, v' + smart.version);
	console.log('Project root: ' + projRoot);

}

var walker  = walk.walk('.', { followLinks: false });

walker.on('file', function(root, stat, next) {
    // Add this file to the list of files (skip .dirs)
    if (root.substr(0,3) != './.' && root.substr() != 'packages/messageformat' && stat.name.match(/html|js$/)) {
	    files.push(root + '/' + stat.name);
    }
    next();
});

walker.on('end', function() {
	var i = 0;
    _.each(files, function(file) {
    	data = fs.readFileSync(file, 'utf8');
    	if (file.match(/html$/))
			processHtml(file, data);
		else if (file.match(/js$/))
			processJS(file, data);
    });

	// Update mtime if modified, otherwise init ctime+mtime to now
	for (key in strings) {
		if (mfPkg.strings[key]) {
			strings[key].ctime = mfPkg.strings[key].ctime;
			if (strings[key].text != mfPkg.strings[key].text)
				strings[key].mtime = new Date().getTime();
			else if (mfPkg.strings[key].mtime)
				strings[key].mtime = mfPkg.strings[key].mtime;
		} else {
			strings[key].ctime = strings[key].mtime = new Date().getTime();
		}
	}

	// if a key existed before but not anymore, mark as removed
	for (key in mfPkg.strings) {
		if (!strings[key]) {
			strings[key] = mfPkg.strings[key];
			strings[key].removed = true;
			strings[key].mtime = new Date().getTime();
		}
	}

    serverStrings(strings);
});

function attrDict(string) {
	var result, out = {}, re = /(\w+)=(['"])(.*?)\2/g;
	while (result=re.exec(string)) {
		out[ result[1] ] = result[3];
	}
	return out;
}

var lastFile = null;
function logKey(file, key, text) {
	if (!log)
		return;

	if (file != lastFile) {
		lastFile = file;
		console.log('\n' + file);
	}

	console.log(key + ': "' + text.replace(/\s+/g, ' ') + '"');
}

function processHtml(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// {{mf "key" 'text' attr1=val1 attr2=val2 etc}}
	re = /{{mf (['"])(.*?)\1 ?(["'])(.*?)\3(.*?)}}/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		logKey(file, key, text);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			template: /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
				.exec(data.substring(0, result.index))[2]  // TODO, optimize
		};
	}

	// {{#mf KEY="key" attr2=val2 etc}}text{{/mf}}
	re = /{{#mf (.*?)}}\s*([^]*?)\s*{{\/mf}}/g;
	while (result = re.exec(data)) {
		var text = result[2], attributes = attrDict(result[1]), key = attributes.KEY;
		logKey(file, key, text);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			template: /<template .*name=(['"])(.*?)\1.*?>[\s\S]*?$/
				.exec(data.substring(0, result.index))[2]  // TODO, optimize
		};
	}
}

function processJS(file, data) {
	// XXX TODO, escaped quotes
	var result, re;

	// function blah(), blah = function(), helper('moo', function() {...
	// mf('test_key', params, 'test_text')

	re = /mf\s*\(\s*(['"])(.*?)\1\s*,\s.*?\s*,\s*(['"])(.*?)\3,?.*?\)/g;
	while (result = re.exec(data)) {
		var key = result[2], text = result[4], attributes = attrDict(result[5]);
		logKey(file, key, text);
		strings[key] = {
			key: key,
			text: text,
			file: file,
			line: data.substring(0, result.index).split('\n').length,
			func: /[\s\S]*\n*(.*?function.*?\([\s\S]*?\))[\s\S]*?$/
				.exec(data.substring(0, result.index))[1].replace(/^\s+|\s+$/g, '')
		};
	}
}

function serverStrings(strings) {
	var meta = { extractedAt: new Date().getTime() };
	meta.updatedAt = _.max(strings, function(s) { return s.mtime; }).mtime;

	var out = 'mfPkg.addNative(\n'
			+ JSON.stringify(strings, null, 2) + ', \n'
			+ JSON.stringify(meta, null, 2) + ');\n';

	fs.writeFile("server/mfExtracts.js", out);
}
