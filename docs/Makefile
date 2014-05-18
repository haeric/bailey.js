default:
	@echo "Build all the docs"
	@echo "make - install dependencies"
	@echo "make build - build the docs to _site/"
	@echo "make serve - serve the docs on 0.0.0.0:4000"
	@echo "make publish - publish the docs on origin/gh-pages"

setup:
	gem install jekyll
	pip install ghp-import

build:
	jekyll build

serve:
	jekyll serve -w

publish: build
	ghp-import _site
	git push origin gh-pages

test: build