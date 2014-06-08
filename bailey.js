#!/usr/bin/env node
var compiler = require('./src/compiler');
var pkg = require('./package.json');

module.exports.parseFiles = compiler.parseFiles;
module.exports.parseString = compiler.parseString;
module.exports.ParserError = compiler.ParserError;
module.exports.version = pkg.version;

if (!module.parent) {
    require('./src/cli')
}
