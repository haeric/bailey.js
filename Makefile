BIN=./node_modules/.bin

default: parser browser

help:
	@echo "browser - make browser version"
	@echo "parser  - create the peg parser if it does not exist"
	@echo "clean   - delete the peg parser"
	@echo "test    - run this often"

browser: clean-build build/bailey.js build/bailey.min.js

parser: clean src/parser.js

build/bailey.js: parser
	$(BIN)/browserify src/compiler.js -s bailey -o build/bailey.js

build/bailey.min.js: parser
	$(BIN)/browserify src/compiler.js -s bailey -g uglifyify -o build/bailey.min.js

src/parser.js: node_modules
	$(BIN)/pegjs --allowed-start-rules Program,Expression,Statement src/parser.pegjs src/parser.js

clean:
	rm -f src/parser.js

clean-build:
	rm -rf build/
	mkdir build

test: src/parser.js
	node bailey.js ./test ./test --node
	$(BIN)/mocha

lint:
	$(BIN)/jshint src
	$(BIN)/jscs src

node_modules:
	npm install

.PHONY: test clean parser browser default
