import { Box, CircularProgress, Input, useTheme } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import {
  ArrowCircleLeft,
  ArrowCircleLeftOutlined,
  ArrowLeft,
  CheckCircle,
  Send,
} from "@mui/icons-material";
import React, { useCallback, useRef, useState } from "react";
import ChatBubble from "./ChatBubble.jsx";
import { prompt } from "./api.js";
import { useDispatch, useSelector } from "react-redux";
import {
  addMessage,
  addPendingMessageTokens,
  finishLastMessage,
  setWorldFreeze,
} from "./state/messagesSlice.js";
import { isWindows, useError } from "./utilities.js";

export default function Chat({}) {
  const endOfMessagesRef = useRef(null);
  const messages = useSelector((state) => state.messages.messages);
  const messageInProgress = useSelector(
    (state) => state.messages.messageInProgress,
  );
  const pendingMessage = useSelector((state) => state.messages.pendingMessage);
  const worldFreeze = useSelector((state) => state.messages.worldFreeze);
  const dispatch = useDispatch();

  const [message, setMessage] = useState("");
  const [setError] = useError();

  const handleSend = useCallback(async () => {
    dispatch(setWorldFreeze(true));
    endOfMessagesRef?.current?.scrollIntoView({ behavior: "smooth" });

    createUserMessage(message);
    try {
      await prompt(message, (tokens) => {
        dispatch(addPendingMessageTokens(tokens));
      });
    } catch (e) {
      setError(e);
    }

    dispatch(finishLastMessage());
    dispatch(setWorldFreeze(false));
    setMessage("");
  }, [message]);

  function createUserMessage(message) {
    dispatch(addMessage({ isUser: true, finished: true, message }));
  }

  const handleSendKeyDown = async (event) => {
    if (event.keyCode === 13 && (event.metaKey || event.ctrlKey)) {
      await handleSend();
    }
  };

  const placeholder = isWindows()
    ? "CTRL + Enter to send"
    : "⌘ + Enter to send";

  return (
    <Box className="relative" sx={{ width: "100%" }}>
      <Box
        className={`p-4 space-y-4 pb-16 ${
          messages.length === 0 ? "flex" : ""
        } `}
        sx={{ height: "100vh", "-webkit-scrollbar": { display: "none" } }}
      >
        {messages.length === 0 && <ModelLoadingSplash />}
        {messages.map((m, i) => (
          <ChatBubble key={i} isUser={m.isUser} message={m.message} />
        ))}
        {messageInProgress && (
          <ChatBubble isUser={false} message={pendingMessage} loading={true} />
        )}
        <div ref={endOfMessagesRef} />
      </Box>
      <Box className="absolute bottom-0" sx={{ width: "100%" }} p={2}>
        <Input
          value={message}
          disabled={worldFreeze}
          onChange={(e) => setMessage(e.target.value)}
          size="lg"
          placeholder={placeholder}
          fullWidth={true}
          onKeyDown={handleSendKeyDown}
          endDecorator={
            worldFreeze ? (
              <CircularProgress size="sm" color="neutral" />
            ) : (
              <IconButton color="neutral" onClick={handleSend}>
                <Send />
              </IconButton>
            )
          }
        />
      </Box>
    </Box>
  );
}

function ModelLoadingSplash() {
  const modelLoaded = useSelector((state) => state.messages.modelLoaded);
  const theme = useTheme();
  if (modelLoaded) {
    return (
      <div
        className="text-center m-auto"
        style={{ color: theme.palette.text.tertiary }}
      >
        <div className="mb-3">
          <CheckCircle sx={{ fontSize: 60 }} />
        </div>
        <div className="text-2xl font-bold">Model loaded</div>
        <div className="text-sm">Get started by typing a prompt below</div>
      </div>
    );
  } else {
    return (
      <div
        className="text-center m-auto"
        style={{ color: theme.palette.text.tertiary }}
      >
        <div className="mb-3">
          <ArrowCircleLeft sx={{ fontSize: 60 }} />
        </div>
        <div className="text-2xl font-bold">Load a model</div>
        <div className="text-sm">Then click "Start" to begin prompting</div>
      </div>
    );
  }
}
