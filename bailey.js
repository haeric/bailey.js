#!/usr/bin/env node

var PEG = require('pegjs');
var argv = require('optimist').argv;
var fs = require('fs');
var exec = require('child_process').exec;
var walk = require('walk');
var path = require('path');
var rmdir = require('rimraf');
var mkdir = require('mkdirp');
var beautify = require('js-beautify').js_beautify;

var source = argv._[0];
var target = argv._[1];

if (!source || !target) {
    console.error('Arguments: node bailey.js sourcedir targetdir')
    process.exit(1);
}

if (source[0] == '/' || target[0] == '/') {
    console.error('bailey.js currently only takes relative paths.. sort of as a security feature.')
    process.exit(1);   
}

// Make sure the source and target are properly formatted
if (source[source.length-1] != '/') {
    source += '/'
}

if (target[target.length-1] != '/') {
    target += '/'
}

var options = {
    node: !!argv.node,
    removeComments: !!argv['remove-comments'],
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

        if (chr == '\r') {
            continue;
        }

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

function repeat(str, n) {
    var out = "";
    for (var i = 0; i < n; i++) {
        out += str;
    }
    return out;
}

function parse (parser, path, root, input) {

    input = normalizeBlocks(input);

    try {
        var ast = parser.parse(input);
    }
    catch (e) {
        console.log('Error at ' + path + ' line ' + e.line + ', character ' + e.column + ':');
        if (e.line > 2) console.log(input.split('\n')[e.line-2])
        console.log(input.split('\n')[e.line-1])
        console.log(repeat(" ", e.column-2), '^'); 
        console.log(e.message)
        process.exit(1);
    }
    options.root = root;
    options.filePath = path;
    options.parse = parse;
    return beautify(ast.toJS(options));

}

exec('npm run-script make-parser', function (error, stdout, stderr) {
    
    if (error) {
        console.log(error);
        process.exit(1);
    }

    if (stderr) {
        console.log(stderr);
        process.exit(1);
    }

    var parser = require('./parser.js');
    var walker = walk.walk(source, {
        followLinks: false
    });

    rmdir.sync(target);

    // From here on we need a ./ from the start to be removed
    source = source.replace(/^\.\//, '');
    target = target.replace(/^\.\//, '');

    walker.on("file", function(root, fileStats, next) {
        
        if (fileStats.name[0] == ".") {
            return next();
        }

        if (path.extname(fileStats.name) !== '.bs') {
            return next();
        }

        var sourcePath = path.join(root, fileStats.name);
        var targetRoot = root.replace(source, target);
        var targetPath = sourcePath.replace(source, target).replace('.bs', '.js');
        
        mkdir.sync(targetRoot);

        if (argv.verbose) {
            console.log(sourcePath, "->", targetPath);
        }

        fs.readFile(sourcePath, 'utf8', function (err, input) {
            
            if (err) { 
                return console.error(err); 
            }
            
            var parsed = parse(parser, sourcePath, root, input);   
            fs.writeFile(targetPath, parsed, function(err) {
                if (err) { 
                    console.error(err); 
                }
            });
            
            next();
        });
    });


});