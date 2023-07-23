# Chitchat

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
* Chat-style context

## Downloads

See [releases](https://github.com/clarkmcc/chitchat/releases) for more downloads.

- [macOS (M1)](https://github.com/clarkmcc/chitchat/releases/download/v0.1.1/Chitchat_0.1.1_apple_m1.zip)
- [macOS (Intel)](https://github.com/clarkmcc/chitchat/releases/download/v0.1.1/Chitchat_0.1.1_x64.dmg)
- [Windows (64-bit)](https://github.com/clarkmcc/chitchat/releases/download/v0.1.1/Chitchat_0.1.1_x64_en-US.msi)

## Roadmap

- [x] Support for custom models (provided as a URL or filesystem path)
- [ ] Code cleanup and refactoring to make the project more collaborator-friendly
- [ ] Support for LoRAs
- [ ] Support for custom tokenizers from HuggingFace
- [ ] Cancelling inference midway through
- [ ] Alternative
  backends ([rustformers/llm](https://github.com/rustformers/llm), [llama.cpp](https://github.com/ggerganov/llama.cpp),
  etc.)

## Custom Models

All models are downloaded and loaded from the `~/.chitchat/models` directory. You can drop the `.bin` files in here.
Currently, this project does not support multi-file models

To download models that aren't supported natively in this project, check out the following links.

* [r/LocalLLaMA](https://www.reddit.com/r/LocalLLaMA/wiki/models/)
* [huggingface.co/localmodels](https://huggingface.co/localmodels)

## Troubleshooting

### App Crashes

#### Starting a model

If the app crashes when you try and start a model, you may be trying to run the macOS 64-bit version through Rosetta.
Rosetta will not work with this app. Make sure to use the arm binaries.

#### Sending a prompt

If the app crashes when you send a chat, try disabling the GPU, or try using a smaller model.
I've [reported the issue](https://github.com/rustformers/llm/issues/383) upstream, and there appears to be some bugs in
the metal GPU implementation.

## How does it work?

This is just a Tauri frontend on the incredible [rustformers/llm](https://github.com/rustformers/llm) project. This
means that any bugs in model execution or performance should be taken up in that project.
