
var PEG = require('pegjs');
var fs = require('fs');

if (process.argv.length !== 3) {
    console.error('karsk.js takes one argument: the karsk file to process');
    process.exit(1);
}

fs.readFile('parser.peg', 'utf8', function(err, parserData) {
    fs.readFile(process.argv[2], 'utf8', function (err, input) {
        var parser = PEG.buildParser(parserData);
        var ast = parser.parse(input);

        for ( var i = 0; i < ast.length; i++ ) {
            console.log(ast[i].toJS());
        }
    });
});