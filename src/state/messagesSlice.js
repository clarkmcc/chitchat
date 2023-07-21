import { createSlice } from "@reduxjs/toolkit";

export const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    worldFreeze: false,
    modelLoaded: false,
    messages: [],
    pendingMessage: "",
    messageInProgress: false,
  },
  reducers: {
    loadedModel: (state) => {
      state.modelLoaded = true;
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    setWorldFreeze: (state, action) => {
      state.worldFreeze = action.payload;
    },
    addPendingMessageTokens: (state, action) => {
      state.messageInProgress = true;
      state.pendingMessage += action.payload;
      console.log(state.pendingMessage);
    },
    finishLastMessage: (state) => {
      state.messageInProgress = false;
      state.messages.push({
        message: state.pendingMessage,
        isUser: false,
        finished: true,
      });
      state.pendingMessage = "";
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
});

export const {
  loadedModel,
  finishLastMessage,
  addMessage,
  setWorldFreeze,
  addPendingMessageTokens,
  clearMessages,
} = messagesSlice.actions;
export default messagesSlice.reducer;
