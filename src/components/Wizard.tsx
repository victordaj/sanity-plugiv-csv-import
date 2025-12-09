import {ImageIcon, LinkIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useCallback, useMemo, useState} from 'react'
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
import {CsvUploader} from './CsvUploader'
import {DuplicateOptions, type DuplicateStrategy} from './DuplicateOptions'
import {ImageUploader, type UploadedImage} from './ImageUploader'
import {ImportProgress, type ImportResult} from './ImportProgress'
import {ReferenceConfig, type ReferenceMatchConfig} from './ReferenceConfig'
import {StepIndicator} from './StepIndicator'
import {TemplateBar} from './TemplateBar'
import {TypeSelector} from './TypeSelector'
import {type ValidationIssue, ValidationSummary} from './ValidationSummary'
import {WelcomeScreen} from './WelcomeScreen'

export interface DocumentType {
  name: string
  title: string
}

export interface WizardProps {
  documentTypes: DocumentType[]
  schema: Schema
}

type WizardStep = 'select' | 'configure' | 'upload' | 'validate' | 'import'

export function Wizard({documentTypes, schema}: WizardProps) {
  // Client for Sanity operations
  const client = useClient({apiVersion: '2024-01-01'})

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('select')
  const [selectedType, setSelectedType] = useState<string>('')
  const [schemaFields, setSchemaFields] = useState<SchemaField[]>([])

  // Reference configuration
  const [referenceConfig, setReferenceConfig] = useState<ReferenceMatchConfig[]>([])

  // Image uploads
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

  // Get selected type title
  const selectedTypeTitle = useMemo(() => {
    const type = documentTypes.find((t) => t.name === selectedType)
    return type?.title || selectedType
  }, [documentTypes, selectedType])

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
    },
    [schema],
  )

  // Handle continuing from type selection
  const handleTypeSelectionContinue = useCallback(() => {
    if (!selectedType) return

    if (hasReferenceFields(schemaFields) || hasImageFields(schemaFields)) {
      setCurrentStep('configure')
    } else {
      setCurrentStep('upload')
    }
  }, [selectedType, schemaFields])

  // Handle reference configuration
  const handleReferencesConfigured = useCallback(
    (config: ReferenceMatchConfig[]) => {
      setReferenceConfig(config)
    },
    [],
  )

  // Handle images uploaded
  const handleImagesUploaded = useCallback((images: UploadedImage[]) => {
    setUploadedImages(images)
  }, [])

  // Handle continuing from configure step
  const handleConfigureContinue = useCallback(() => {
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

  // Determine if we need configure step
  const needsConfigureStep = hasReferenceFields(schemaFields) || hasImageFields(schemaFields)

  // Build steps array based on schema needs
  const steps = useMemo(() => {
    const baseSteps = [{id: 'select', label: 'Select Type'}]

    if (needsConfigureStep) {
      baseSteps.push({id: 'configure', label: 'Configure'})
    }

    baseSteps.push(
      {id: 'upload', label: 'Upload CSV'},
      {id: 'validate', label: 'Review'},
      {id: 'import', label: 'Import'},
    )

    return baseSteps
  }, [needsConfigureStep])

  // Get completed steps
  const completedStepIds = useMemo(() => {
    const completed: string[] = []
    const stepOrder: WizardStep[] = ['select', 'configure', 'upload', 'validate', 'import']
    const currentIndex = stepOrder.indexOf(currentStep)

    for (const step of stepOrder) {
      if (stepOrder.indexOf(step) < currentIndex) {
        if (step === 'configure' && !needsConfigureStep) continue
        completed.push(step)
      }
    }

    return completed
  }, [currentStep, needsConfigureStep])

  const canProceedFromValidation = validationResult && validationResult.validRowCount > 0

  // Show welcome screen if no type selected
  if (!selectedType && currentStep === 'select') {
    return (
      <Box padding={4}>
        <WelcomeScreen onGetStarted={() => {}} />
        <Box marginTop={5}>
          <TypeSelector
            documentTypes={documentTypes}
            selectedType={selectedType}
            schemaFields={schemaFields}
            onTypeSelect={handleTypeSelect}
            schema={schema}
          />
        </Box>
      </Box>
    )
  }

  return (
    <Box padding={4}>
      <Stack space={5}>
        {/* Step Progress Indicator */}
        <StepIndicator
          steps={steps}
          currentStepId={currentStep}
          completedStepIds={completedStepIds}
          onStepClick={(stepId) => setCurrentStep(stepId as WizardStep)}
        />

        {/* Step Content */}
        <Card padding={5} radius={3} shadow={1}>
          {/* Step 1: Select Type */}
          {currentStep === 'select' && (
            <Stack space={5}>
              <TypeSelector
                documentTypes={documentTypes}
                selectedType={selectedType}
                schemaFields={schemaFields}
                onTypeSelect={handleTypeSelect}
                schema={schema}
              />

              {selectedType && (
                <Flex justify="flex-end">
                  <Button
                    text="Continue"
                    tone="primary"
                    onClick={handleTypeSelectionContinue}
                    disabled={!selectedType}
                  />
                </Flex>
              )}
            </Stack>
          )}

          {/* Step 2: Configure (References & Images) */}
          {currentStep === 'configure' && (
            <Stack space={5}>
              <Box>
                <Text weight="semibold" size={2}>
                  Configure Import Settings
                </Text>
                <Text muted size={1} style={{marginTop: '8px'}}>
                  Set up how references and images should be matched
                </Text>
              </Box>

              {hasReferenceFields(schemaFields) && (
                <Card padding={4} radius={2} tone="transparent" border>
                  <Stack space={3}>
                    <Flex align="center" gap={2}>
                      <LinkIcon />
                      <Text weight="semibold">Reference Fields</Text>
                    </Flex>
                    <ReferenceConfig
                      schemaFields={schemaFields}
                      schema={schema}
                      onConfigured={handleReferencesConfigured}
                    />
                  </Stack>
                </Card>
              )}

              {hasImageFields(schemaFields) && (
                <Card padding={4} radius={2} tone="transparent" border>
                  <Stack space={3}>
                    <Flex align="center" gap={2}>
                      <ImageIcon />
                      <Text weight="semibold">Image Fields</Text>
                    </Flex>
                    <ImageUploader
                      schemaFields={schemaFields}
                      onImagesUploaded={handleImagesUploaded}
                    />
                  </Stack>
                </Card>
              )}

              <Flex justify="space-between" gap={3}>
                <Button text="Back" mode="ghost" onClick={() => setCurrentStep('select')} />
                <Button text="Continue to Upload" tone="primary" onClick={handleConfigureContinue} />
              </Flex>
            </Stack>
          )}

          {/* Step 3: Upload CSV */}
          {currentStep === 'upload' && (
            <Stack space={5}>
              <CsvUploader schemaFields={schemaFields} onCsvParsed={handleCsvParsed} />
              <Flex justify="flex-start">
                <Button
                  text="Back"
                  mode="ghost"
                  onClick={() => {
                    if (needsConfigureStep) {
                      setCurrentStep('configure')
                    } else {
                      setCurrentStep('select')
                    }
                  }}
                />
              </Flex>
            </Stack>
          )}

          {/* Step 4: Validate */}
          {currentStep === 'validate' && csvData && validationResult && (
            <Stack space={5}>
              <ValidationSummary
                totalRows={csvData.rows.length}
                validRows={validationResult.validRowCount}
                issues={validationIssues}
                onContinue={handleStartImport}
                onCancel={() => setCurrentStep('upload')}
              />

              <DuplicateOptions
                duplicateCount={duplicateCount}
                selectedStrategy={duplicateStrategy}
                onStrategyChange={setDuplicateStrategy}
              />

              <Flex justify="space-between" gap={3}>
                <Button text="Back" mode="ghost" onClick={() => setCurrentStep('upload')} />
                <Button
                  text={`Import ${validationResult.validRowCount} Documents`}
                  tone="positive"
                  onClick={handleStartImport}
                  disabled={!canProceedFromValidation}
                />
              </Flex>
            </Stack>
          )}

          {/* Step 5: Import */}
          {currentStep === 'import' && csvData && (
            <Stack space={5}>
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
          )}
        </Card>

        {/* Template Download Bar - show when type is selected */}
        {selectedType && currentStep !== 'import' && (
          <TemplateBar
            documentType={selectedType}
            documentTypeTitle={selectedTypeTitle}
            schemaFields={schemaFields}
            referenceConfig={referenceConfig}
            visible={true}
          />
        )}
      </Stack>
    </Box>
  )
}
