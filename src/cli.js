
var bailey = require('./../bailey'),
    watch = require('node-watch'),
    program = require('commander');

program
    .version(bailey.version)
    .usage('<source> <target>')
    .option('-n, --node', 'Use node imports instead of requirejs-imports.')
    .option('-b, --bare', 'Make the Javascript file without the wrapper function.')
    .option('-w, --watch', 'Watch the source file or directory, recompiling when any file changes.')
    .option('-v, --verbose', 'More detailed output')
    .option('--remove-comments', 'Remove all comments in the compiled version.')
    .option('--eval [input]', '')
    .option('--stdio', '')
    .parse(process.argv);

var options = {
    node: !!program.node,
    removeComments: !!program['remove-comments'],
    bare: !!program.bare,
};

if (program.stdio) {
    process.stdin.setEncoding('utf8');

    process.stdin.on('readable', function() {
        parseStringOrPrintError(process.stdin.read() || '');
    });

    process.stdin.resume();
    return;
}

if (program.eval) {
    return parseStringOrPrintError(program.eval);
}

if (program.args.length != 2) {
    program.help();
}

var source = program.args[0];
var target = program.args[1];

if (!source || !target) {
     program.help();
}

function parseStringOrPrintError(string) {
    try {
        return console.log(bailey.parseString(string, options));
    }
    catch (e) {
        console.error(e.toString().red);
        process.exit(1);
    }
}

function compile(onDone, onError) {
    bailey.parseFiles(source, target, options, function(sourcePath, targetPath) {
        if (program.verbose) {
            console.log(sourcePath, "->", targetPath);
        }
    }, function(err) {
        console.error(err.toString().red);
        onError && onError(err);
    }, onDone);
}

function startWatching () {
    program.verbose = true;
    console.log('Watching ' + source + ' for changes...');
    watch(source, function(filename) {
        if (/(\.bs|\.bailey)$/.test(filename)) {
            console.log('\n' + filename + ' changed, recompiling...\n-----------');
            compile(function(){
                console.log('-----------\nDone! Looking for more changes...');
            });
        }
    });
}

compile(function () {
    if (program.watch) {
        startWatching();
    }
}, function (err) {
    process.exit(1);
});
