
var PEG = require('pegjs');
var fs = require('fs');

fs.readFile('parser.peg', 'utf8', function(err, parserData) {
    fs.readFile('example.bs', 'utf8', function (err, input) {
        var parser = PEG.buildParser(parserData);
        console.log(JSON.stringify(parser.parse(input)));
    });
});