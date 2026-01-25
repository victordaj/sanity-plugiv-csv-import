import {definePlugin} from 'sanity'

import {CsvImportTool} from './tool/CsvImportTool'
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Sanity CSV Import Plugin
 *
 * A Studio Tool for bulk importing CSV data into any Sanity document type
 * with template generation, reference matching, and image uploads.
 *
 * Usage in `sanity.config.ts`:
 *
 * ```ts
 * import {defineConfig} from 'sanity'
 * import {csvImportTool} from 'sanity-plugin-csv-import'
 *
 * export default defineConfig({
 *   // ...
 *   plugins: [csvImportTool()],
 * })
 * ```
 *
 * @public
 */
export const csvImportTool = definePlugin(() => {
  return {
    name: 'sanity-plugin-csv-import',
    tools: [CsvImportTool],
  }
})

// Export for backwards compatibility
export {csvImportTool as myPlugin}

// Export types
export type {CsvImportToolProps} from './tool/CsvImportTool'
