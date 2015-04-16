var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs'));
var path = require('path');

module.exports.readDirAsync = function readDirAsync(dirName, filter) {
    return fs.readdirAsync(dirName)
        .map(function (fileName) {
            var filePath = path.join(dirName, fileName);
            return fs.statAsync(filePath)
                .then(function(stat) {
                    if (filter && filter(filePath)) return;
                    return stat.isDirectory() ? readDirAsync(filePath) : filePath;
                });
        })
        .reduce(function (files, filePath) {
            if (filePath) files = files.concat(filePath);
            return files;
        }, []);
};

module.exports.checkDir = function checkDir(path, stat) {
    if (stat.isDirectory() && path[path.length-1] !== '/') {
        path += '/';
    }
    return path;
};

module.exports.repeat = function repeat(str, n) {
    return new Array(n + 1).join(str);
};


module.exports.fileFilter = function fileFilter(filePath) {
    return filePath.match(/node_modules/) ||
           !filePath.match(/\.bs$/) ||
           path.basename(filePath)[0] == '.';
};

module.exports.watchFilter = function watchFilter(fn) {
    return function(filePath) {
        if (filePath.match(/\.bs$/)) {
            fn(filePath);
        }
    };
};
