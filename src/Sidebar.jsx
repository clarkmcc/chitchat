import * as React from "react";
import Sheet from "@mui/joy/Sheet";
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Grid,
  Input,
  LinearProgress,
  ListItem,
  Option,
  Select,
  Switch,
  Textarea,
  Typography,
} from "@mui/joy";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { invoke } from "@tauri-apps/api/tauri";
import { useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDispatch, useSelector } from "react-redux";
import {
  clearMessages,
  loadedModel,
  setWorldFreeze,
} from "./state/messagesSlice.js";
import IconButton from "@mui/joy/IconButton";
import { Refresh } from "@mui/icons-material";
import ContextFileUploader from "./ContextFileUploader.jsx";

const schema = yup.object({
  modelFilename: yup.string().required(),
  architecture: yup.string().required(),
  tokenizer: yup.string().required(),
  contextSize: yup.number().required(),
  useGpu: yup.boolean().required(),
  warmupPrompt: yup.string(),
  contextFiles: yup.array().of(yup.string()),
});

export default function Sidebar({ models, architectures, refreshModels }) {
  const worldFreeze = useSelector((state) => state.messages.worldFreeze);
  const [errorMessage, setErrorMessage] = useState(null);
  const dispatch = useDispatch();
  const { register, control, watch, handleSubmit } = useForm({
    defaultValues: {
      modelFilename: models[0].filename,
      architecture: architectures[0].id,
      tokenizer: "embedded",
      contextSize: 2048,
      useGpu: true,
      warmupPrompt:
        "You are a helpful assistant. You provide short and simple answers to questions. \nSYSTEM: Hello, how may I help you today?\nUSER: What is the capital of France?\nSYSTEM: Paris is the capital of France.",
      contextFiles: [],
    },
    resolver: yupResolver(schema),
  });

  // Selected modelFilename
  const selectedFilename = watch("modelFilename");
  const isCustomModel = useMemo(() => {
    return models.find((m) => m.filename === selectedFilename)?.custom;
  }, [selectedFilename]);

  const [progress, setProgress] = useState(null);

  function handleStart(data) {
    setErrorMessage(null);
    dispatch(clearMessages());
    dispatch(setWorldFreeze(true));
    invoke("start", data)
      .then(() => dispatch(loadedModel()))
      .catch((err) => {
        console.error(err);
        setErrorMessage(err);
      })
      .finally(() => dispatch(setWorldFreeze(false)));
    listen("model_loading", (event) => setProgress(event.payload)).then();
  }

  function handleErrors(error) {
    console.error(error);
    setErrorMessage(JSON.stringify(error));
  }

  return (
    <>
      <Sheet
        className="pt-8 p-4 overflow-auto flex-grow"
        sx={{
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        <Grid container rowSpacing={3} columnSpacing={2}>
          <Grid xs={12}>
            <FormControl>
              <FormLabel>Model</FormLabel>
              <Grid container columnSpacing={1}>
                <Grid xs>
                  <Controller
                    name="modelFilename"
                    control={control}
                    render={({ field }) => (
                      <Select
                        {...field}
                        size="sm"
                        onChange={(event, value) => field.onChange(value)}
                      >
                        {models.map((m) => (
                          <ListItem>
                            <Option
                              key={m.filename}
                              value={m.filename}
                              label={m.name}
                            >
                              <Box
                                component="span"
                                sx={{ display: "block", maxWidth: "400px" }}
                              >
                                <Typography component="span">
                                  {m.name}
                                </Typography>
                                <Typography level="body4">
                                  {m.description}
                                </Typography>
                              </Box>
                            </Option>
                          </ListItem>
                        ))}
                      </Select>
                    )}
                  />
                </Grid>

                <Grid xs="auto">
                  <IconButton size="sm" color="neutral" onClick={refreshModels}>
                    <Refresh />
                  </IconButton>
                </Grid>
              </Grid>
              {!isCustomModel && (
                <FormHelperText>
                  The model will be downloaded to &nbsp;
                  <pre>~/.chitchat/models</pre>
                </FormHelperText>
              )}
            </FormControl>
          </Grid>

          <Grid xs={6}>
            <FormControl>
              <FormLabel>Architecture</FormLabel>
              <Controller
                name="architecture"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size="sm"
                    onChange={(event, value) => field.onChange(value)}
                  >
                    {architectures.map((m) => (
                      <Option key={m.id} value={m.id}>
                        {m.name}
                      </Option>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          <Grid xs={6}>
            <FormControl>
              <FormLabel>Tokenizer</FormLabel>
              <Controller
                name="tokenizer"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size="sm"
                    onChange={(event, value) => field.onChange(value)}
                  >
                    <Option value="embedded">Embedded</Option>
                  </Select>
                )}
              />
            </FormControl>
          </Grid>

          <Grid xs={12}>
            <FormControl>
              <FormLabel>Context size</FormLabel>
              <Input
                type="number"
                defaultValue={2048}
                size="sm"
                {...register("contextSize", { min: 1, max: 16000 })}
              />
              <FormHelperText>
                Longer contexts consume more resource
              </FormHelperText>
            </FormControl>
          </Grid>

          <Grid xs={12} pb={2}>
            <FormLabel>Warm-up prompt</FormLabel>
            <Box pt={0.5} pb={0.5}>
              <Controller
                name="warmupPrompt"
                control={control}
                render={({ field }) => <Textarea {...field} size="sm" />}
              />
            </Box>
            <FormHelperText>
              Show the model how it should respond
            </FormHelperText>
          </Grid>

          <Grid xs={12}>
            <FormLabel>Context files</FormLabel>
            <Box pt={0.5} pb={0.5}>
              <ContextFileUploader name="contextFiles" control={control} />
            </Box>
            <FormHelperText>
              Upload &nbsp;
              <pre>.txt</pre>
              &nbsp;, &nbsp;
              <pre>.pdf</pre>
              &nbsp; or &nbsp;
              <pre>.html</pre>
              &nbsp; files
            </FormHelperText>
          </Grid>

          <Grid xs={12}>
            <FormControl
              orientation="horizontal"
              sx={{ justifyContent: "space-between" }}
            >
              <Box>
                <FormLabel>GPU</FormLabel>
              </Box>
              <Controller
                name="useGpu"
                control={control}
                render={({ field }) => (
                  <Switch {...field} checked={field.value} />
                )}
              />
            </FormControl>
          </Grid>
        </Grid>
      </Sheet>
      <Sheet
        sx={{
          borderRight: "1px solid",
          borderColor: "divider",
        }}
      >
        <Box className="sticky bottom-0" p={2}>
          {progress && progress.progress < 1 && (
            <FormControl className="mb-2">
              <LinearProgress
                value={progress.progress * 100}
                determinate={true}
              />
              <FormHelperText>{progress.message}</FormHelperText>
            </FormControl>
          )}
          {errorMessage && (
            <Box className="mb-2">
              <Alert color="danger">{errorMessage}</Alert>
            </Box>
          )}

          <Button
            loading={worldFreeze}
            fullWidth={true}
            variant="solid"
            size="lg"
            onClick={handleSubmit(handleStart, handleErrors)}
          >
            Start
          </Button>
        </Box>
      </Sheet>
    </>
  );
}
