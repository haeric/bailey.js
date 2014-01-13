#!/usr/bin/env node

var PEG = require('pegjs');
var argv = require('optimist').argv;
var fs = require('fs');
var exec = require('child_process').exec;

var source = argv._[0];
var target = argv._[1];

if (!source) {
    console.error('Arguments: node bailey.js sourcefile [targetfile]')
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

exec('pegjs parser.peg parser.js', function (error, stdout, stderr) {
    
    if (error) {
        console.log(error);
        process.exit(1);
    }

    if (stderr) {
        console.log(stderr);
        process.exit(1);
    }

    var parser = require('./parser.js');
    fs.readFile(source, 'utf8', function (err, input) {
        
        try {
            var ast = parser.parse(input);
        }
        catch (e) {
            console.log('Error at line ' + e.line + ', column ' + e.offset);
            console.log(e.message)
            process.exit(1);
        }
        var out = ast.toJS();

        write(out);
    });
});