var bailey = require('./../bailey');
var watch = require('node-watch');
var program = require('commander');
var stdin = require('stdin');
var Bluebird = require('bluebird');
var fs = Bluebird.promisifyAll(require('fs'));
var utils = require('./utils');

var EXIT_CODES = {
    PARSER_ERROR: 1,
    CONFIGURATION_ERROR: 2
};

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

if (program.verbose) {
    Bluebird.longStackTraces();
}

runTasks(program);

function runTasks(program) {
    var options = {
        node: false,
        bare: false,
        removeComments: false,
        strictStyleMode: true,
        optimize: false,
        config: 'default'
    };

    if (!program.args.length) {
        loadBaileyrcFile()
            .then(function(baileyrc) {
                if (program.config) {
                    configs = program.config.split(',');
                    configs.forEach(function(config) {
                        runTask(program, options, baileyrc[configs]);
                    });
                } else {
                    for (var key in baileyrc) {
                        runTask(program, options, baileyrc[key]);
                    }
                }
            })
            .catch(function(err) {
                console.error('Could not parse .baileyrc'.red);
                console.error(err.toString().red);
                process.exit(EXIT_CODES.CONFIGURATION_ERROR);
            });
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

    return compile(options.source, options.target, options)
      .then(function() {
          if (program.watch) startWatching(options);
      })
      .catch(function(err) {
          process.exit(EXIT_CODES.PARSER_ERROR);
      });
}

function compile(source, target, options) {
    if (program.verbose) options.onFile = onFileVerbose;
    return bailey.parseFiles(source, target, options)
      .catch(function(err) {
          console.error(err.toString().red);
          if (onError) onError(err);
      });
}

function parseStringOrPrintError(string, options) {
    try {
        return console.log(bailey.parseString(string, options));
    }
    catch (e) {
        console.error(e.toString().red);
        process.exit(EXIT_CODES.PARSER_ERROR);
    }
}

function startWatching(options) {
    program.verbose = true;
    console.log('Watching ' + options.source + ' for changes...');
    function done() {
        console.log('-----------\nDone! Looking for more changes...');
    }

    watch(options.source, utils.watchFilter(function(filename) {
        console.log('\n' + filename + ' changed, recompiling...\n-----------');
        compile(options.source, options.target, options).then(done);
    }));
}

function onFileVerbose(sourcePath, targetPath) {
    console.log(sourcePath, '->', targetPath);
}

function loadBaileyrcFile(baileyrcPath) {
    baileyrcPath = baileyrcPath || process.cwd() + '/.baileyrc';
    return fs.lstatAsync(baileyrcPath)
        .then(function(stat) {
            if (stat.isFile()) return fs.readFileAsync(baileyrcPath);
        })
        .then(function(content) {
            if (content) return JSON.parse(content);
            return null;
        });
}

function stdio(options) {
    stdin(function(str) {
        parseStringOrPrintError(str || '', options);
    });
}
