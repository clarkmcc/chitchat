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
  List,
  ListItem,
  Option,
  Select,
  Switch,
  Textarea,
  Typography,
  useTheme,
} from "@mui/joy";
import { Controller, useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect, useMemo, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useDispatch, useSelector } from "react-redux";
import {
  clearMessages,
  loadedModel,
  setWorldFreeze,
} from "./state/messagesSlice.js";
import IconButton from "@mui/joy/IconButton";
import { Refresh, Star } from "@mui/icons-material";
import ContextFileUploader from "./ContextFileUploader.jsx";
import * as Accordion from "@radix-ui/react-accordion";
import { AccordionContent, AccordionHeader } from "./Accordion.jsx";

const schema = yup.object({
  modelFilename: yup.string().required(),
  architecture: yup.string().required(),
  tokenizer: yup.string().required(),
  contextSize: yup.number().required(),
  useGpu: yup.boolean().required(),
  prompt: yup.object({
    template: yup.string().required(),
    warmup: yup.string(),
  }),
  contextFiles: yup.array().of(yup.string()),
});

export default function Sidebar({
  models,
  architectures,
  templates,
  refreshModels,
}) {
  const theme = useTheme();
  const worldFreeze = useSelector((state) => state.messages.worldFreeze);
  const [errorMessage, setErrorMessage] = useState(null);
  const dispatch = useDispatch();
  const { register, control, watch, getValues, handleSubmit, setValue } =
    useForm({
      defaultValues: {
        modelFilename: models[0].filename,
        architecture: architectures[0].id,
        tokenizer: "embedded",
        contextSize: 2048,
        useGpu: true,
        prompt: templates[0],
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

  function getModelFromFilename(filename) {
    return models.find((m) => m.filename === filename);
  }

  function handleErrors(error) {
    console.error(error);
    setErrorMessage(JSON.stringify(error));
  }

  const w = watch("prompt.name");
  useEffect(() => {
    const template = templates.find((v) => v.name == w);
    if (template) {
      setValue("prompt.warmup", template.warmup);
      setValue("prompt.template", template.template);
    }
  }, [w]);

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
                        renderValue={({ value }) => (
                          <RenderModelOption
                            model={getModelFromFilename(value)}
                          />
                        )}
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
                                  <Box className="space-x-1 mb-1">
                                    <Label value={m.parameterCount} />
                                    <Label value={m.quantization} />
                                    {m.labels.map((v) => (
                                      <Label value={v} />
                                    ))}
                                    {m.recommended && (
                                      <Label value="Recommended" gold />
                                    )}
                                  </Box>
                                </Typography>
                                <Typography level="body4">
                                  {m.filename}
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

          <Grid xs={12}>
            <List
              component={Accordion.Root}
              type="multiple"
              variant="outlined"
              sx={{ borderRadius: theme.radius.sm }}
            >
              <Accordion.Item value="prompts">
                <AccordionHeader>Prompting</AccordionHeader>
                <AccordionContent>
                  <Grid container rowSpacing={2}>
                    <Grid xs={12}>
                      <FormLabel>Prompt presets</FormLabel>
                      <Controller
                        name="prompt.name"
                        control={control}
                        render={({ field }) => (
                          <Select
                            size="sm"
                            {...field}
                            onChange={(event, value) => field.onChange(value)}
                          >
                            {templates.map((m) => (
                              <Option
                                key={m.name}
                                value={m.name}
                                label={m.name}
                              >
                                <Box
                                  component="span"
                                  sx={{ display: "block", maxWidth: "400px" }}
                                >
                                  <Typography component="span">
                                    {m.name}
                                  </Typography>
                                </Box>
                              </Option>
                            ))}
                          </Select>
                        )}
                      />
                    </Grid>

                    <Grid xs={12}>
                      <FormLabel>Warm-up prompt</FormLabel>
                      <Box pt={0.5} pb={0.5}>
                        <Controller
                          name="prompt.warmup"
                          control={control}
                          render={({ field }) => (
                            <Textarea {...field} size="sm" />
                          )}
                        />
                      </Box>
                    </Grid>

                    <Grid xs={12}>
                      <FormLabel>Prompt template</FormLabel>
                      <Box pt={0.5}>
                        <Controller
                          name="prompt.template"
                          control={control}
                          render={({ field }) => (
                            <Textarea {...field} minRows={1} size="sm" />
                          )}
                        />
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionContent>
              </Accordion.Item>
            </List>
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

/**
 * Renders the model option with its characteristics after it has
 * been selected in the select box.
 * @param model - The model to render
 * @returns {JSX.Element}
 * @constructor
 */
function RenderModelOption({ model }) {
  return (
    <Box className="space-x-1">
      <span>{model.name}</span>
      <Label value={model.parameterCount} />
      <Label value={model.quantization} />
      {model.recommended && <Label value="Recommended" gold />}
    </Box>
  );
}

/**
 * Used to render the characteristics of a model in the model
 * options select. This could be the number of parameters, the
 * quantization, or if it is a recommended model.
 * @param value - The value to display in the label
 * @param gold - Whether the label should be gold (for recommended models)
 * @returns {JSX.Element}
 * @constructor
 */
function Label({ value, gold }) {
  const theme = useTheme();
  const backgroundColor = gold
    ? theme.palette.warning["200"]
    : theme.palette.neutral.softBg;
  const color = gold
    ? theme.palette.warning["900"]
    : theme.palette.text.primary;
  return (
    <div
      className="px-2 py-0.5 inline rounded-md text-xs font-bold font-mono"
      style={{
        backgroundColor,
        color,
      }}
    >
      {value}
    </div>
  );
}
