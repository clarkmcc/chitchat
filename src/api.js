import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";

export async function prompt(message, onToken) {
  let stop = () => {};
  try {
    stop = await listen("prompt_response", (event) => {
      if (event.payload?.message?.length > 0) onToken(event.payload.message);
      console.debug(event);
    });
    await invoke("prompt", { message });
  } catch (e) {
    // todo: notify user of error
    console.error(e);
  }
  stop();
}
