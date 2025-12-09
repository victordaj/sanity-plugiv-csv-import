import {UploadIcon} from '@sanity/icons'
import {type Tool} from 'sanity'

import {CsvImportToolComponent} from '../components/CsvImportToolComponent'

export interface CsvImportToolProps {
  tool: Tool
}

export const CsvImportTool: Tool = {
  name: 'csv-import',
  title: 'CSV Import',
  icon: UploadIcon,
  component: CsvImportToolComponent,
}
