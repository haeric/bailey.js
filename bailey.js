#!/usr/bin/env node

var argv = require('optimist').argv;
var fs = require('fs');
var walk = require('walk');
var path = require('path');
var watch = require('node-watch');
var mkdir = require('mkdirp');
var beautify = require('js-beautify').js_beautify;

require('colors');

// Command-line use of bailey.js
var ALLOWED_ARGS = {
    '_': 1,
    '$0': 1,
    'node': 1,
    'bare': 1, 
    'verbose': 1, 
    'remove-comments': 1,
    'watch': 1,
};

function main () {
    var source = argv._[0];
    var target = argv._[1];

    if (argv.help || argv.h) {
        usage();
    }

    if (argv.version) {
        return console.log(require('./package.json').version);
    }

    for (var key in argv) {
        if (argv._.length > 2) {
            usage(argv._.length + ' positional arguments? That is surely a bit too many, I only take 2!');
        }
        if (!(key in ALLOWED_ARGS)) {
            usage('I really have no idea what you mean by "' + key + '"...');
        }
    }

    if (!source || !target) {
        usage();
    }

    var options = {
        node: !!argv.node,
        removeComments: !!argv['remove-comments'],
        bare: !!argv.bare,
    };

    function compile(onDone) {
        parseFiles(source, target, options, function(sourcePath, targetPath) {
            if (argv.verbose) {
                console.log(sourcePath, "->", targetPath);
            }
        }, function(err) {
            console.error(err.toString().red);
            process.exit(1);
        }, onDone);
    }

    function startWatching () {
        argv.verbose = true;
        console.log('Watching ' + source + ' for changes...');
        watch(source, function(filename) {
            console.log('\n' + filename + ' changed, recompiling...\n-----------');
            compile(function(){
                console.log('-----------\nDone! Looking for more changes...');
            });
        });
    }

    compile(function () {
        if (argv.watch) {
            startWatching();
        }
    });

    
}

function usage (err) {
    if (err) console.error(err.red);
    console.error('Usage: bailey sourcedir/ targetdir/ [--node] [--remove-comments] [--bare] [--watch] [--verbose]');
    process.exit(1);
}

// Whenever we hit an indented block, make sure all preceding
// empty lines are made to have this indentation level
function normalizeBlocks (input) {

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

function parse (parser, input, options) {
    
    input = normalizeBlocks(input);

    options = options || {};
    options.removeComments = options.removeComments !== undefined ? options.removeComments : false;
    options.node = options.node !== undefined ? options.node : false;
    options.bare = options.bare !== undefined ? options.bare : false;
    options.parse = parse;

    var ast;
    try {
        ast = parser.parse(input);
    }
    catch (e) {
        throw new ParserError(e, input, options);
    }

    return beautify(ast.toJS(options));

}

function parseFiles (source, target, options, onFile, onError, onDone) {

    // Make sure the source and target are properly formatted
    if (source[source.length-1] != '/') {
        source += '/';
    }

    if (target[target.length-1] != '/') {
        target += '/';
    }

    var parser = require('./src/parser.js');
    var walker = walk.walk(source, {
        followLinks: false
    });

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

        fs.readFile(sourcePath, 'utf8', function (err, input) {
            
            if (err) { 
                return console.error(err); 
            }
            
            options.filePath = sourcePath;
            options.root = root;

            var parsed;
          
            try {
                parsed = parse(parser, input, options, onError);
            }
            catch (e) {
                if (onError) onError(e);
            }

            if (parsed !== undefined) {
                fs.writeFile(targetPath, parsed, function(err) {
                    if (err) { 
                        console.error(err); 
                    }
                    else if (onFile) {
                        onFile(sourcePath, targetPath);
                        next();
                    }
                });
                
            }

        });
    });

    walker.on("end", function () {
        if (onDone) onDone();
    });
}

function parseString (input, options) {
    var parser = require('./src/parser.js');
    return parse(parser, input, options);
}

function repeat (str, n) {
    var out = "";
    for (var i = 0; i < n; i++) {
        out += str;
    }
    return out;
}

function ParserError (error, input, options) {    
    this.message  = error.message;
    this.expected = error.expected;
    this.found    = error.found;
    this.offset   = error.offset;
    this.line     = error.line;
    this.column   = error.column;
    this.name     = 'ParserError';

    this.toString = function () {
        var lines = input.split('\n');
        return [
            error.name + ' at ' + options.filePath + ' line ' + error.line + ', character ' + error.column + ':',
            error.line > 2 ? lines[error.line-2] : '',
            lines[error.line-1],
            repeat(" ", error.column-1) + '^', 
            error.message,
        ].join('\n');
    };

}

ParserError.prototype = Object.create(Error);

if (!module.parent) {
    main();
}

module.exports.parseFiles = parseFiles;
module.exports.parseString = parseString;
module.exports.ParserError = ParserError;
