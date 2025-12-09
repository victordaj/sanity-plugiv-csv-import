export interface ReferenceMapping {
  fieldPath: string
  targetType: string
  matchField: string
}

export interface UploadedImage {
  filename: string
  assetId: string
  url: string
}

export interface ImportResult {
  success: boolean
  rowIndex: number
  documentId?: string
  error?: string
}

export interface ImportProgress {
  total: number
  completed: number
  successful: number
  failed: number
  results: ImportResult[]
}

export type DuplicateHandling = 'skip' | 'update' | 'fail'
