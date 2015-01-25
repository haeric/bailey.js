var bailey = require('./../bailey'),
    watch = require('node-watch'),
    program = require('commander'),
    fs = require('fs');

program
    .version(bailey.version)
    .usage('<source> <target>')
    .option('-n, --node', 'Use node imports instead of requirejs-imports.')
    .option('-b, --bare', 'Make the Javascript file without the wrapper function.')
    .option('-w, --watch', 'Watch the source file or directory, recompiling when any file changes.')
    .option('-v, --verbose', 'More detailed output')
    .option('--remove-comments', 'Remove all comments in the compiled version.')
    .option('--carebear', 'Do not care about style guide errors. Shame on you.')
    .option('--optimize', 'Remove debug checks for types (types are experimental)')
    .option('--eval [input]', '')
    .option('-c, --config [input]', 'Configs you want to run, seperated by comma.')
    .option('--stdio', '')
    .parse(process.argv);

runTasks(program);

function runTasks(program) {
    var baileyrcPath = process.cwd() + '/.baileyrc';
    var options = {
        node: false,
        bare: false,
        removeComments: false,
        strictStyleMode: true,
        optimize: false,
        config: 'default'
    };

    if (!program.args.length && fs.existsSync(baileyrcPath)) {
        try {
            var baileyrc = JSON.parse(fs.readFileSync(baileyrcPath));
        } catch (err) {
            console.error('Could not parse .baileyrc'.red)
            console.error(err.toString().red);
        }
        if (program.config) {
            configs = program.config.split(',');
            configs.forEach(function(config) {
                runTask(program, options, baileyrc[configs]);
            })
        } else {
            for (var key in baileyrc) {
                runTask(program, options, baileyrc[key]);
            }
        }
    } else {
        options.source = program.args[0];
        options.target = program.args[1];
        runTask(program, options, {});
    }
}

function runTask(program, options, configFromFile) {
    for (var key in configFromFile) {
        options[key] = configFromFile[key];
    }

    if (program.node) options.node = true;
    if (program.bare) options.bare = true;
    if (program.removeComments) options.removeComments = true;
    if (program.carebear) options.strictStyleMode = false;
    if (program.optimize) options.optimize = true;

    if (program.stdio) return stdio(options);
    if (program.eval) return parseStringOrPrintError(program.eval, options);
    if (!options.source || !options.target) return program.help();

    compile(options.source, options.target, options, function () {
        if (program.watch) startWatching(options);
    }, function (err) {
        process.exit(1);
    });
}

function compile(source, target, options, onDone, onError) {
    bailey.parseFiles(source, target, options, function(sourcePath, targetPath) {
        if (program.verbose) {
            console.log(sourcePath, "->", targetPath);
        }
    }, function(err) {
        console.error(err.toString().red);
        onError && onError(err);
    }, onDone);
}

function parseStringOrPrintError(string, options) {
    try {
        return console.log(bailey.parseString(string, options));
    }
    catch (e) {
        console.error(e.toString().red);
        process.exit(1);
    }
}

function startWatching(options) {
    program.verbose = true;
    console.log('Watching ' + options.source + ' for changes...');
    watch(options.source, function(filename) {
        if (/(\.bs|\.bailey)$/.test(filename)) {
            console.log('\n' + filename + ' changed, recompiling...\n-----------');
            compile(options.source, options.target, options, function(){
                console.log('-----------\nDone! Looking for more changes...');
            });
        }
    });
}

function stdio(options) {
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', function() {
        parseStringOrPrintError(process.stdin.read() || '', options);
    });
    process.stdin.resume();
}
