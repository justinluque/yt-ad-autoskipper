.PHONY: build icons version test

build:
	@mkdir -p build
	@rm -f build/yt-ad-autoskipper.zip build/yt-ad-autoskipper.xpi
	zip build/yt-ad-autoskipper.zip mutead.js skipad.js youtube_override.js options.js options.html manifest.json logo.png logo.svg icons/*.png LICENSE.md README.md
	cp build/yt-ad-autoskipper.zip build/yt-ad-autoskipper.xpi

icons:
	@mkdir -p icons
	@for size in 16 32 48 64 96; do rsvg-convert --width=$$size --height=$$size logo.svg --output=icons/$$size.png || exit 1; done
	rsvg-convert --width=128 --height=128 logo.svg --output=logo.png

test:
	node --test tests/*.test.cjs

version:
	@cat manifest.json | jq '.version'
