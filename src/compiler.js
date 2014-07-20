
var fs = require('fs');
var walk = require('walk');
var path = require('path');
var mkdir = require('mkdirp');
var beautify = require('js-beautify').js_beautify;

require('colors');

var PARSER_PATH = './parser';

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
    options.strictStyleMode = options.strictStyleMode !== undefined ? options.strictStyleMode : true;
    options.parse = parse;

    var js;
    try {
        js = parser.parse(input).toJS(options);
    }
    catch (e) {
        throw new ParserError(e, input, options);
    }

    return beautify(js);

}

function parseFiles (source, target, options, onFile, onError, onDone) {

    // Make sure the source and target are properly formatted
    if (source[source.length-1] != '/') {
        source += '/';
    }

    if (target[target.length-1] != '/') {
        target += '/';
    }

    var parser = require(PARSER_PATH);
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
                        return;
                    }
                    if (onFile) {
                        onFile(sourcePath, targetPath);
                    }
                    next();
                });

            }

        });
    });

    walker.on("end", function () {
        if (onDone) onDone();
    });
}

function parseString (input, options) {
    var parser = require(PARSER_PATH);
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
    this.inner    = error;
    this.name     = 'ParserError';

    this.toString = function () {
        var lines = input.split('\n');
        if (this.offset !== undefined) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ', character ' + error.column + ':',
                error.line > 2 ? lines[error.line-2] : '',
                lines[error.line-1],
                repeat(" ", error.column-1) + '^',
                error.message,
            ].join('\n');
        }
        else if (this.line) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ':',
                lines[error.line-1],
                '',
                error.message
            ].join('\n');
        }
        else {
            return this.inner.toString();
        }
    };

}

ParserError.prototype = Object.create(Error);

module.exports.parseFiles = parseFiles;
module.exports.parseString = parseString;
module.exports.ParserError = ParserError;
