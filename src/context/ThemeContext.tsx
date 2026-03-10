import React, { createContext, useContext } from "react";
import { light, type AppTheme } from "@/src/theme";

const ThemeContext = createContext<AppTheme>(light);

export const ThemeProvider = ThemeContext.Provider;

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
