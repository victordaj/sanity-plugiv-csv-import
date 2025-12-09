import {CheckmarkCircleIcon, DocumentIcon, UploadIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'
import type React from 'react'
import {useCallback, useRef, useState} from 'react'

import {type CsvParseError, parseCsvFile, type ParsedCsvData} from '../lib/csvParser'
import {type SchemaField} from '../lib/schemaUtils'

export interface CsvUploaderProps {
  schemaFields: SchemaField[]
  onCsvParsed: (data: ParsedCsvData) => void
}

export function CsvUploader({schemaFields, onCsvParsed}: CsvUploaderProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<CsvParseError[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<ParsedCsvData | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(
    async (file: File) => {
      setIsLoading(true)
      setErrors([])
      setFileName(file.name)
      setPreviewData(null)

      try {
        const result = await parseCsvFile(file)

        if (!result.success || !result.data) {
          setErrors(
            result.errors || [{type: 'Unknown', code: 'Unknown', message: 'Failed to parse CSV'}],
          )
          return
        }

        // Check if headers match schema fields
        const expectedFields = schemaFields.map((f) => f.path)
        const missingFields = expectedFields.filter(
          (field) =>
            !result.data!.headers.some(
              (h) => h === field || h.startsWith(`${field}→`) || h === `${field}.alt`,
            ),
        )

        if (missingFields.length > 0) {
          // This is just a warning, not an error
          console.warn('CSV missing some schema fields:', missingFields)
        }

        // Store preview data and call parent
        setPreviewData(result.data)
        onCsvParsed(result.data)
      } catch (err) {
        setErrors([
          {
            type: 'ParseError',
            code: 'Exception',
            message: err instanceof Error ? err.message : 'Failed to parse CSV',
          },
        ])
      } finally {
        setIsLoading(false)
      }
    },
    [schemaFields, onCsvParsed],
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        processFile(file)
      }
      // Reset input for re-upload
      event.target.value = ''
    },
    [processFile],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
        processFile(file)
      } else if (file) {
        setErrors([{type: 'FileError', code: 'InvalidType', message: 'Please drop a CSV file'}])
      }
    },
    [processFile],
  )

  const handleDropZoneClick = () => {
    fileInputRef.current?.click()
  }

  // Get matched and unmatched columns
  const getColumnStatus = (header: string): 'matched' | 'extra' => {
    const expectedFields = schemaFields.map((f) => f.path)
    const isMatched = expectedFields.some(
      (field) => header === field || header.startsWith(`${field}→`) || header === `${field}.alt`,
    )
    return isMatched ? 'matched' : 'extra'
  }

  return (
    <Stack space={4}>
      {/* Header */}
      <Box>
        <Text weight="semibold" size={2}>
          Upload Your CSV
        </Text>
        <Text muted size={1} style={{marginTop: '8px'}}>
          Drop your CSV file below. The first row should contain column headers.
        </Text>
      </Box>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.txt"
        onChange={handleFileSelect}
        style={{display: 'none'}}
        disabled={isLoading}
      />

      {/* Drop zone */}
      <Card
        padding={5}
        radius={3}
        tone={previewData ? 'positive' : isDragging ? 'primary' : 'transparent'}
        style={{
          border: previewData
            ? '2px solid var(--card-badge-positive-bg-color)'
            : isDragging
              ? '2px solid var(--card-focus-ring-color)'
              : '2px dashed var(--card-border-color)',
          textAlign: 'center',
          cursor: isLoading ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        onClick={handleDropZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Stack space={3}>
          <Flex justify="center">
            {previewData ? (
              <CheckmarkCircleIcon
                style={{fontSize: '2.5em', color: 'var(--card-badge-positive-fg-color)'}}
              />
            ) : (
              <UploadIcon style={{fontSize: '2.5em', opacity: 0.4}} />
            )}
          </Flex>
          <Text muted={!previewData} weight={previewData ? 'semibold' : 'regular'}>
            {isLoading
              ? 'Parsing CSV...'
              : previewData
                ? 'File uploaded successfully'
                : isDragging
                  ? 'Drop CSV file here'
                  : 'Click or drag CSV file here'}
          </Text>
          {fileName && (
            <Flex align="center" justify="center" gap={2}>
              <DocumentIcon />
              <Text size={1}>{fileName}</Text>
              {previewData && (
                <Badge tone="primary" fontSize={0}>
                  {previewData.rows.length} rows
                </Badge>
              )}
            </Flex>
          )}
          {!previewData && (
            <Text muted size={0}>
              Supports CSV files up to 500 rows
            </Text>
          )}
        </Stack>
      </Card>

      {/* Errors */}
      {errors.length > 0 && (
        <Card padding={4} radius={2} tone="critical">
          <Stack space={3}>
            <Text weight="semibold">Errors</Text>
            {errors.map((error, index) => (
              <Text key={index} size={1}>
                {error.row !== undefined && `Row ${error.row + 1}: `}
                {error.message}
              </Text>
            ))}
          </Stack>
        </Card>
      )}

      {/* CSV Preview */}
      {previewData && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={4}>
            <Flex align="center" justify="space-between">
              <Text weight="semibold" size={1}>
                Preview (first 5 rows)
              </Text>
              <Flex gap={2}>
                <Badge tone="default" fontSize={0}>
                  {previewData.headers.length} columns
                </Badge>
                <Badge tone="positive" fontSize={0}>
                  {previewData.rows.length} rows
                </Badge>
              </Flex>
            </Flex>

            {/* Column badges */}
            <Flex wrap="wrap" gap={1}>
              {previewData.headers.map((header, i) => (
                <Badge
                  key={i}
                  tone={getColumnStatus(header) === 'matched' ? 'positive' : 'caution'}
                  fontSize={0}
                >
                  {header}
                </Badge>
              ))}
            </Flex>

            {/* Preview table */}
            <Box
              style={{
                overflowX: 'auto',
                borderRadius: '4px',
                border: '1px solid var(--card-border-color)',
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        padding: '8px 12px',
                        textAlign: 'left',
                        backgroundColor: 'var(--card-bg2-color)',
                        borderBottom: '1px solid var(--card-border-color)',
                        fontWeight: 600,
                        color: 'var(--card-muted-fg-color)',
                      }}
                    >
                      #
                    </th>
                    {previewData.headers.slice(0, 6).map((header, i) => (
                      <th
                        key={i}
                        style={{
                          padding: '8px 12px',
                          textAlign: 'left',
                          backgroundColor: 'var(--card-bg2-color)',
                          borderBottom: '1px solid var(--card-border-color)',
                          fontWeight: 600,
                          maxWidth: '150px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                    {previewData.headers.length > 6 && (
                      <th
                        style={{
                          padding: '8px 12px',
                          textAlign: 'center',
                          backgroundColor: 'var(--card-bg2-color)',
                          borderBottom: '1px solid var(--card-border-color)',
                          fontWeight: 400,
                          color: 'var(--card-muted-fg-color)',
                        }}
                      >
                        +{previewData.headers.length - 6} more
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      <td
                        style={{
                          padding: '8px 12px',
                          borderBottom: '1px solid var(--card-border-color)',
                          color: 'var(--card-muted-fg-color)',
                        }}
                      >
                        {rowIndex + 1}
                      </td>
                      {previewData.headers.slice(0, 6).map((header, colIndex) => (
                        <td
                          key={colIndex}
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--card-border-color)',
                            maxWidth: '150px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={row[header]}
                        >
                          {row[header] || '—'}
                        </td>
                      ))}
                      {previewData.headers.length > 6 && (
                        <td
                          style={{
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--card-border-color)',
                            textAlign: 'center',
                            color: 'var(--card-muted-fg-color)',
                          }}
                        >
                          …
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {previewData.rows.length > 5 && (
              <Text muted size={0} style={{textAlign: 'center'}}>
                Showing 5 of {previewData.rows.length} rows
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Expected columns hint (only shown before upload) */}
      {!previewData && (
        <Card
          padding={3}
          radius={2}
          tone="transparent"
          style={{backgroundColor: 'var(--card-bg2-color)'}}
        >
          <Stack space={2}>
            <Text size={0} weight="semibold" muted>
              Expected columns:
            </Text>
            <Flex wrap="wrap" gap={1}>
              {schemaFields.slice(0, 8).map((f, i) => (
                <Badge key={i} tone="default" fontSize={0}>
                  {f.path}
                </Badge>
              ))}
              {schemaFields.length > 8 && (
                <Badge tone="default" fontSize={0}>
                  +{schemaFields.length - 8} more
                </Badge>
              )}
            </Flex>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
