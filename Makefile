default: parser browser

browser: build/bailey.js build/bailey.min.js

parser: clean src/parser.js

build/bailey.js: parser
	./node_modules/browserify/bin/cmd.js src/compiler.js -s bailey -o build/bailey.js

build/bailey.min.js: parser
	./node_modules/browserify/bin/cmd.js src/compiler.js -s bailey -g uglifyify -o build/bailey.min.js

src/parser.js:
	./node_modules/pegjs/bin/pegjs --allowed-start-rules Program,Expression,Statement src/parser.peg src/parser.js

clean:
	rm src/parser.js

test: src/parser.js
	node bailey.js ./test ./test --node
	mocha

.PHONY: test clean parser
