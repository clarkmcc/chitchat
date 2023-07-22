import { useDispatch } from "react-redux";
import { dismissError, setError } from "./state/appSlice.js";

export function useError() {
  const dispatch = useDispatch();
  const set = (message) => {
    console.error(message);
    dispatch(setError(message));
  };
  const dismiss = () => dispatch(dismissError());
  return [set, dismiss];
}

export function isWindows() {
  return window.navigator.platform.indexOf("Win") !== -1;
}
