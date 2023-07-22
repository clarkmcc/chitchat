import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

export async function prompt(message, onToken) {
  let stop = () => {};
  stop = await listen("prompt_response", (event) => {
    if (event.payload?.message?.length > 0) onToken(event.payload.message);
    console.debug(event);
  });
  await invoke("prompt", { message });
  stop();
}

export async function getModels() {
  return await invoke("get_models");
}

export async function getArchitectures() {
  return await invoke("get_architectures");
}
