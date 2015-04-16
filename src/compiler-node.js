var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs'));
var path = require('path');
var mkdirp = Bluebird.promisify(require('mkdirp'));
var compiler = require('./compiler');
var utils = require('./utils');
require('colors');

function parseFiles (source, target, options, callback) {
    return mkdirp(target)
        .then(function() {
            return Bluebird.all([fs.lstatAsync(source), fs.lstatAsync(target)]);
        })
        .spread(function (sourceStat, targetStat) {
            source = utils.checkDir(source, sourceStat);
            target = utils.checkDir(target, targetStat);

            // If it's only one file, we compile directly
            if (!sourceStat.isDirectory()) {
                // bailey bs/main.bs build/ should put main.js in build/
                if (targetStat.isDirectory()) {
                    target += path.basename(source);
                }
                return parseFile(source, target, options);
            }

            // From here on we need a ./ from the start to be removed
            source = source.replace(/^\.\//, '');
            target = target.replace(/^\.\//, '');

            return utils.readDirAsync('./' + source, utils.fileFilter)
                .each(function(sourcePath) {
                    var targetPath = sourcePath.replace(source, target).replace('.bs', '.js');
                    return parseFile(sourcePath, targetPath, options);
                });
            }).nodeify(callback);
}

function parseFile (sourcePath, targetPath, options, callback) {
    return fs.readFileAsync(sourcePath, 'utf8')
        .then(function(input) {
            var parsed = compiler.parse(input, options);
            if (parsed === undefined) throw ParserError('Unable to read source file');
            return fs.writeFileAsync(targetPath, parsed);
        })
        .then(function() {
            if (options.onFile) options.onFile(sourcePath, targetPath);
        })
        .catch(options.onError)
        .nodeify(callback);
}


module.exports.parseFiles = parseFiles;
module.exports.parseString = compiler.parse;
module.exports.ParserError = compiler.ParserError;
