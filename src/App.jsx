import React, { useEffect, useState } from "react";
import "./App.css";
import { Alert, Box, Button, Grid } from "@mui/joy";
import Sidebar from "./Sidebar.jsx";
import Chat from "./Chat.jsx";
import { getArchitectures, getModels } from "./api.js";
import { useSelector } from "react-redux";
import { useError } from "./utilities.js";

function App() {
  const [models, setModels] = useState([]);
  const modelsLoaded = models.length > 0;
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

  function loadModels() {
    getModels().then(setModels).catch(setError);
  }

  return (
    <Box>
      {error && (
        <Alert
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

      <Grid container>
        <Grid xs={6} className="overflow-hidden">
          {modelsLoaded && architecturesLoaded && (
            <Sidebar
              models={models}
              architectures={architectures}
              refreshModels={loadModels}
            />
          )}
        </Grid>
        <Grid xs={6}>
          <Chat />
        </Grid>
      </Grid>
    </Box>
  );
}

export default App;
