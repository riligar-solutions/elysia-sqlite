import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

// Notion-inspired theme
const theme = createTheme({
  fontFamily: "Montserrat, -apple-system, BlinkMacSystemFont, sans-serif",
  primaryColor: "dark",
  defaultRadius: 6,
  colors: {
    // Custom monochromatic gray scale from design.md
    gray: [
      "#F9FAFB", // 0 - app bg / sidebar (lightest)
      "#F3F4F6", // 1 - hover
      "#E5E7EB", // 2 - borders / lines
      "#D1D5DB", // 3
      "#9CA3AF", // 4
      "#6B7280", // 5 - secondary text
      "#4B5563", // 6
      "#374151", // 7
      "#1F2937", // 8
      "#11181C", // 9 - primary text
    ],
    dark: [
      "#C1C2C5", // 0
      "#A6A7AB", // 1
      "#909296", // 2
      "#5C5F66", // 3
      "#373A40", // 4
      "#2C2E33", // 5
      "#25262B", // 6
      "#1A1B1E", // 7
      "#141517", // 8
      "#101113", // 9
    ],
  },
  components: {
    Button: {
      defaultProps: {
        size: "sm", // 32px height
      },
      styles: (theme, params) => ({
        root: {
          height: "32px",
          fontWeight: 500,
          border:
            params.variant === "default" ? "1px solid #E5E7EB" : undefined,
          backgroundColor: params.variant === "filled" ? "#000000" : undefined, // Primary Black
          color: params.variant === "filled" ? "#FFFFFF" : undefined,
          "&:hover": {
            backgroundColor:
              params.variant === "filled" ? "#2f2f2f" : undefined,
          },
        },
      }),
    },
    Table: {
      defaultProps: {
        withColumnBorders: false,
        verticalSpacing: "sm",
      },
      styles: {
        th: {
          fontWeight: 500,
          fontSize: "12px",
          color: "#687076", // Secondary text
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        },
        td: {
          fontSize: "13px",
          color: "#11181C",
        },
        tr: {
          "&[data-hover]": {
            backgroundColor: "#F9FAFB",
          },
        },
      },
    },
    TextInput: {
      styles: {
        input: {
          border: "1px solid #E5E5E5",
          "&:focus": {
            borderColor: "#000000",
          },
        },
      },
    },
    Modal: {
      styles: {
        header: {
          backgroundColor: "transparent",
        },
        content: {
          boxShadow: "0 4px 20px rgba(0,0,0,0.05)",
        },
        overlay: {
          backdropFilter: "blur(4px)",
        },
      },
    },
    Badge: {
      defaultProps: {
        variant: "light",
        radius: "sm",
      },
    },
    NavLink: {
      styles: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          color: "#687076",
          "&[data-active]": {
            backgroundColor: "#F3F4F6",
            color: "#11181C",
          },
          "&:hover": {
            backgroundColor: "#F9FAFB",
          },
        },
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="bottom-right" />
      <App />
    </MantineProvider>
  </React.StrictMode>
);
