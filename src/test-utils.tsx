import {studioTheme, ThemeProvider} from '@sanity/ui'
import {render, type RenderOptions} from '@testing-library/react'
import type {ReactElement, ReactNode} from 'react'

function AllTheProviders({children}: {children: ReactNode}): ReactElement {
  return <ThemeProvider theme={studioTheme}>{children}</ThemeProvider>
}

function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
): ReturnType<typeof render> {
  return render(ui, {wrapper: AllTheProviders, ...options})
}

export * from '@testing-library/react'
export {customRender as render}
