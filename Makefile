parser: src/parser.js

src/parser.js:
	./node_modules/pegjs/bin/pegjs --allowed-start-rules Program,Expression,Statement src/parser.peg src/parser.js

clean:
	rm src/parser.js

test: src/parser.js
	node bailey.js ./test ./test --node
	mocha

.PHONY: test clean parser
