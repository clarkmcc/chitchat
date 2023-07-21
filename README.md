# Chitchat

![](https://i.imgur.com/sFMcGxT.mp4)

A simple LLM chat front-end that makes it easy to find, download, and mess around with LLM models on your local machine.
This is a very early-stage project, so expect bugs and missing features. On the bright side, here's what it supports
today:

* Easily download and run built-in LLM models -- don't worry about trying to figure out where to find a model and how to
  run it, just click a button and go!
* Optional GPU support (nvidia and metal)
* Statically compiled -- no dependencies
* Cross-platform -- works on Windows, Linux, and macOS
* Dark and light modes

## Roadmap

* Code cleanup and refactoring to make the project more collaborator-friendly
* Support for custom models (provided as a URL or filesystem path)
* Support for LoRAs
* Support for custom tokenizers from HuggingFace
* Cancelling inference midway through

## Custom models

Currently, this project does not support providing your own models but this is a planned feature. If you want to add a
publicly available model, just add an entry to the [models.json](./src-tauri/data/models.json) file. Models registered
in the file will be available in the user interface for download.

## How does it work?

This is just a Tauri frontend on the incredible [rustformers/llm](https://github.com/rustformers/llm) project. This
means that any bugs in model execution or performance should be taken up in that project.