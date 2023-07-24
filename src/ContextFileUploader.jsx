import { Chip, ChipDelete, useTheme } from "@mui/joy";
import { open } from "@tauri-apps/api/dialog";
import { useEffect, useState } from "react";
import { useController } from "react-hook-form";

export default function ContextFileUploader(props) {
  const { field } = useController(props);
  const theme = useTheme();
  const [files, setFiles] = useState([]);

  function getFilename(path) {
    return path.split("/").pop();
  }

  function removeFile(path) {
    setFiles(files.filter((f) => f !== path));
  }

  async function handleClick() {
    const selected = await open({
      multiple: true,
      filters: [
        {
          name: "text",
          extensions: ["txt", "pdf"],
        },
      ],
    });
    if (Array.isArray(selected)) setFiles(selected);
  }

  useEffect(() => {
    field.onChange(files);
  }, [files]);

  return (
    <section
      className="p-4 border-gray-400"
      style={{
        backgroundColor: theme.palette.background.backdrop,
        borderRadius: theme.vars.radius.sm,
        border: `2px dashed ${theme.palette.divider}`,
      }}
    >
      <div
        className={`text-sm text-center ${files.length > 0 ? "mb-4" : ""}`}
        style={{ color: theme.palette.text.tertiary }}
        onClick={handleClick}
      >
        <p>
          <a href="#">Click</a> to select files
        </p>
      </div>
      {files.map((path) => (
        <Chip
          size="sm"
          variant="soft"
          color="neutral"
          endDecorator={<ChipDelete onDelete={() => removeFile(path)} />}
        >
          {getFilename(path)}
        </Chip>
      ))}
    </section>
  );
}
