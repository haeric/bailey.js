var jsHint = require('jshint').JSHINT;

exports.hint = function (source, options) {
    function makeErrorsList (results) {
        if (!('errors' in results)) return [];
        var list = [];
        var __a1 = results.errors;
        var __l1 = __a1.length;
        for (var __i1 = 0; __i1 < __l1; __i1++) {
            var error = __a1[__i1];
            list.push({
                error: 'In ' + results.sourceName + ' on line ' + error.line + ': ' + error.reason + ' (' + error.code + ')',
                lineToBlame: source.split('\n')[error.line - 1]
            });
        }
        return list;
    }
    var lintdata,
        result;

    if (typeof source !== 'string') throw new Error('source must be a string');
    result = jsHint(source, options.hintOptions);
    lintdata = jsHint.data();
    lintdata = lintdata || {};
    if (options.name) lintdata.sourceName = options.name;

    return makeErrorsList(lintdata);
};
