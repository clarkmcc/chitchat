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
import { useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDispatch, useSelector } from "react-redux";
import {
  clearMessages,
  loadedModel,
  setWorldFreeze,
} from "./state/messagesSlice.js";

const schema = yup.object({
  model: yup.string().required(),
  architecture: yup.string().required(),
  tokenizer: yup.string().required(),
  contextSize: yup.number().required(),
  useGpu: yup.boolean().required(),
  warmupPrompt: yup.string(),
});

export default function Sidebar({ models, architectures }) {
  const worldFreeze = useSelector((state) => state.messages.worldFreeze);
  const [errorMessage, setErrorMessage] = useState(null);
  const dispatch = useDispatch();
  const { register, control, handleSubmit } = useForm({
    defaultValues: {
      model: models[0].id,
      architecture: architectures[0].id,
      tokenizer: "embedded",
      contextSize: 2048,
      useGpu: true,
      warmupPrompt:
        "You are a helpful assistant.\nSYSTEM: Hello, how may I help you today?\nUSER: What is the capital of France?\nSYSTEM: Paris is the capital of France.",
    },
    resolver: yupResolver(schema),
  });
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
  }

  return (
    <Box className="h-full relative overflow-hidden" sx={{ width: "100%" }}>
      <Sheet
        className="pt-8 p-4 overflow-y-hidden"
        sx={{
          width: "100%",
          height: "100%",
          borderRight: "1px solid",
          borderColor: "divider",
          "-webkit-scrollbar": { display: "none" },
        }}
      >
        <Grid container rowSpacing={3} columnSpacing={2}>
          <Grid xs={12}>
            <FormControl>
              <FormLabel>Model</FormLabel>
              <Controller
                name="model"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    size="sm"
                    onChange={(event, value) => field.onChange(value)}
                  >
                    {models.map((m) => (
                      <ListItem>
                        <Option key={m.id} value={m.id} label={m.name}>
                          <Box
                            component="span"
                            sx={{ display: "block", maxWidth: "400px" }}
                          >
                            <Typography component="span">{m.name}</Typography>
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
              <FormHelperText>
                The model will be downloaded to &nbsp;
                <pre>~/.chitchat/models</pre>
              </FormHelperText>
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
      <Box className="absolute bottom-0" sx={{ width: "100%" }} p={2}>
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
    </Box>
  );
}
