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

// Whenever we hit an indented block, make sure all preceding
// empty lines are made to have this indentation level
function normalizeBlocks(input) {

    var numberOfLinesToIndent = 0,
        thisLineContainsStuff = false,
        thisLinesIndentation = '',
        out = '';

    for (var i = 0; i < input.length; i++) {

        var chr = input[i];

        if (chr === '\n') {
            if (!thisLineContainsStuff) {
                numberOfLinesToIndent++;
            }
            else {
                out += '\n';
            }
            thisLineContainsStuff = false;
            thisLinesIndentation = '';
            continue;
        }

        if (!thisLineContainsStuff && (chr === ' ' || chr === '\t')) {
            thisLinesIndentation += chr;
            continue;
        }

        if (chr !== ' ' || chr !== '\t') {
            
            if (!thisLineContainsStuff) {
                for (var j = 0; j < numberOfLinesToIndent; j++) {
                    out += thisLinesIndentation + '\n';
                }
                out += thisLinesIndentation + chr;
            }
            else {
                out += chr;
            }
            numberOfLinesToIndent = 0;
            thisLineContainsStuff = true;

        }

    }

    return out;

}

exec('./node_modules/pegjs/bin/pegjs parser.peg parser.js', function (error, stdout, stderr) {
    
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
        
        input = normalizeBlocks(input);

        try {
            var ast = parser.parse(input);
        }
        catch (e) {
            console.log('Error at line ' + e.line + ', character ' + e.column);
            console.log(e.message)
            process.exit(1);
        }
        var out = ast.toJS();

        write(out);
    });
});