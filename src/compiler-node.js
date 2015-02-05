
var fs = require('fs');
var walk = require('walk');
var path = require('path');
var mkdir = require('mkdirp');
var compiler = require('./compiler');

require('colors');

function parseFiles (source, target, options, onFile, onError, onDone) {

    var sourceStat = fs.lstatSync(source);
    try {
      var targetStat = fs.lstatSync(target);
    }
    catch (e) {
      mkdir.sync(target);
      var targetStat = fs.lstatSync(target);
    }

    // Make sure the source and target are properly formatted
    if (sourceStat.isDirectory() && source[source.length-1] !== '/') {
        source += '/';
    }

    if (targetStat.isDirectory() && target[target.length-1] !== '/') {
        target += '/';
    }

    // If it's only one file, we compile directly
    if (!sourceStat.isDirectory()) {

      // bailey bs/main.bs build/ should put main.js in build/
      if (targetStat.isDirectory()) {
        target += path.basename(source);
      }
      return parseFile('', source, target, options, onFile, onError, onDone);
    }

    // It's a directory, let's walk though it all
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
      parseFile(root, sourcePath, targetPath, options, onFile, onError, next);
    });

    walker.on("end", function () {
      if (onDone) onDone();
    });
}

function parseFile (root, sourcePath, targetPath, options, onFile, onError, onDone) {
  fs.readFile(sourcePath, 'utf8', function (err, input) {

    if (err) {
      if (onError) onError(err);
      return;
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
          if (onError) onError(err);
          return;
        }
        if (onFile) onFile(sourcePath, targetPath);
        if (onDone) onDone();
      });

    }

  });
}

module.exports.parseFiles = parseFiles;
module.exports.parseString = compiler.parse;
module.exports.ParserError = compiler.ParserError;
