parser: src/parser.js

src/parser.js:
	./node_modules/pegjs/bin/pegjs --allowed-start-rules Program,Expression,Statement src/parser.peg src/parser.js

clean:
	rm src/parser.js

test: src/parser.js
	bailey ./test ./test --node
	npm test

.PHONY: test clean parser
