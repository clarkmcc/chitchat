import React, { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/tauri";
import "./App.css";
import { Box, Grid } from "@mui/joy";
import Sidebar from "./Sidebar.jsx";
import Chat from "./Chat.jsx";

function App() {
  const [models, setModels] = useState([]);
  const modelsLoaded = models.length > 0;
  const [architectures, setArchitectures] = useState([]);
  const architecturesLoaded = architectures.length > 0;

  useEffect(() => {
    invoke("get_models").then(setModels).catch(console.error);
  });
  useEffect(() => {
    invoke("get_architectures").then(setArchitectures).catch(console.error);
  });

  return (
    <Box>
      <Grid container>
        <Grid xs={6} className="overflow-hidden">
          {modelsLoaded && architecturesLoaded && (
            <Sidebar models={models} architectures={architectures} />
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
