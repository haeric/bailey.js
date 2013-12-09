#!/usr/bin/env node

var PEG = require('pegjs');
var argv = require('optimist').argv;
var fs = require('fs');

var source = argv._[0];
var target = argv._[1];

if (!source) {
    console.error('Arguments: node karsk.js sourcefile [targetfile]')
    process.exit(1);
}

function write (text) {

    if (target) {
        fs.writeFile(target, text, function(err) {
            if (err) { console.error(err); }
        });
    }
    else {
        console.log(text);
    }
}

fs.readFile('parser.peg', 'utf8', function(err, parserData) {
    fs.readFile(source, 'utf8', function (err, input) {
        var parser = PEG.buildParser(parserData);
        var ast = parser.parse(input);

        var out = ast.map(function(item){
            return item.toJS();
        }).join('\n');

        write(out);
    });
});