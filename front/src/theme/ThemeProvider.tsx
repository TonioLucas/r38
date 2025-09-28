"use client";

import { ReactNode, useMemo } from "react";
import { createTheme, ThemeProvider as MUIThemeProvider, CssBaseline } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { SnackbarProvider } from "notistack";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: {
            main: "#FF8C00", // Orange
            contrastText: "#FFFFFF",
          },
          secondary: {
            main: "#FFD54F", // Yellow
            contrastText: "#000000",
          },
          background: {
            default: "#FFFFFF",
            paper: "#FFFFFF",
          },
          text: {
            primary: "#000000",
            secondary: "#333333",
          },
          common: {
            black: "#000000",
            white: "#FFFFFF",
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
            fontSize: "3rem",
            lineHeight: 1.2,
            letterSpacing: "-0.01562em",
          },
          h2: {
            fontWeight: 700,
            fontSize: "2.5rem",
            lineHeight: 1.2,
            letterSpacing: "-0.00833em",
          },
          h3: {
            fontWeight: 600,
            fontSize: "2rem",
            lineHeight: 1.3,
            letterSpacing: "0em",
          },
          h4: {
            fontWeight: 600,
            fontSize: "1.5rem",
            lineHeight: 1.4,
            letterSpacing: "0.00735em",
          },
          h5: {
            fontWeight: 500,
            fontSize: "1.25rem",
            lineHeight: 1.5,
            letterSpacing: "0em",
          },
          h6: {
            fontWeight: 500,
            fontSize: "1rem",
            lineHeight: 1.6,
            letterSpacing: "0.0075em",
          },
          button: {
            fontWeight: 600,
            textTransform: "none",
          },
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                padding: "10px 24px",
                fontSize: "1rem",
              },
              containedPrimary: {
                backgroundColor: "#FF8C00",
                "&:hover": {
                  backgroundColor: "#E67E00",
                },
              },
              containedSecondary: {
                backgroundColor: "#FFD54F",
                color: "#000000",
                "&:hover": {
                  backgroundColor: "#FFC926",
                },
              },
            },
          },
        },
      }),
    []
  );

  return (
    <AppRouterCacheProvider>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider 
          maxSnack={3}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
        >
          {children}
        </SnackbarProvider>
      </MUIThemeProvider>
    </AppRouterCacheProvider>
  );
}