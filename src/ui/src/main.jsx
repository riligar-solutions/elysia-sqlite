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
  primaryColor: "gray",
  defaultRadius: "sm",
  colors: {
    // Notion warm grays
    gray: [
      "#fbfbfa", // 0 - sidebar bg
      "#f1f1f0", // 1 - hover
      "#e8e8e6", // 2 - active/border
      "#d3d3d0", // 3
      "#9b9a97", // 4
      "#787774", // 5 - secondary text
      "#5a5955", // 6
      "#37352f", // 7 - primary text
      "#2f2f2f", // 8
      "#1f1f1f", // 9
    ],
    dark: [
      "#e8e8e6", // 0 - text
      "#9b9a97", // 1 - secondary
      "#5a5955", // 2
      "#454543", // 3
      "#373737", // 4 - border
      "#303030", // 5 - active
      "#252525", // 6 - hover
      "#202020", // 7 - sidebar
      "#191919", // 8 - bg
      "#111111", // 9
    ],
  },
  components: {
    NavLink: {
      styles: {
        root: {
          borderRadius: 4,
          padding: "6px 10px",
        },
      },
    },
    Table: {
      styles: {
        th: {
          fontWeight: 500,
          fontSize: "12px",
          textTransform: "none",
        },
      },
    },
    Badge: {
      defaultProps: {
        variant: "light",
        radius: "sm",
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
