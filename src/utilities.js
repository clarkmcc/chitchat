import { useDispatch } from "react-redux";
import { dismissError, setError } from "./state/appSlice.js";
import { cancel } from "./api.js";
import { setCancelling } from "./state/messagesSlice.js";

export function useError() {
  const dispatch = useDispatch();
  const set = (message) => {
    console.error(message);
    dispatch(setError(message));
  };
  const dismiss = () => dispatch(dismissError());
  return [set, dismiss];
}

export function useCancellation() {
  const dispatch = useDispatch();
  const [setError] = useError();
  return () => {
    dispatch(setCancelling(true));
    cancel()
      .then()
      .catch(setError)
      .finally(() => dispatch(setCancelling(false)));
  };
}

export function isWindows() {
  return window.navigator.platform.indexOf("Win") !== -1;
}
