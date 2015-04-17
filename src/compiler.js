/* jscs: disable */
var beautify = require('js-beautify').js_beautify;
/* jscs: enable */
var parser = require('./parser');
var utils = require('./utils');

// Whenever we hit an indented block, make sure all preceding
// empty lines are made to have this indentation level
function normalizeBlocks(input) {

    var numberOfLinesToIndent = 0;
    var thisLineContainsStuff = false;
    var thisLinesIndentation = '';
    var out = '';

    for (var i = 0; i < input.length; i++) {

        var chr = input[i];

        if (chr == '\r') {
            continue;
        }

        if (chr === '\n') {
            if (!thisLineContainsStuff) {
                numberOfLinesToIndent++;
            } else {
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
            } else {
                out += chr;
            }

            numberOfLinesToIndent = 0;
            thisLineContainsStuff = true;

        }

    }

    return out;

}

function parse(input, options) {

    input = normalizeBlocks(input);

    options = options || {};
    options.removeComments = options.removeComments !== undefined ? options.removeComments : false;
    options.node = options.node !== undefined ? options.node : false;
    options.bare = options.bare !== undefined ? options.bare : false;
    options.strictStyleMode = options.strictStyleMode !== undefined ? options.strictStyleMode : true;
    options.optimize = options.optimize !== undefined ? options.optimize : true;
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

function ParserError(error, input, options) {
    this.message  = error.message;
    this.expected = error.expected;
    this.found    = error.found;
    this.offset   = error.offset;
    this.line     = error.line;
    this.column   = error.column;
    this.inner    = error;
    this.name     = 'ParserError';

    this.toString = function() {
        var lines = input.split('\n');
        if (this.offset !== undefined) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ', character ' + error.column + ':',
                error.line > 2 ? lines[error.line - 2] : '',
                lines[error.line - 1],
                utils.repeat(' ', error.column - 1) + '^',
                error.message
            ].join('\n');
        }
        else if (this.line) {
            return [
                error.name + ' at ' + options.filePath + ' line ' + error.line + ':',
                lines[error.line - 1],
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

module.exports.parse = parse;
module.exports.ParserError = ParserError;
