# Chitchat

[//]: # (<img width="1066" alt="image" src="https://github.com/clarkmcc/chitchat/assets/6639685/fcd58f1c-df3b-40d1-a138-8639cde0c684">)
![example](https://s12.gifyu.com/images/SWXTP.gif)

A simple LLM chat front-end that makes it easy to find, download, and mess around with LLM models on your local machine.
This is a very early-stage project, so expect bugs and missing features. On the bright side, here's what it supports
today:

* Easily download and run built-in LLM models
* Load your own models
* GPU support
* Statically compiled
* Cross-platform
* Dark and light modes
* Warm-up prompting
* Chat-style context

## Roadmap

- [x] Support for custom models (provided as a URL or filesystem path)
- [ ] Code cleanup and refactoring to make the project more collaborator-friendly
- [ ] Support for LoRAs
- [ ] Support for custom tokenizers from HuggingFace
- [ ] Cancelling inference midway through

## How does it work?

This is just a Tauri frontend on the incredible [rustformers/llm](https://github.com/rustformers/llm) project. This
means that any bugs in model execution or performance should be taken up in that project.
