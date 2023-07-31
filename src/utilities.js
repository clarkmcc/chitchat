import { useDispatch } from "react-redux";
import { dismissError, setError } from "./state/appSlice.js";
import { useEffect, useState } from "react";

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

/**
 * A React hook that tracks the rate of some event. This hook returns
 * a [rate, event observation function, and reset function]
 */
export function useRateTracker() {
  const [timestamps, setTimestamps] = useState([]);
  const [rate, setRate] = useState(0);

  // Observes an event and updates the rate at which the event is occurring.
  const observe = () => {
    setTimestamps((timestamps) => {
      const now = Date.now();
      const newTimestamps = timestamps.slice(-9);
      newTimestamps.push(now);
      return newTimestamps;
    });
  };

  const reset = () => {
    setTimestamps([]);
    setRate(0);
  };

  // Update the event rate as timestamps change
  useEffect(() => {
    const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000; // in seconds
    if (duration === 0) return;
    setRate(timestamps.length / duration);
  }, [timestamps]);

  return [rate, observe, reset];
}
