[![Banner-Dark](https://github.com/clarkmcc/chitchat/assets/6639685/4638912f-5093-473d-8b08-39b0136052fa#gh-dark-mode-only)](https://github.com/clarkmcc/chitchat/assets/6639685/4638912f-5093-473d-8b08-39b0136052fa#gh-dark-mode-only)
[![Banner-Light](https://github.com/clarkmcc/chitchat/assets/6639685/d61035a6-edeb-4cc3-ba37-f90be5f10a02#gh-light-mode-only)](https://github.com/clarkmcc/chitchat/assets/6639685/d61035a6-edeb-4cc3-ba37-f90be5f10a02#gh-light-mode-only)

![](https://media.githubusercontent.com/media/clarkmcc/chitchat/main/assets/demo.gif)

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
* Upload files (.pdf, .txt, .html) and chat about the file contents
* Chat-style context
* Prompt templates

## Downloads

See [releases](https://github.com/clarkmcc/chitchat/releases) for more downloads.

- [macOS (M1)](https://github.com/clarkmcc/chitchat/releases/download/v0.3.0/Chitchat_0.3.0_aarch64.dmg)
- [macOS (Intel)](https://github.com/clarkmcc/chitchat/releases/download/v0.3.0/Chitchat_0.3.0_x64.dmg)
- [Windows (64-bit)](https://github.com/clarkmcc/chitchat/releases/download/v0.3.0/Chitchat_0.3.0_x64_en-US.msi)

## Custom Models

All models are downloaded and loaded from the `~/.chitchat/models` directory. You can drop the `.bin` files in here.
Currently, this project only supports ggml models.

To download models that aren't supported natively in this project, check out the following links.

* [r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/wiki/models/)
* [huggingface.co/localmodels](https://huggingface.co/localmodels)

## How does it work?

This is just a Tauri frontend on the incredible [rustformers/llm](https://github.com/rustformers/llm) project. This
means that any bugs in model execution or performance should be taken up in that project.

## Troubleshooting

See [troubleshooting](TROUBLESHOOTING.md) for more information.
