import { createSlice } from "@reduxjs/toolkit";

export const appSlice = createSlice({
  name: "app",
  initialState: {
    error: "",
  },
  reducers: {
    setError: (state, action) => {
      state.error = action.payload;
    },
    dismissError: (state) => {
      state.error = "";
    },
  },
});

export const { setError, dismissError } = appSlice.actions;
export default appSlice.reducer;
