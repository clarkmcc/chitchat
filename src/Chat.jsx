import { Box, CircularProgress, Input, useTheme } from "@mui/joy";
import IconButton from "@mui/joy/IconButton";
import {
  ArrowCircleLeft,
  Cancel,
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
import { isWindows, useError, useCancellation, useRateTracker } from "./utilities.js";

export default function Chat({}) {
  const endOfMessagesRef = useRef(null);
  const messages = useSelector((state) => state.messages.messages);
  const messageInProgress = useSelector(
    (state) => state.messages.messageInProgress,
  );
  const pendingMessage = useSelector((state) => state.messages.pendingMessage);
  const worldFreeze = useSelector((state) => state.messages.worldFreeze);
  const isCancelling = useSelector((state) => state.messages.cancelling);
  const cancel = useCancellation();
  const dispatch = useDispatch();
  const [tokenRate, observeTokens, resetTokenRate] = useRateTracker();

  const theme = useTheme();
  const [message, setMessage] = useState("");
  const [setError] = useError();

  const handleSend = useCallback(async () => {
    dispatch(setWorldFreeze(true));
    resetTokenRate();

    createUserMessage(message);
    try {
      await prompt(message, (tokens) => {
        dispatch(addPendingMessageTokens(tokens));
        observeTokens();
        scrollToBottom();
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

  function scrollToBottom() {
    endOfMessagesRef?.current?.scrollIntoView({ behavior: "smooth" });
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
    <>
      <Box
        className={`overflow-auto flex-grow ${
          messages.length === 0 ? "flex items-center justify-center" : ""
        }`}
      >
        <Box
          className={`p-4 space-y-4 flex-grow ${
            messages.length === 0 ? "flex" : ""
          } `}
        >
          {messages.length === 0 && <ModelLoadingSplash />}
          {messages.map((m, i) => (
            <ChatBubble key={i} isUser={m.isUser} message={m.message} />
          ))}
          {messageInProgress && (
            <ChatBubble
              isUser={false}
              message={pendingMessage}
              loading={true}
            />
          )}
          <div ref={endOfMessagesRef} />
        </Box>
      </Box>
      <Box className="sticky bottom-0" p={2}>
        {!isNaN(tokenRate) && (
          <div
            className="text-xs mb-3"
            style={{ color: theme.palette.text.tertiary }}
          >
            {Math.round(tokenRate * 100) / 100} tokens/s
          </div>
        )}
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          size="lg"
          placeholder={placeholder}
          fullWidth={true}
          onKeyDown={handleSendKeyDown}
          endDecorator={
            worldFreeze ? (
              isCancelling ? (
                <CircularProgress size="sm" color="danger" />
              ) : (
                <IconButton color="danger" onClick={cancel}>
                  <Cancel />
                </IconButton>
              )
            ) : (
              <IconButton color="neutral" onClick={handleSend}>
                <Send />
              </IconButton>
            )
          }
        />
      </Box>
    </>
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
