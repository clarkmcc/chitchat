# Chitchat

[//]: # (<img width="1066" alt="image" src="https://github.com/clarkmcc/chitchat/assets/6639685/fcd58f1c-df3b-40d1-a138-8639cde0c684">)
![](https://s12.gifyu.com/images/SWXTP.gif)

A simple LLM chat front-end that makes it easy to find, download, and mess around with LLM models on your local machine.
This is a very early-stage project, so expect bugs and missing features. On the bright side, here's what it supports
today:

* Easily download and run built-in LLM models -- don't worry about trying to figure out where to find a model and how to
  run it, just click a button and go!
* Load your own models
* Optional GPU support (nvidia and metal)
* Statically compiled -- no dependencies
* Cross-platform -- works on Windows, Linux, and macOS
* Dark and light modes

## Roadmap

[x] Support for custom models (provided as a URL or filesystem path)
[] Code cleanup and refactoring to make the project more collaborator-friendly
[] Support for LoRAs
[] Support for custom tokenizers from HuggingFace
[] Cancelling inference midway through

## Privacy and Analytics

I'm using [Aptabase's Tauri integration](https://aptabase.com/blog/catching-panics-on-tauri-apps) to catch and report
panics
to me as well as other basic events like the number of model downloads. All statistics are anonymous and behind a cargo
feature flag (`analytics`). While the release binaries ship with anonymous analytics, you can build from source without
that flag to remove them.

## How does it work?

This is just a Tauri frontend on the incredible [rustformers/llm](https://github.com/rustformers/llm) project. This
means that any bugs in model execution or performance should be taken up in that project.
