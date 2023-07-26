import * as React from "react";
import * as Accordion from "@radix-ui/react-accordion";
import { keyframes } from "@mui/system";
import Box from "@mui/joy/Box";
import ListItemButton from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import Sheet from "@mui/joy/Sheet";
import { ChevronDownIcon } from "@radix-ui/react-icons";

const slideDown = keyframes({
  from: { height: 0 },
  to: { height: "var(--radix-accordion-content-height)" },
});

const slideUp = keyframes({
  from: { height: "var(--radix-accordion-content-height)" },
  to: { height: 0 },
});

export const AccordionHeader = ({
  children,
  isFirst,
  isLast,
  sx,
  ...props
}) => (
  <ListItemButton
    component={Accordion.Trigger}
    {...props}
    sx={[
      {
        width: "100%",
        color: "text.secondary",
        fontWeight: "md",
        "&:hover": {
          bgcolor: "background.surface",
        },
        ...(isFirst && {
          borderTopLeftRadius: "3px",
          borderTopRightRadius: "3px",
        }),
        ...(isLast && {
          '&[data-state="closed"]': {
            borderBottomLeftRadius: "3px",
            borderBottomRightRadius: "3px",
          },
        }),
      },
      {
        '&[data-state="open"] > svg:last-child': {
          transform: "rotate(180deg)",
        },
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <ListItemContent>{children}</ListItemContent>
    <ChevronDownIcon />
  </ListItemButton>
);

export const AccordionContent = ({ children, isLast }) => (
  <Box
    component={Accordion.Content}
    sx={{
      overflow: "hidden",
      // p: 1.5, ⚠️ Cannot use padding here, otherwise the animation is lagging. Not sure why.
      '&[data-state="open"]': {
        animation: `${slideDown} 300ms cubic-bezier(0.87, 0, 0.13, 1)`,
        ...(isLast && {
          "& > div": {
            borderBottomLeftRadius: "3px",
            borderBottomRightRadius: "3px",
          },
        }),
      },
      '&[data-state="closed"]': {
        animation: `${slideUp} 300ms cubic-bezier(0.87, 0, 0.13, 1)`,
      },
    }}
  >
    <Sheet
      variant="none"
      sx={{
        borderTop: "1px solid",
        borderColor: "divider",
        p: 1.5,
        pb: 1,
        marginTop: "6px",
      }}
    >
      {children}
    </Sheet>
  </Box>
);
