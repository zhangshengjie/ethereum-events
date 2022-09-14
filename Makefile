VERSION=$(shell node VERSION.js)

.PHONY: help
help:
	@echo "Usage: make [target]"
	@echo "Available targets:"
	@echo "1、clean\n2、publish"

.PHONY: clean
clean:
	rm -rf dist

.PHONY: build
build:
	npm run build

.PHONY:dockerbuild
dockerbuild:
	@echo "Building docker image ethereum-events:$(VERSION)"
	docker build -f ./Dockerfile -t ethereum-events:$(VERSION) .

.PHONY: dockertag
dockertag:
	@echo "Tagging docker image $(TAG)"
	docker tag ethereum-events:$(VERSION) cejay/ethereum-events:$(TAG)
	

.PHONY:dockerpublish
dockerpublish:
	@echo "Publishing to cejay/ethereum-events:$(TAG)"
	docker push cejay/ethereum-events:$(TAG)


.PHONY: publish
publish:
	make clean
	make build
	make dockerbuild
	make dockertag TAG=$(VERSION)
	make dockerpublish TAG=$(VERSION)
	make dockertag TAG=latest
	make dockerpublish TAG=latest