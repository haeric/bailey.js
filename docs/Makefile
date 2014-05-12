default:
	@echo "Build all the docs"
	@echo "make build - build the docs to _site/"
	@echo "make serve - serve the docs on 0.0.0.0:4000"
	@echo "make publish - publish the docs on origin/gh-pages"

examples:
	cp -r ../examples examples

examples/js: 
	bailey examples/ examples/js/ --bare

build: examples/js 
	jekyll build

serve: examples/js
	jekyll serve -w

publish: generate
	ghp-import _site/
	git push gh gh-pages
