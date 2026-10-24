.PHONY: build version test

build:
	@mkdir -p build
	@rm -f build/yt-ad-autoskipper.zip build/yt-ad-autoskipper.xpi
	zip build/yt-ad-autoskipper.zip mutead.js skipad.js youtube_override.js options.js options.html manifest.json logo.png LICENSE.md README.md
	cp build/yt-ad-autoskipper.zip build/yt-ad-autoskipper.xpi

test:
	node --test tests/*.test.cjs

version:
	@cat manifest.json | jq '.version'
