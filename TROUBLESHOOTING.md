# Troubleshooting

## App Crashes

### Starting a model

If the app crashes when you try and start a model, you may be trying to run the macOS 64-bit version through Rosetta.
Rosetta will not work with this app. Make sure to use the arm binaries.

### Sending a prompt

If the app crashes when you send a chat, try disabling the GPU, or try using a smaller model.
I've [reported the issue](https://github.com/rustformers/llm/issues/383) upstream, and there appears to be some bugs in
the metal GPU implementation.