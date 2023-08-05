import { createSlice } from "@reduxjs/toolkit";

export const messagesSlice = createSlice({
  name: "messages",
  initialState: {
    worldFreeze: false,
    modelLoaded: false,
    messages: [],
    pendingMessage: "",
    messageInProgress: false,
    cancelling: false,
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
      let message = action.payload;
      if (state.pendingMessage.length === 0) {
        message = message.trimStart();
      }
      state.pendingMessage += message;
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
    setCancelling: (state, action) => {
      state.cancelling = action.payload;
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
  setCancelling,
} = messagesSlice.actions;
export default messagesSlice.reducer;
