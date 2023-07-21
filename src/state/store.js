import { configureStore } from "@reduxjs/toolkit";
import messagesReducer from "./messagesSlice";

export default configureStore({
  reducer: {
    messages: messagesReducer,
  },
});
