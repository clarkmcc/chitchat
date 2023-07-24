import { Autocomplete, Grid } from "@mui/joy";
import * as React from "react";
import { forwardRef, useEffect, useState } from "react";
import { getLoras } from "./api.js";
import { useError } from "./utilities.js";
import IconButton from "@mui/joy/IconButton";
import { Refresh } from "@mui/icons-material";
import { useController } from "react-hook-form";

const LoraSelector = forwardRef(({ size, ...rest }, ref) => {
  const { field } = useController(rest);
  const [options, setOptions] = useState([]);
  const [setError] = useError();

  useEffect(() => {
    loadLoras();
  }, []);

  function loadLoras() {
    getLoras().then(setOptions).catch(setError);
  }

  return (
    <Grid container columnSpacing={1}>
      <Grid xs>
        <Autocomplete
          {...field}
          size={size}
          ref={ref}
          multiple
          options={options}
          getOptionLabel={(option) => option.filename}
          isOptionEqualToValue={(option, value) =>
            option.filename === value.filename
          }
          onChange={(event, value) => field.onChange(value)}
        ></Autocomplete>
      </Grid>
      <Grid xs="auto">
        <IconButton size={size} color="neutral" onClick={loadLoras}>
          <Refresh />
        </IconButton>
      </Grid>
    </Grid>
  );
});

export default LoraSelector;
