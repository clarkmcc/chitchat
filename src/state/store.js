import { configureStore } from "@reduxjs/toolkit";
import messagesReducer from "./messagesSlice";
import appReducer from "./appSlice";

export default configureStore({
  reducer: {
    messages: messagesReducer,
    app: appReducer,
  },
});
