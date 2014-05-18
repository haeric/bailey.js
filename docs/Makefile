default:
	@echo "Build all the docs"
	@echo "make setup- install dependencies"
	@echo "make build - build the docs to _site/"
	@echo "make serve - serve the docs on 0.0.0.0:4000"
	@echo "make publish - publish the docs on origin/gh-pages"
	@echo "make docset - generate docset for Dash"

setup:
	gem install jekyll execjs
	pip install ghp-import

build:
	jekyll build

serve:
	jekyll serve -w

publish: build docset
	rm -rf _site/dash _site/bailey.docset _site/dash-docset-generation
	ghp-import _site
	git push origin gh-pages

docset: build
	mkdir -p bailey.docset/Contents/Resources/Documents/
	cp -R _site/* bailey.docset/Contents/Resources/Documents/.
	rm -rf bailey.docset/Contents/Resources/Documents/bailey.docset bailey.docset/Contents/Resources/Documents/dash-docset-generation bailey.docset/Contents/Resources/Documents/index.html
	cp dash-docset-generation/docset.plist bailey.docset/Contents/Info.plist
	python dash-docset-generation/generate-index.py
	tar --exclude='.DS_Store' -cvzf bailey.tgz bailey.docset

test: build
