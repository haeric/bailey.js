
{
    function ImportError(message, line) {
        this.message  = message;
        this.line     = line;
        this.name     = "ImportError";
    }

    function StyleError(message, line) {
        this.message  = message;
        this.line     = line;
        this.name     = "StyleError";
    }

    function deprecationWarning(message, line) {
        var warning = 'Deprecation warning at ' + parser.options.filePath + ' line ' + line + ': ' + message;
        console.log(warning.yellow);
    }

    function styleWarning(message, line) {
        if (parser.options.strictStyleMode) {
            var warning = 'Style warning at ' + parser.options.filePath + ' line ' + line + ': ' + message;
            throw new StyleError(message, line);
        }
    }

    peg$subclass(ImportError, Error);

    var fs = require('fs');
    var path = require('path');
    var extend = require('util')._extend;

    var indentStack = [],
        indent = "",
        scopeId = 0,
        parser = this;

    function type (name, options) {

        options = options || {};

        var functions = {
            init: options.init || function () {},
            toJS: options.toJS || function () { return '<' + name + '>'; },
            traverse: options.traverse || function () {},
            remove: function(newParent) {
                var index = this.parent.children.indexOf(this);
                if (index === -1) {
                    throw "Compiler Error: remove()"
                }
                this.parent.children.splice(index, 1);
            },
            insertAfter: function(sibling) {
                var index = sibling.parent.children.indexOf(sibling);
                if (index === -1) {
                    throw "Compiler Error: insertAfter()"
                }
                sibling.parent.children.splice(index+1, 0, this);
            }
        }

        for ( key in options ) {
            functions[key] = options[key];
        }

        type[name] = function () {
            this.nodeType = name;
            this.parent = null;
            this.scope = null;
            this.children = [];
            functions.init.apply(this, arguments);
        }
        type[name].prototype = functions;
    }

    type('Program', {
        init: function(block) {
            this.block = block;
            this.children = [block];
        },
        traverse: function () {
            var queue = [this];

            while (queue.length) {

                var item = queue.shift();

                if (item.nodeType === 'Block' && item.isScope) {
                    item.scope = item;
                }

                if (item !== this && item.traverse) {
                    item.traverse();
                }

                for (var i = 0; i < item.children.length; i++) {

                    var child = item.children[i];

                    if (!child)
                        continue;

                    if (!child.nodeType)
                        continue;

                    queue.push(child);
                    child.parent = item;
                    child.scope = item.scope;

                }

                if (item.postChildren) {
                    queue.push({
                        traverse: item.postChildren.bind(item),
                        children: [],
                    });
                }

            }

        },
        toJS: function (options) {

            parser.options = options;

            this.traverse();

            var out = this.block.extractPreImportStatements().map(function(item) {
                return item.toJS() + '\n';
            }).join('');

            out += this.block.extractNodes('IncludeStatement').map(function(item) {
                return item.toJS() + '\n';
            }).join('');

            var imports = this.block.extractNodes('ImportStatement');
            var export_ = this.block.extractNodes('ExportStatement');

            if (options.bare) {
                return this.block.toJS();
            }

            if (export_.length > 1) {
                throw 'Too many export statements...'
            }
            export_ = export_[0];

            if (options.node) {
                // Handle imports with node
                out = '"use strict";\n' + out;
                out += imports.map(function(item) {
                    return 'var ' + item.name + ' = require("' + item.path + '");';
                }).join('\n');

                out += this.block.toJS();

                if (export_) {
                    out += '\nmodule.exports = ' + export_.toJS() + ';';
                }
                else {
                    out += '\nmodule.exports = {' + this.block.getPublicSymbolsList().map(function(key) {
                        return "'" + key + "': " + key;
                    }).join(',') + '};';
                }
            }
            else {
                // Handle imports with require js
                var pathString = imports.map(function(item) {
                    return '"' + item.path + '"';
                }).join(', ');

                var paramString = imports.map(function(item) {
                    return item.name;
                }).join(', ');


                var requireFunction = /main\.bs$/.test(options.filePath) ? 'require' : 'define';

                out += requireFunction + '([' + pathString + '], ';
                out += 'function(' + paramString + ') \x7b\n"use strict";';
                out += this.block.toJS();

                if (export_) {
                    out += '\nreturn ' + export_.toJS() + ';';
                }
                else {
                    out += '\nreturn {' + this.block.getPublicSymbolsList().map(function(key) {
                        return "'" + key + "': " + key;
                    }).join(',') + '};';
                }

                out += '\n\x7d);';
            }
            return out;
        }
    });

    type('Noop', {
        semicolon: false,
        toJS: function () {
            return '';
        }
    });

    type('Comment', {
        semicolon: false,
        init: function (text) {
            this.text = text;
        },
        toJS: function () {
            if (parser.options.removeComments) {
                return '';
            }
            return '//' + this.text;
        }
    });

    type('Number', {
        init: function (n) {
            if (n.indexOf('.') === -1 && n.indexOf('e') === -1) {
                this.value = parseInt(n);
            }
            else {
                this.value = parseFloat(n);
            }
        },
        toJS: function () {
            return this.value;
        }
    })

    type('Variable', {
        init: function (name) {
            this.name = name;
        },
        toJS: function () {
            return this.name;
        }
    });

    type('Assignment', {
        init: function(operator, left, value) {
            this.operator = operator;
            this.left = left;
            this.value = value;
            this.children = [left, value];
            this.varThisSonOfABitch = false;
        },
        traverse: function () {
            if (!this.left.nodeType) {
                this.varThisSonOfABitch = !this.scope.symbols[this.left];
                this.scope.symbols[this.left] = 1;
            }
        },
        toJS: function () {
            var left = this.left.toJS ? this.left.toJS() : this.left;
            var varShit = this.varThisSonOfABitch ? 'var ' : '';
            return varShit + left + ' ' + this.operator + ' ' + this.value.toJS();
        }
    });

    type('If', {
        semicolon: false,
        init: function (expr, ifBody, elifs, elseBody, ternary) {
            this.expression = expr;
            this.ifBody = ifBody;
            this.elseBody = elseBody;
            this.elifs = elifs || [];
            this.children = [expr, ifBody, elseBody].concat(this.elifs);
            this.ternary = !!ternary;
            this.line = line();
        },
        traverse: function() {
            if (this.expression.nodeType === 'Group') {
                styleWarning('If statements should not have parens in baileyjs, they are not needed.', this.line);
            }
        },
        toJS: function () {

            if (this.ternary) {
                return this.expression.toJS() +
                       ' ? ' + this.ifBody.toJS() +
                       ' : ' + this.elseBody.toJS();
            }

            var out = 'if (' + this.expression.toJS() + ') {\n    ';
            out += this.ifBody.toJS() + '}';

            for (var i = 0; i < this.elifs.length; i++) {
                out += ' else ' + this.elifs[i].toJS();
            }

            if (this.elseBody) {
                out += ' else {\n    ';
                out += this.elseBody.toJS() + '}';
            }

            return out;
        }
    })

    type('ForLoop', {
        semicolon: false,
        init: function (iterator, item, iterable, body, ofLoop) {
            this.iterator = iterator;
            this.item = item;
            this.iterable = iterable;
            this.iterableLength = null;
            this.body = body;
            this.ofLoop = ofLoop;
            this.children = [iterator, item, iterable, body];
        },
        traverse: function () {
            if (this.iterable.nodeType === 'Range') {
                this.iterator = this.item;
            }

            if (!this.iterator) {
                var i = 1;
                do {
                    this.iterator = '__i' + i++;
                } while (this.scope.symbols[this.iterator]);
            }

            if (!this.iterableTemp) {
                var i = 1;
                do {
                    this.iterableTemp = '__a' + i++;
                } while (this.scope.symbols[this.iterableTemp]);
            }

            if (!this.iterableLength) {
                var i = 1;
                do {
                    this.iterableLength = '__l' + i++;
                } while (this.scope.symbols[this.iterableLength]);
            }

            this.scope.symbols[this.iterator] = 1;
            this.scope.symbols[this.iterableTemp] = 1;
            this.scope.symbols[this.iterableLength] = 1;
        },
        toJS: function () {
            if (this.ofLoop) {
                return this.toJSOfLoop();
            }
            if (this.iterable.nodeType === 'Range') {
                return this.toJSRanged();
            }
            else {
                return this.toJSListed();
            }
        },
        toJSRanged: function () {

            var step = '',
                iterator = this.iterator,
                by = this.iterable.by,
                comparator = ' <';

            if (by.nodeType === 'Number' && by.value === 0) {
                step == ''
            }

            else if (by.value === 1) {
                step = iterator + '++';
            }
            else if (by.value === -1) {
                step = iterator + '--';
                comparator = ' >';
            }
            else if (by.value < 0) {
                step = iterator + ' = ' + iterator + by.toJS();
                comparator = ' >';
            }
            else {
                step = iterator + ' = ' + iterator + '+' + by.toJS()
            }

            comparator += this.iterable.equals ? '= ' : ' ';

            return 'for (var ' + iterator + ' = ' + this.iterable.from.toJS() + '; ' +
                iterator + comparator + this.iterable.to.toJS() + '; ' + step + ') {\n' +
                this.body.toJS() + '}';
        },
        toJSListed: function () {
            var out = this.toJSBeforeLoop();

            return out +
                'var ' + this.iterableLength + ' = ' + this.iterableTemp + '.length;' +
                'for (var ' + this.iterator + ' = 0; ' +
                this.iterator + ' < ' + this.iterableLength + '; ' + this.iterator + '++) { ' +
                'var ' + this.item + ' = ' + this.iterableTemp + '[' + this.iterator + '];\n' +
                this.body.toJS() + '}';
        },
        toJSOfLoop: function () {
            var out = this.toJSBeforeLoop();

            return out + 'for (var ' + this.iterator + ' in ' + this.iterableTemp + ') {' +
            'var ' + this.item + ' = ' + this.iterableTemp + '[' + this.iterator + '];\n' +
            this.body.toJS() + '}';
        },

        toJSBeforeLoop: function () {
            if (this.iterable.nodeType === 'Variable') {
                this.iterableTemp = this.iterable.toJS();
            }
            else {
                return 'var ' + this.iterableTemp + ' = ' + this.iterable.toJS() + ';'
            }
            return '';
        }
    });

    type('WhileLoop', {
        semicolon: false,
        init: function (expression, body) {
            this.expression = expression;
            this.body = body;
            this.children = [expression, body];
            this.line = line();
        },
        traverse: function () {
            if (this.expression.nodeType === 'Group') {
                styleWarning('While statements should not have parens in baileyjs, they are not needed.', this.line);
            }
        },
        toJS: function () {
            return 'while (' + this.expression.toJS() + ') {\n' +
                   this.body.toJS() + '}';
        }
    });

    type('Operator', {
        init: function (op, left, right) {
            this.operator = op;
            this.left = left;
            this.right = right;
            this.children = [left, right];
        },
        toJS: function () {
            return this.left.toJS() + ' ' + this.operator + (this.right ? ' ' + this.right.toJS() : '');
        }
    });

    type('UnaryOperator', {
        init: function (op, right) {
            this.operator = op;
            this.right = right;
            this.children = [right];

            if (this.operator === '-' && this.right.nodeType === 'Number') {
                this.value = -this.right.value;
            }
        },
        toJS: function () {
            return this.operator + ' ' + this.right.toJS();
        }
    });

    type('ListLiteral', {
        init: function (items) {
            this.items = items;
            this.children = items;
        },
        toJS: function () {
            var items = this.items.map(function(item) {
                return item.toJS();
            });
            return '[' + items.join(', ') + ']';
        }
    });

    type('ObjectLiteral', {
        init: function () {
            this.keys = [];
            this.values = [];
            this.children = this.values;
        },
        add: function (val) {
            this.keys.push(val.key);
            this.values.push(val.value);
        },
        toJS: function () {
            var out = '{';
            for (var i = 0; i < this.keys.length; i++) {
                out += "'" + this.keys[i] + "': " + this.values[i].toJS();
                if (i < this.keys.length - 1) {
                    out += ', ';
                }
            }
            return out + '}';
        }
    });

    type('ClassStatement', {
        semicolon: false,
        init: function (name, extendFrom) {
            this.name = name;
            this.extendFrom = extendFrom;
            this.values = [];
            this.children = [];
            this.init = null;
        },
        add: function (val) {
            val.value.name = val.key;
            this.children.push(val.value);

            if (val.key === 'init') {
                this.init = val.value;
            }
            else {
                this.values.push(val);
            }
        },
        traverse: function() {
            this.scope.symbols[this.name] = 1;
        },
        toJS: function () {
            var name = this.name;
            var out = 'function ' + this.name + ' ';
            var errorIfNotNewed = '\n/* istanbul ignore next */\nif ((typeof window !== "undefined" && this === window) || (typeof self !== "undefined" && this === self)) { throw new TypeError("Tried to call class ' + name + ' as a regular function. Classes can only be called with the \'new\' keyword."); }';
            if (this.init !== null) {
                var params = this.init.params.map(function(p) {
                    return p.toJS();
                });
                out += '(' + params.join(', ') + ') ';
                out += '{' + errorIfNotNewed + this.init.body.toJS() + '}'
            }
            else {
                out += '() {' + errorIfNotNewed + '}';
            }

            if (this.extendFrom) {
                out += this.name + '.prototype = Object.create(' + this.extendFrom + '.prototype);'
                out += this.name + '.prototype.constructor = ' + this.name + ';'
            }

            out += this.values.map(function(item) {
                return name + '.prototype.' + item.key + ' = ' + item.value.toJS() + ';'
            }).join('\n');
            return out;
        }
    });

    type('LoopControl', {
        init: function (type) {
            this.type = type;
        },
        toJS: function () {
            return this.type;
        }
    });

    type('ImportStatement', {
        semicolon: false,
        init: function (path, name, subImports) {
            this.name = name;
            this.unalteredPath = path;
            this.path = path;
            this.children = subImports || [];
            this.subImports = subImports || [];
            this.line = line();

            // TODO: python style imports are deprecated, remove this replace soon
            if (this.path.indexOf('/') === -1) {
                this.path = this.path.replace(/\.(?![\.\/])/g, '/');
            }
            if (this.path[0] === '/') {
                this.path = '.' + this.path;
            }

            if (!name) {
                if (subImports && subImports.length > 0) {
                    this.name = '__module_' + this.path.replace(/[\/\.\-]/g, '_');
                }
                else {
                    this.name = name || this.path.match(/([^!\/]+)$/)[1];
                }
            }

            if (this.name.indexOf('-') !== -1 && name === undefined) {
                throw new SyntaxError(
                    'Dashes in import statements make me sad, I do not know what to call the imported variable! \nUse "import ... as ..." to give it a name.', '-', '',
                    offset(), line(), path.indexOf('-') + 8
                )
            }

            if (this.name.indexOf('.') !== -1 && name === undefined) {
                throw new SyntaxError(
                    'Dots in plugin import statements make me sad, I do not know what to call the imported variable! \nUse "import ... as ..." to give it a name.', '.', '',
                    offset(), line(), this.path.indexOf('.') + 8
                )
            }
        },
        toJS: function () {
            return '';
        },
        traverse: function () {
            if (this.unalteredPath.match(/\.(?![\.\/])/) && this.unalteredPath.indexOf('!') === -1) {
                deprecationWarning('Using . instead of / in imports is deprecated, and will fail in future versions.', this.line);
            }
            if (this.scope.symbols[this.name]) {
                if (this.subImports.length) {
                    // This module has already been imported? Well cool, let's just forget us
                    this.postChildren = function () {
                        this.remove();
                    }
                    return;
                }
                throw new ImportError(
                    'Import "' + this.name + '" conflicts with a previous import defined at line ' + this.scope.symbols[this.name],
                    this.line
                );
            }
            this.scope.symbols[this.name] = this.line;
        }
    });

    type('SubImportStatement', {
        init: function(name) {
            this.name = name;
        },
        traverse: function () {
            // Hook these declarations to the scope.
            // We don't have to remove ourselves as ImportStatements will be extracted
            this.scope.symbols[this.name] = 1;
            this.parentImport = this.parent;
            this.insertAfter(this.parentImport);
        },
        toJS: function () {
            return 'var ' + this.name + ' = ' + this.parentImport.name + '.' + this.name;
        }
    })

    type('ExportStatement', {
        semicolon: false,
        init: function (expr) {
            this.expr = expr;
            this.children = [expr];
        },
        toJS: function () {
            return this.expr.toJS();
        }
    });

    type('IncludeStatement', {
        init: function (path) {
            // TODO: python style imports are deprecated, remove this replace soon
            this.path = path;
            this.unalteredPath = path;
            if (this.path.indexOf('/') === -1) {
                this.path = this.path.replace(/\.(?![\.\/])/g, '/');
            }
            if (this.path[0] === '/') {
                this.path = '..' + this.path;
            }
        },
        traverse: function () {
            if (this.unalteredPath.match(/\.(?![\.\/])/) && this.unalteredPath.indexOf('!') === -1) {
                deprecationWarning('Using . instead of / in includes is deprecated, and will fail in future versions.', this.line);
            }
        },
        toJS: function () {
            var filePath = path.join(parser.options.root, this.path);

            if (fs.existsSync(filePath + '.bs')) {
                var options = extend({}, parser.options);
                options.path = filePath + '.bs';
                return parser.options.parse(fs.readFileSync(filePath + '.bs', 'utf8'), options );
            }
            if (fs.existsSync(filePath + '.js')) {
                return fs.readFileSync(filePath + '.js', 'utf8');
            }
            error('Could not find file, tried ' + filePath + '.js and .bs')
        }
    });

    type('Literal', {
        init: function (type) {
            this.type = type;
        },
        toJS: function () {
            return this.type;
        }
    });

    type('StringLiteral', {
        init: function (token, string) {
            this.token = token;
            this.string = string.replace(token, '\\' + token).replace(/\n/g, '\\n');
        },
        toJS: function () {
            return this.token + this.string + this.token;
        }
    });

    type('Block', {
        init: function(statements) {
            this.name = '__scope_' + scopeId++ + '__';
            this.declareName = false;
            this.symbols = {};
            this.statements = statements;
            this.children = statements;
        },
        traverse: function () {
            if (this.parent && this.parent.scope) {
                this.symbols.__proto__ = this.parent.scope.symbols;
            }

        },
        toJS: function () {

            var out = '';

            if (this.declareName) {
                out += 'var ' + this.name + ' = this;\n';
            }

            return out + this.statements.map(function (s) {
                return s.toJS() + (s.semicolon !== false ? ';' : '');
            }).join('\n') + '\n';
        },
        extractNodes: function (type) {
            var nodes = this.statements.filter(function(statement) {
                return statement.nodeType === type;
            });

            this.statements = this.statements.filter(function(statement) {
                return statement.nodeType !== type;
            });

            return nodes;
        },
        extractPreImportStatements: function () {

            var list = [],
                hadImportsOrExport = false;
            for (var i = 0; i < this.statements.length; i++) {
                var item = this.statements[i];
                if (item.nodeType === 'ImportStatement' || item.nodeType === 'ExportStatement') {
                    this.statements = this.statements.slice(i);
                    hadImportsOrExport = true;
                    break;
                }
                list.push(item);
            }
            if (!hadImportsOrExport) {
                return [];
            }

            return list;

        },
        getImports: function () {
            return this.statements.filter(function(statement) {
                return statement.nodeType === 'ImportStatement';
            });
        },
        getPublicSymbolsList: function () {
            return Object.keys(this.symbols).filter(function(key) {
                return key[0] !== '_';
            });
        },
        getScopeName: function () {
            this.declareName = true;
            return this.name;
        },
        copySymbols: function (list) {
            for (var i = 0; i < list.length; i++) {
                this.symbols[list[i]] = 1;
            }
        }
    });

    type('Group', {
        init: function(expr) {
            this.expr = expr;
            this.children = [expr];
        },
        toJS: function () {
            return '(' + this.expr.toJS() + ')';
        }
    });

    type('Function', {
        init: function (params, body) {
            this.params = params;
            this.body = body;
            this.children = params.concat([body]);
        },
        traverse: function () {
            if (this.body.nodeType === 'Block') {
                this.body.copySymbols(this.params.map(function(p) {
                    return p.toJS();
                }));
            }
            if (!this.name && this.parent.left) {
                this.name = this.parent.left;
            }
        },
        toJS: function () {
            var params = this.params.map(function (p) {
                return p.toJS();
            })

            if(typeof this.name === 'object') {
              if (this.name.nodeType === 'PropertyAccess') {
                this.name = this.name.accessor.name;
              }
            }

            return 'function' + (this.name ? ' ' + this.name : '') +
                   '(' + params.join(', ') + ') {\n' + this.body.toJS() + '}';
        }
    });

    type('Return', {
        init: function (body) {
            this.body = body;
            this.children = [body];
        },
        toJS: function () {
            if (this.body === null || this.body.nodeType === 'Noop' ) {
                return 'return;';
            }

            return 'return ' + this.body.toJS() + (this.body.isScope ? ';' : '');
        }
    });

    type('FunctionCall', {
        init: function (expr, args) {
            this.expr = expr;
            this.args = args;
            this.children = [expr].concat(args);
        },
        toJS: function () {
            var start;
            var expr = this.expr.toJS ? this.expr.toJS() : this.expr;

            // Since we have init as our constructor call...
            if (this.superCall && expr === 'init') {
                start = 'call(this'
            }
            else if (this.superCall) {
                start = 'prototype.' + expr + '.call(this';
            }
            else {
                start = expr + '(';
            }

            if (this.superCall && this.args.length > 0) {
                start += ',';
            }

            return start + this.args.map(function(item){
                return item.toJS();
            }).join(', ') + ')';
        }
    });

    type('PropertyAccess', {
        init: function (value, accessor, type) {
            this.value = value;
            this.accessor = accessor;
            this.type = type;
            this.children = [value, accessor];
        },
        toJS: function () {
            if (this.type === '.') {
                return this.value.toJS() + '.' + (this.accessor.toJS ? this.accessor.toJS() : this.accessor);
            }

            return this.value.toJS() + '[' + this.accessor.toJS() + ']';
        }
    });

    type('ThisToken', {
        init: function(scopeOffset) {
            this.scopeOffset = scopeOffset;
            this.scopeIdentifier = 'UntraversedThisToken';
        },
        traverse: function () {
            this.scopeIdentifier = this.findScopeIdentifier();
        },
        toJS: function () {
            return this.scopeIdentifier;
        },
        findScopeIdentifier: function () {

            if (this.scopeOffset === 0 ) {
                return 'this';
            }

            var offset = this.scopeOffset + 1;
            var node = this.parent;

            while (node) {

                if (node.isScope) {
                    offset--;
                }

                if (offset === 0) {
                    return node.getScopeName();
                }

                node = node.parent;
            }

            throw 'Scope access overflow; not enough scopes to traverse';
        }
    });

    type('NewExpression', {
        init: function(classExpression) {
            this.classExpression = classExpression;
            this.children = [classExpression];
        },
        toJS: function () {
            return 'new ' + this.classExpression.toJS();
        }
    });

    type('Range', {
        init: function(from, to, by, equals) {
            this.from = from;
            this.to = to;
            this.by = by;
            this.children = [from, to, by];
            this.equals = equals;
        }
    });

    type('Throw', {
        init: function(expr) {
            this.expr = expr;
            this.children = [expr];
        },
        toJS: function () {
            return 'throw ' + this.expr.toJS();
        }
    });

    type('TryCatch', {
        semicolon: false,
        init: function(tryBody, catchVar, catchBody) {
            this.tryBody = tryBody;
            this.catchVar = catchVar;
            this.catchBody = catchBody;
            this.children = [tryBody, catchBody];
        },
        toJS: function () {
            return 'try {' + this.tryBody.toJS() + '} catch (' + this.catchVar + ') {' +
                   this.catchBody.toJS() + '}';
        }
    });
    type('SuperToken', {
        init: function () {
            this.offset = offset();
            this.line = line();
            this.column = column();
        },
        traverse: function () {

            // Find the class in which this super resides
            var target = this;
            while (target.nodeType != 'ClassStatement') {
                target = target.parent;

                if (!target) {
                    throw new SyntaxError(
                        'super can only be used inside a class statement', '.', '',
                        this.offset, this.line, this.column
                    )
                }
            }

            this.cls = target;

            // Find the function call
            if (this.parent.nodeType != 'PropertyAccess') {
                throw new SyntaxError(
                    'super can only be used to access the methods of the superclass like so: super.method()', '.', '',
                    this.offset, this.line, this.column
                )
            }

            if (this.parent.accessor.nodeType != 'FunctionCall') {
                throw new SyntaxError(
                    'super only supports accessing methods: super.method()', '.', '',
                    this.offset, this.line, this.column
                )
            }

            this.parent.accessor.superCall = true;

        },
        toJS: function () {
            return this.cls.extendFrom;
        }
    });

    type('TypedIdentifier', {
        init: function (type, identifier) {
            this.type = type;
            this.identifier = identifier;
        },
        traverse: function () {
            if (this.type === 'int') {
                if (parser.options.optimize) {
                    var code = this.identifier + ' = ' + this.identifier + '|0';
                }
                else {
                    var code = 'if ~~' + this.identifier + ' != ' + this.identifier + '\n' +
                    '    throw new Error("' + this.identifier + ' was not of expected type ' + this.type + '")';
                }
                var node = parse(code, {startRule: 'Statement'});
                this.parent.body.statements.unshift(node);
            }
        },
        toJS: function () {
            return this.identifier;
        }
    });

    type('Regex', {
        init: function(pattern, flags) {
            this.pattern = pattern;
            this.flags = flags;
        },
        toJS: function() {
            return '/' + this.pattern + '/' + this.flags;
        }
    })

}

Program
    = block:Block
        {
            block.isScope = true;
            return new type.Program(block);
        }

Block
    = statements:(Statement (_ EOL Indent Statement)*)
        {
            var list = [statements[0]];
            for(var i = 0; i < statements[1].length; i++) list.push(statements[1][i][3]);
            return new type.Block(list)
        }

Statement

    = 'if ' condition:Expression ifBody:IndentedBlockOrThenPlusExpresssion
      elifPart:((EOL Indent Comment?)+ 'elif' _ Expression IndentedBlockOrThenPlusExpresssion)*
      elsePart:((EOL Indent Comment?)+ 'else' IndentedBlockOrExpresssion)?
        {
            var elifs = elifPart.map(function(elif) {
                return new type.If(elif[3], elif[4]);
            });
            return new type.If(condition, ifBody, elifs, elsePart ? elsePart[2] : null);
        }

    / 'while ' e:Expression _ IndentNewline body:Block IndentRemove
        { return new type.WhileLoop(e, body); }

    / word:('break' / 'continue') !AnyIdentifier
        { return new type.LoopControl(word) }

    / 'import ' path:[-a-zA-Z0-9._!/]+
       name:(' as ' Identifier)?
       subImports:(_ ':' _ Identifier _ (',' _ Identifier _)*)?
        {
            var subs = [];
            if (subImports) {
                subs.push(new type.SubImportStatement(subImports[3]));
                subs = subs.concat(subImports[5].map(function(group){
                    return new type.SubImportStatement(group[2])
                }));
            }
            return new type.ImportStatement(path.join(''), name ? name[1] : undefined, subs);
        }

    / 'include ' path:[a-zA-Z0-9._/-]+
        { return new type.IncludeStatement(path.join('')); }

    / 'export ' expr:Expression
        { return new type.ExportStatement(expr); }

    / 'return' _ expr:Expression?
        { return new type.Return(expr); }

    / 'try' IndentNewline tryBody:Block IndentRemove __
      'catch' _ catchVar:Identifier IndentNewline catchBody:Block IndentRemove
        { return new type.TryCatch(tryBody, catchVar, catchBody)}

    / 'throw' _ expr:Expression
        { return new type.Throw(expr); }

    / 'pass' !AnyIdentifier
        { return new type.Noop() }

    / 'class' _ ident:Identifier _ extender:('extends' _ AnyIdentifier)? IndentNewline
        head:(__ KeyValuePair / Comment)
        tail:((EOL Indent)+ (KeyValuePair / Comment))* IndentRemove
        {
            var obj = new type.ClassStatement(ident, extender ? extender[2] : null);
            if (head !== '') obj.add(head[1]);

            for (var i = 0; i < tail.length; i++)
                if (tail[i][1].key)
                    obj.add(tail[i][1])

            return obj;
        }

    / ForStatement

    / Assign

    / Expression

    / Comment

    / { return new type.Noop() }

ForStatement
    = 'for ' iterator:(Identifier ',')? _ item:Identifier _
      op:('in' / 'of') _
      iterable:(Range / Expression)
      body:(
          IndentNewline body:Block IndentRemove { return body; }
          / EOL Indent body:ForStatement { return body; }
      )
        {
            if (op === 'of' && iterable.nodeType === 'Range') {
                error('for ... of cannot be used with a range, only objects.')
            }
            return new type.ForLoop(iterator ? iterator[0] : null, item, iterable, body, op === 'of');
        }

IndentedBlockOrThenPlusExpresssion
  = IndentNewline block:Block IndentRemove { return block; }
  / _ 'then' _ statement:Statement _       { return statement; }

IndentedBlockOrExpresssion
  = IndentNewline block:Block IndentRemove { return block; }
  /  _ statement:Statement _               { return statement; }

EOL
    = '\r\n' / '\n' / '\r'

Indent
    = i:[ \t]*
        &{ return i.join("") === indent; }

IndentNewline
    = _ EOL IndentAdd Indent

IndentAdd
    = i:[ \t]+ &{ return i.length > indent.length; }
        {
            indentStack.push(indent);
            indent = i.join("");
            peg$currPos = offset();
        }

IndentRemove
    =
        { indent = indentStack.pop(); }

Comment
    = '#' text:($(!EOL .)*)
        { return new type.Comment(text); }

Assign
    = left:Identifier _ op:AssignmentOperator _ value:Expression
        { return new type.Assignment(op, left, value) }

    / left:Expression _ op:AssignmentOperator _ value:Expression
        { return new type.Assignment(op, left, value) }

    / left:ThisProperty _ op:AssignmentOperator _ value:Expression
        { return new type.Assignment(op, left, value) }

AssignmentOperator
    = '=' (!'=') { return '='; }
    / '*='
    / '/='
    / '%='
    / '+='
    / '-='
    / '<<='
    / '>>='
    / '>>>='
    / '&='
    / '^='
    / '|='

BinaryOperator
    = '+'
    / '-'
    / '*'
    / '/'
    / '%'

    / '&'
    / '|'
    / '^'
    / '>>'
    / '>>>'
    / '<<'

    / '=='  { return '==='; }
    / '!=' { return '!=='; }
    / '<='
    / '>='
    / '<'
    / '>'

    / 'and'          !IdentifierPart { return '&&'; }
    / 'or'           !IdentifierPart { return '||'; }
    / 'instanceof'   !IdentifierPart { return 'instanceof'; }
    / 'in'           !IdentifierPart { return 'in'; }

UnaryOperator
    = 'delete'       !IdentifierPart { return 'delete'; }
    / 'typeof'       !IdentifierPart { return 'typeof'; }
    / '++'
    / '+'
    / '--'
    / '-'
    / '~'
    / 'not'          !IdentifierPart { return '!'}

PostfixOperator
    = '++'
    / '--'

//
// Cheat alert: This completely ignores operator presedence for simplicity,
// and will create a wrong ast. However, as long as we do not really
// fiddle with operators, it'll output correct javascript.
//
Expression
    =  cond:BinaryExpression
       rest:(__ '?' __ Expression __ ':' __ Expression)?
        {
            if (!rest) {
                return cond;
            }
            return new type.If(cond, rest[3], null, rest[7], true);
        }

BinaryExpression
    = left:PostfixExpression
      rest:(__ BinaryOperator __ Expression)?
        {
            if (!rest) {
                return left;
            }
            return new type.Operator(rest[1], left, rest[3]);
        }

PostfixExpression
    = left:FunctionExpression _ op:PostfixOperator?
        {
            if (!op) {
                return left;
            }
            return new type.Operator(op, left);
        }

FunctionExpression
    = value:Value modifiers:(
        '[' __ expr:Expression __ ']'
            { return {type: '[]', expr: expr} }
      / __ '.' __ expr:(FunctionExpression / IdentifierPart)
            { return {type: '.', expr: expr} }
      / '(' __ args:ExpressionTuple __ ')'
            { return args; }
    )*
        {
            for (var i = 0; i < modifiers.length; i++) {
                if (modifiers[i].type) {
                    value = new type.PropertyAccess(value, modifiers[i].expr, modifiers[i].type)
                }
                else {
                    value = new type.FunctionCall(value, modifiers[i]);
                }
            }
            return value;
        }


Value

    = op:UnaryOperator _ right:Expression
        { return new type.UnaryOperator(op, right); }

    / HexNumber

    / Number

    / Literal

    / ThisProperty

    / ThisToken

    / StringLiteral

    / RegularExpressionLiteral

    / a:Identifier
        { return new type.Variable(a); }

    / 'super' !IdentifierPart
        { return new type.SuperToken(); }

    / 'new' _ expr:Expression
        { return new type.NewExpression(expr); }

    / '[' __ head:Expression? tail:(__ ',' __ Expression)* __ ','? __ ']'
        {
            var list = [];
            if (head !== null) {
                list.push(head);
            }
            list = list.concat(tail.map(function(item) { return item[3]; }));
            return new type.ListLiteral(list);
        }

    / '{'
            head:(__ AnyKeyValuePair)?
            tail:(__ ','? __ AnyKeyValuePair)* __ ','? __
      '}'
        {
            var obj = new type.ObjectLiteral();
            if (head !== null) obj.add(head[1]);
            for (var i = 0; i < tail.length; i++) {
                if (tail[i][3].key) {
                    obj.add(tail[i][3]);
                }
            }
            return obj;
        }

    / '(' _ params:IdentifierTuple _ ')' _ '->' IndentNewline body:Block IndentRemove
        {
            body.isScope = true;
            return new type.Function(params, body);
        }

    / '(' _ params:IdentifierTuple _ ')' _ '->' _ body:Statement
        {
            body.isScope = true;
            return new type.Function(params, new type.Return(body));
        }

    / GroupedExpression

KeyValuePair
    = key:Identifier _ ':' _ value:Expression
        { return {key: key, value: value}; }

AnyKeyValuePair
    = key:(
        str:IdentifierPart                   { return str.join(''); }
        / '"' str:DoubleStringCharacter* '"' { return str.join(''); }
        / "'" str:SingleStringCharacter* "'" { return str.join(''); }
      ) _ ':' _ value:Expression
        { return {key: key, value: value}; }

GroupedExpression
    = '(' __ a:Expression __ ')'
        { return new type.Group(a); }

Range
    = from:Expression _ ':' equals:'='? _ to:Expression _ by:(':' _ Expression)?
        {
            by = by ? by[2] : {value: 1};
            return new type.Range(from, to, by, !!equals); }

Number
    = '-'? ('0' / [1-9] [0-9]*) fract:('.' [0-9]+)? e:('e' '-'? [0-9]+)?
        { return new type.Number(text()); }

HexNumber
    = '0x' [0-9a-fA-F]+
        { return new type.Literal(text()); }

Identifier
    = $ (!ReservedWord IdentifierPart)

AnyIdentifier
    =  $ (Digits / Letters / '_' / '\.')+

TypedIdentifier
    = identifierType:(Type ' '+)? identifier:Identifier
     { return new type.TypedIdentifier(identifierType ? identifierType[0] : null, identifier); }

Type
    = $ 'int'

IdentifierPart
    = (Digits / Letters / '_')+

IdentifierTuple
    = head:TypedIdentifier tail:(_ ',' _ TypedIdentifier)* _
        {
            tail = tail.map(function(item) { return item[3]; });
            return [head].concat(tail);
        }
    / { return [] }

ExpressionTuple
    = head:Expression tail:(__ ',' __ Expression)*
        {
            tail = tail.map(function(item) { return item[3]; });
            return [head].concat(tail);
        }
    / { return [] }

Digits
    = $ [0-9]+

Letters
    = $ [a-zA-Z$_]+

_
    = (' ' / '\t' / Comment)*

__
    = (' ' / '\t' / '\r' / '\n' / Comment)*

Noop
    = _
        { return new type.Noop(); }

ReservedWord
  = Keyword
  / Literal

Keyword
    = (
        'break'
        / 'case'
        / 'catch'
        / 'continue'
        / 'debugger'
        / 'default'
        / 'delete'
        / 'do'
        / 'else'
        / 'finally'
        / 'for'
        / 'function'
        / 'if'
        / 'instanceof'
        / 'in'
        / 'new'
        / 'return'
        / 'switch'
        / 'this'
        / 'throw'
        / 'try'
        / 'typeof'
        / 'var'
        / 'void'
        / 'while'
        / 'with'
        / 'class'
        / 'const'
        / 'enum'
        / 'export'
        / 'extends'
        / 'import'
        / 'super'
        / 'pass'
    ) !IdentifierPart

Literal
    = word:('null' / 'true' / 'false' / 'undefined' )
        { return new type.Literal(word); }

ThisToken
    = tokens:'@'+
        { return new type.ThisToken(tokens.length - 1); }

ThisProperty
    = token:ThisToken ident:Identifier
        { return new type.PropertyAccess(token, new type.Literal(ident), '.'); }

StringLiteral "string"
  = parts:('"' DoubleStringCharacter* '"' / "'" SingleStringCharacter* "'")
    {
        var d = parts[0];
        var text = parts[1] !== null ? parts[1].join('') : "";

        // Is this a normal string?
        if (text.indexOf('#\x7b') === -1) {
            return new type.StringLiteral(d, text);
        }

        // Oh, it contains variables. Let's reparse it then! Somewhat of a hack, but.. :)
        var re = new RegExp("#{([^\x7d]+)}", "g");
        text = d + text.replace(re, d + ' + $1 + ' + d) + d;
        return parser.parse(text, {startRule: 'Expression'});

    }

DoubleStringCharacter
  = !('"' / "\\" ) . { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }

SingleStringCharacter
  = !("'" / "\\" ) . { return text(); }
  / "\\" sequence:EscapeSequence { return sequence; }

EscapeSequence
  = CharacterEscapeSequence

CharacterEscapeSequence
  = SingleEscapeCharacter
  / NonEscapeCharacter

SingleEscapeCharacter
  = "'"
  / '"'
  / "\\" { return "\\\\"; }
  / "b"  { return "\\b";   }
  / "f"  { return "\\f";   }
  / "n"  { return "\\n";   }
  / "r"  { return "\\r";   }
  / "t"  { return "\\t";   }
  / "v"  { return "\\x0B"; }   // IE does not recognize "\v".

NonEscapeCharacter
  = !(EscapeCharacter / EOL) . { return text(); }

EscapeCharacter
  = SingleEscapeCharacter

RegularExpressionLiteral "regular expression"
  = "/" pattern:RegularExpressionBody "/" flags:RegularExpressionFlags {
      var value;

      try {
        value = new RegExp(pattern, flags);
      } catch (e) {
        error(e.message);
      }

      return new type.Regex(pattern, flags);
    }

RegularExpressionBody
  = RegularExpressionFirstChar RegularExpressionChar* { return text(); }

RegularExpressionFirstChar
  = ![*\\/[] RegularExpressionNonTerminator
  / RegularExpressionBackslashSequence
  / RegularExpressionClass

RegularExpressionChar
  = ![\\/[] RegularExpressionNonTerminator
  / RegularExpressionBackslashSequence
  / RegularExpressionClass

RegularExpressionBackslashSequence
  = "\\" RegularExpressionNonTerminator

RegularExpressionNonTerminator
  = !EOL .

RegularExpressionClass
  = "[" RegularExpressionClassChar* "]"

RegularExpressionClassChar
  = ![\]\\] RegularExpressionNonTerminator
  / RegularExpressionBackslashSequence

RegularExpressionFlags
  = IdentifierPart*
