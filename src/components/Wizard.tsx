import {Box, Button, Card, Flex, Stack, Tab, TabList, TabPanel} from '@sanity/ui'
import {type JSX, useCallback, useState} from 'react'
import {type Schema, useClient} from 'sanity'

import {type ParsedCsvData} from '../lib/csvParser'
import {transformAllRows} from '../lib/documentTransformer'
import {importDocuments} from '../lib/importEngine'
import {
  getSchemaFields,
  hasImageFields,
  hasReferenceFields,
  type SchemaField,
} from '../lib/schemaUtils'
import {validateCsvData, type ValidationResult} from '../lib/validator'
import {CsvPreview} from './CsvPreview'
import {CsvUploader} from './CsvUploader'
import {DuplicateOptions, type DuplicateStrategy} from './DuplicateOptions'
import {ImageUploader, type UploadedImage} from './ImageUploader'
import {ImportProgress, type ImportResult} from './ImportProgress'
import {ReferenceConfig, type ReferenceMatchConfig} from './ReferenceConfig'
import {TypeSelector} from './TypeSelector'
import {type ValidationIssue, ValidationSummary} from './ValidationSummary'

export interface DocumentType {
  name: string
  title: string
}

export interface WizardProps {
  documentTypes: DocumentType[]
  schema: Schema
}

type WizardStep = 'select' | 'references' | 'images' | 'upload' | 'validate' | 'import'

/**
 * Main wizard component for CSV import workflow
 */
export function Wizard({documentTypes, schema}: WizardProps): JSX.Element {
  // Client for Sanity operations
  const client = useClient({apiVersion: '2024-01-01'})

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('select')
  const [selectedType, setSelectedType] = useState<string>('')
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([])

  // Reference configuration
  const [referenceConfig, setReferenceConfig] = useState<ReferenceMatchConfig[]>([])

  // Image uploads - now stores UploadedImage[] directly
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])

  // CSV data
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null)

  // Validation
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([])

  // Import
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('skip')
  const [duplicateCount] = useState(0)
  const [, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [importProcessed, setImportProcessed] = useState(0)
  const [importComplete, setImportComplete] = useState(false)

  // Handle type selection
  const handleTypeSelect = useCallback(
    (typeName: string) => {
      setSelectedType(typeName)
      const fields = getSchemaFields(schema, typeName)
      setSchemaFields(fields)

      // Reset subsequent steps
      setReferenceConfig([])
      setUploadedImages([])
      setCsvData(null)
      setValidationResult(null)
      setValidationIssues([])
      setImportResults([])
      setImportComplete(false)

      // Determine next step based on schema
      if (hasReferenceFields(fields)) {
        setCurrentStep('references')
      } else if (hasImageFields(fields)) {
        setCurrentStep('images')
      } else {
        setCurrentStep('upload')
      }
    },
    [schema],
  )

  // Handle reference configuration
  const handleReferencesConfigured = useCallback(
    (config: ReferenceMatchConfig[]) => {
      setReferenceConfig(config)
      if (hasImageFields(schemaFields)) {
        setCurrentStep('images')
      } else {
        setCurrentStep('upload')
      }
    },
    [schemaFields],
  )

  // Handle images uploaded (ImageUploader handles the actual upload)
  const handleImagesUploaded = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images)
    setCurrentStep('upload')
  }, [])

  // Handle CSV parsed
  const handleCsvParsed = useCallback(
    (data: ParsedCsvData) => {
      setCsvData(data)

      // Run validation
      const result = validateCsvData(data.headers, data.rows, {
        schemaFields,
        referenceConfig,
      })

      setValidationResult(result)
      setValidationIssues(
        result.issues.map((issue) => ({
          row: issue.row,
          field: issue.field,
          type: issue.type,
          message: issue.message,
        })),
      )

      setCurrentStep('validate')
    },
    [schemaFields, referenceConfig],
  )

  // Start import
  const handleStartImport = useCallback(async () => {
    if (!csvData || !validationResult) return

    setCurrentStep('import')
    setIsImporting(true)
    setImportResults([])
    setImportProcessed(0)

    try {
      // Convert uploadedImages array to Map for transformer
      const imageMap = new Map<string, string>()
      for (const img of uploadedImages) {
        imageMap.set(img.filename, img.assetId)
      }

      // Transform CSV rows to documents
      const transformResults = transformAllRows(csvData.rows, {
        schemaFields,
        referenceConfig,
        documentType: selectedType,
        uploadedImages: imageMap,
      })

      // Import documents
      const summary = await importDocuments(transformResults, {
        client,
        documentType: selectedType,
        duplicateStrategy,
        batchSize: 10,
        onProgress: (processed) => {
          setImportProcessed(processed)
        },
      })

      setImportResults(summary.results)
      setImportComplete(true)
    } catch (err) {
      console.error('Import failed:', err)
      setImportResults([
        {
          row: 0,
          success: false,
          error: err instanceof Error ? err.message : 'Import failed',
        },
      ])
      setImportComplete(true)
    } finally {
      setIsImporting(false)
    }
  }, [
    csvData,
    validationResult,
    schemaFields,
    referenceConfig,
    selectedType,
    uploadedImages,
    client,
    duplicateStrategy,
  ])

  // Reset wizard
  const handleReset = useCallback(() => {
    setCurrentStep('select')
    setSelectedType('')
    setSchemaFields([])
    setReferenceConfig([])
    setUploadedImages([])
    setCsvData(null)
    setValidationResult(null)
    setValidationIssues([])
    setDuplicateStrategy('skip')
    setIsImporting(false)
    setImportResults([])
    setImportProcessed(0)
    setImportComplete(false)
  }, [])

  // Step helpers
  const getStepIndex = (step: WizardStep): number => {
    const steps: WizardStep[] = ['select', 'references', 'images', 'upload', 'validate', 'import']
    return steps.indexOf(step)
  }

  const isStepAccessible = useCallback(
    (step: WizardStep): boolean => {
      const currentIndex = getStepIndex(currentStep)
      const stepIndex = getStepIndex(step)
      return stepIndex <= currentIndex
    },
    [currentStep],
  )

  const canProceedFromValidation = validationResult && validationResult.validRowCount > 0

  // Tab navigation handlers - memoized to avoid arrow functions in JSX
  const handleSelectTabClick = useCallback(() => {
    if (isStepAccessible('select')) setCurrentStep('select')
  }, [isStepAccessible])

  const handleReferencesTabClick = useCallback(() => {
    if (isStepAccessible('references')) setCurrentStep('references')
  }, [isStepAccessible])

  const handleImagesTabClick = useCallback(() => {
    if (isStepAccessible('images')) setCurrentStep('images')
  }, [isStepAccessible])

  const handleUploadTabClick = useCallback(() => {
    if (isStepAccessible('upload')) setCurrentStep('upload')
  }, [isStepAccessible])

  const handleValidateTabClick = useCallback(() => {
    if (isStepAccessible('validate')) setCurrentStep('validate')
  }, [isStepAccessible])

  const handleImportTabClick = useCallback(() => {
    if (isStepAccessible('import')) setCurrentStep('import')
  }, [isStepAccessible])

  // Back button handlers
  const handleBackToSelect = useCallback(() => setCurrentStep('select'), [])
  const handleBackToUpload = useCallback(() => setCurrentStep('upload'), [])

  const handleBackFromImages = useCallback(() => {
    if (hasReferenceFields(schemaFields)) {
      setCurrentStep('references')
    } else {
      setCurrentStep('select')
    }
  }, [schemaFields])

  const handleBackFromUpload = useCallback(() => {
    if (hasImageFields(schemaFields)) {
      setCurrentStep('images')
    } else if (hasReferenceFields(schemaFields)) {
      setCurrentStep('references')
    } else {
      setCurrentStep('select')
    }
  }, [schemaFields])

  const handleContinueFromReferences = useCallback(() => {
    handleReferencesConfigured(referenceConfig)
  }, [handleReferencesConfigured, referenceConfig])

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        {/* Step Tabs */}
        <TabList space={2}>
          <Tab
            aria-controls="select-panel"
            id="select-tab"
            label="1. Select Type"
            onClick={handleSelectTabClick}
            selected={currentStep === 'select'}
            disabled={!isStepAccessible('select')}
          />
          <Tab
            aria-controls="references-panel"
            id="references-tab"
            label="2. References"
            onClick={handleReferencesTabClick}
            selected={currentStep === 'references'}
            disabled={!isStepAccessible('references') || !hasReferenceFields(schemaFields)}
          />
          <Tab
            aria-controls="images-panel"
            id="images-tab"
            label="3. Images"
            onClick={handleImagesTabClick}
            selected={currentStep === 'images'}
            disabled={!isStepAccessible('images') || !hasImageFields(schemaFields)}
          />
          <Tab
            aria-controls="upload-panel"
            id="upload-tab"
            label="4. Upload CSV"
            onClick={handleUploadTabClick}
            selected={currentStep === 'upload'}
            disabled={!isStepAccessible('upload')}
          />
          <Tab
            aria-controls="validate-panel"
            id="validate-tab"
            label="5. Validate"
            onClick={handleValidateTabClick}
            selected={currentStep === 'validate'}
            disabled={!isStepAccessible('validate')}
          />
          <Tab
            aria-controls="import-panel"
            id="import-tab"
            label="6. Import"
            onClick={handleImportTabClick}
            selected={currentStep === 'import'}
            disabled={!isStepAccessible('import')}
          />
        </TabList>

        {/* Step Content */}
        <Box marginTop={4}>
          {/* Step 1: Select Type */}
          {currentStep === 'select' && (
            <TabPanel aria-labelledby="select-tab" id="select-panel">
              <TypeSelector
                documentTypes={documentTypes}
                selectedType={selectedType}
                schemaFields={schemaFields}
                onTypeSelect={handleTypeSelect}
              />
            </TabPanel>
          )}

          {/* Step 2: Configure References */}
          {currentStep === 'references' && (
            <TabPanel aria-labelledby="references-tab" id="references-panel">
              <Stack space={4}>
                <ReferenceConfig
                  schemaFields={schemaFields}
                  schema={schema}
                  onConfigured={handleReferencesConfigured}
                />
                <Flex justify="flex-end" gap={3}>
                  <Button text="Back" mode="ghost" onClick={handleBackToSelect} />
                  <Button text="Continue" tone="primary" onClick={handleContinueFromReferences} />
                </Flex>
              </Stack>
            </TabPanel>
          )}

          {/* Step 3: Upload Images */}
          {currentStep === 'images' && (
            <TabPanel aria-labelledby="images-tab" id="images-panel">
              <Stack space={4}>
                <ImageUploader
                  schemaFields={schemaFields}
                  onImagesUploaded={handleImagesUploaded}
                />
                <Flex justify="flex-end" gap={3}>
                  <Button text="Back" mode="ghost" onClick={handleBackFromImages} />
                </Flex>
              </Stack>
            </TabPanel>
          )}

          {/* Step 4: Upload CSV */}
          {currentStep === 'upload' && (
            <TabPanel aria-labelledby="upload-tab" id="upload-panel">
              <Stack space={4}>
                <CsvUploader schemaFields={schemaFields} onCsvParsed={handleCsvParsed} />
                <Flex justify="flex-start">
                  <Button text="Back" mode="ghost" onClick={handleBackFromUpload} />
                </Flex>
              </Stack>
            </TabPanel>
          )}

          {/* Step 5: Validate */}
          {currentStep === 'validate' && csvData && validationResult && (
            <TabPanel aria-labelledby="validate-tab" id="validate-panel">
              <Stack space={4}>
                {/* Data Preview Table */}
                <CsvPreview headers={csvData.headers} rows={csvData.rows} maxPreviewRows={50} />

                <ValidationSummary
                  totalRows={csvData.rows.length}
                  validRows={validationResult.validRowCount}
                  issues={validationIssues}
                />

                <DuplicateOptions
                  duplicateCount={duplicateCount}
                  selectedStrategy={duplicateStrategy}
                  onStrategyChange={setDuplicateStrategy}
                />

                <Flex justify="flex-end" gap={3}>
                  <Button text="Back" mode="ghost" onClick={handleBackToUpload} />
                  <Button
                    text={`Import ${validationResult.validRowCount} Documents`}
                    tone="positive"
                    onClick={handleStartImport}
                    disabled={!canProceedFromValidation}
                  />
                </Flex>
              </Stack>
            </TabPanel>
          )}

          {/* Step 6: Import */}
          {currentStep === 'import' && csvData && (
            <TabPanel aria-labelledby="import-tab" id="import-panel">
              <Stack space={4}>
                <ImportProgress
                  totalRows={csvData.rows.length}
                  processedRows={importProcessed}
                  results={importResults}
                  isComplete={importComplete}
                />

                {importComplete && (
                  <Flex justify="center">
                    <Button text="Start New Import" tone="primary" onClick={handleReset} />
                  </Flex>
                )}
              </Stack>
            </TabPanel>
          )}
        </Box>
      </Stack>
    </Card>
  )
}
