
var PEG = require('pegjs');
var fs = require('fs');

fs.readFile('parser.peg', 'utf8', function(err, parserData) {
    fs.readFile('example.bs', 'utf8', function (err, input) {
        var parser = PEG.buildParser(parserData);
        var ast = parser.parse(input);

        console.log(JSON.stringify(ast));

        for ( var i = 0; i < ast.length; i++ ) {
            if (ast[i].toJS) {
                console.log(ast[i].toJS());
            }
        }
    });
});