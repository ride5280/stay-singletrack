'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider, type ThemeProviderProps as NextThemesProviderProps } from 'next-themes';

type ThemeProviderProps = {
  children: React.ReactNode;
} & Omit<NextThemesProviderProps, 'children'>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
