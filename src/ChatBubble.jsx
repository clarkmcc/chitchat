import { Box, CircularProgress, useTheme } from "@mui/joy";

const borderRadius = "20px";

function getMessageBackground(isUser, theme) {
  if (theme.palette.mode === "dark") {
    return isUser ? theme.palette.primary[800] : theme.palette.neutral[800];
  } else {
    return isUser ? theme.palette.primary[100] : theme.palette.neutral[100];
  }
}

function getMessageColor(isUser, theme) {
  if (theme.palette.mode === "dark") {
    return isUser ? theme.palette.primary[200] : "white";
  }
  return isUser ? theme.palette.primary[900] : theme.palette.neutral[900];
}

export default function ChatBubble({ isUser, message, loading, ...props }) {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === "dark";
  const messageBackground = getMessageBackground(isUser, theme);
  const messageColor = getMessageColor(isUser, theme);

  if (isUser) {
    return (
      <Box className="w-full block">
        <Box
          className="float-right"
          p={1}
          px={2}
          sx={{
            borderRadius: `${borderRadius} ${borderRadius} 0px ${borderRadius}`,
            backgroundColor: messageBackground,
            width: "90%",
          }}
        >
          <Message
            message={message}
            backgroundColor={messageBackground}
            color={messageColor}
            loading={loading}
            {...props}
          />
        </Box>
        <Box className="clear-both" />
      </Box>
    );
  }
  return (
    <Box className="w-full block">
      <Box
        className="float-left"
        p={1}
        px={2}
        sx={{
          borderRadius: `${borderRadius} ${borderRadius} ${borderRadius} 0px`,
          backgroundColor: messageBackground,
          width: "90%",
        }}
      >
        <Message
          message={message}
          backgroundColor={messageBackground}
          color={messageColor}
          loading={loading}
          {...props}
        />
      </Box>
      <Box className="clear-both" />
    </Box>
  );
}

function Message({ message, loading, backgroundColor, color, ...props }) {
  return (
    <Box
      sx={{ backgroundColor, outline: 0, border: 0, color }}
      className="break-words"
    >
      {message}
      {loading && (
        <CircularProgress
          color="neutral"
          sx={{
            "--CircularProgress-trackThickness": "3px",
            "--CircularProgress-progressThickness": "4px",
            "--CircularProgress-size": "12px",
            left: "5px",
          }}
        />
      )}
    </Box>
  );
}
