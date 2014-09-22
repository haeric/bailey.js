
var fs = require('fs');
var walk = require('walk');
var path = require('path');
var mkdir = require('mkdirp');
var compiler = require('./compiler');

require('colors');

function parseFiles (source, target, options, onFile, onError, onDone) {

    // Make sure the source and target are properly formatted
    if (source[source.length-1] != '/') {
        source += '/';
    }

    if (target[target.length-1] != '/') {
        target += '/';
    }

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
                parsed = compiler.parse(input, options, onError);
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

module.exports.parseFiles = parseFiles;
module.exports.parseString = compiler.parse;
module.exports.ParserError = compiler.ParserError;
