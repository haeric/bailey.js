default: parser browser

browser: clean-build build/bailey.js build/bailey.min.js

parser: clean src/parser.js

build/bailey.js: parser
	./node_modules/browserify/bin/cmd.js src/compiler.js -s bailey -o build/bailey.js

build/bailey.min.js: parser
	./node_modules/browserify/bin/cmd.js src/compiler.js -s bailey -g uglifyify -o build/bailey.min.js

src/parser.js: node_modules
	./node_modules/pegjs/bin/pegjs --allowed-start-rules Program,Expression,Statement src/parser.peg src/parser.js

clean:
	rm -f src/parser.js

clean-build:
	rm -rf build/
	mkdir build

test: src/parser.js
	node bailey.js ./test ./test --node
	mocha

node_modules:
	npm install

.PHONY: test clean parser browser default
