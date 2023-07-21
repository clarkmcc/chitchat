import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { CssVarsProvider } from "@mui/joy/styles";
import { Provider } from "react-redux";
import store from "./state/store.js";
import { CssBaseline } from "@mui/joy";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <CssVarsProvider defaultMode="system">
      <CssBaseline />
      <Provider store={store}>
        <App />
      </Provider>
    </CssVarsProvider>
  </React.StrictMode>,
);
