import React, { useEffect, useState } from "react";
import "./App.css";
import { Alert, Box, Button, Grid } from "@mui/joy";
import Sidebar from "./Sidebar.jsx";
import Chat from "./Chat.jsx";
import { getArchitectures, getModels, getPromptTemplates } from "./api.js";
import { useSelector } from "react-redux";
import { useError } from "./utilities.js";

function App() {
  const [models, setModels] = useState([]);
  const modelsLoaded = models.length > 0;
  const [templates, setTemplates] = useState([]);
  const templatesLoaded = templates.length > 0;
  const [architectures, setArchitectures] = useState([]);
  const architecturesLoaded = architectures.length > 0;
  const error = useSelector((state) => state.app.error);
  const [setError, dismissError] = useError();

  useEffect(() => {
    loadModels();
  }, []);
  useEffect(() => {
    getArchitectures().then(setArchitectures).catch(setError);
  }, []);
  useEffect(() => {
    getPromptTemplates().then(setTemplates).catch(setError);
  }, []);

  function loadModels() {
    getModels().then(setModels).catch(setError);
  }

  return (
    <>
      {error && (
        <Alert
          className="top-0 sticky"
          color="danger"
          endDecorator={
            <Button
              size="sm"
              variant="soft"
              color="danger"
              onClick={dismissError}
            >
              Dismiss
            </Button>
          }
        >
          <Box className="pt-5">Error: {JSON.stringify(error)}</Box>
        </Alert>
      )}
      <div className="h-screen flex overflow-hidden">
        <div
          className="flex flex-col h-full overflow-hidden"
          style={{ minWidth: "500px", width: "500px" }}
        >
          {modelsLoaded && architecturesLoaded && templatesLoaded && (
            <Sidebar
              models={models}
              architectures={architectures}
              templates={templates}
              refreshModels={loadModels}
            />
          )}
        </div>
        <div className="flex-grow flex flex-col h-full overflow-hidden">
          <Chat />
        </div>
      </div>
    </>
  );
}

export default App;
