import {DocumentIcon, UploadIcon} from '@sanity/icons'
import {Card, Flex, Stack, Text} from '@sanity/ui'
import {type ChangeEvent, type ReactNode, useCallback, useState} from 'react'

import {type CsvParseError, parseCsvFile, type ParsedCsvData} from '../lib/csvParser'
import {type SchemaField} from '../lib/schemaUtils'

export interface CsvUploaderProps {
  schemaFields: SchemaField[]
  onCsvParsed: (data: ParsedCsvData) => void
}

export function CsvUploader({schemaFields, onCsvParsed}: CsvUploaderProps): ReactNode {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<CsvParseError[]>([])
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      setIsLoading(true)
      setErrors([])
      setFileName(file.name)

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
        // Reset input for re-upload
        event.target.value = ''
      }
    },
    [schemaFields, onCsvParsed],
  )

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone="primary">
        <Stack space={3}>
          <Text weight="semibold">Upload CSV File</Text>
          <Text muted size={1}>
            Upload your CSV file with data to import. The file should have headers matching the
            template columns. Maximum {500} rows allowed.
          </Text>
        </Stack>
      </Card>

      <Card padding={4} radius={2} shadow={1}>
        <Stack space={4}>
          <Card
            padding={5}
            radius={2}
            tone="transparent"
            style={{
              border: '2px dashed var(--card-border-color)',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <input
              type="file"
              accept=".csv,.txt"
              onChange={handleFileSelect}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
              }}
              disabled={isLoading}
            />
            <Stack space={3}>
              <Flex justify="center">
                <UploadIcon style={{fontSize: '2em', opacity: 0.5}} />
              </Flex>
              <Text muted>
                {isLoading ? 'Parsing CSV...' : 'Click or drag CSV file here to upload'}
              </Text>
              {fileName && (
                <Flex align="center" justify="center" gap={2}>
                  <DocumentIcon />
                  <Text size={1}>{fileName}</Text>
                </Flex>
              )}
            </Stack>
          </Card>

          {errors.length > 0 && (
            <Card padding={4} radius={2} tone="critical">
              <Stack space={3}>
                <Text weight="semibold">Errors</Text>
                {errors.map((error, index) => (
                  <Text key={`${error.code}-${error.row ?? index}`} size={1}>
                    {error.row !== undefined && `Row ${error.row + 1}: `}
                    {error.message}
                  </Text>
                ))}
              </Stack>
            </Card>
          )}

          <Card padding={3} radius={2} tone="caution">
            <Stack space={2}>
              <Text size={1} weight="semibold">
                Expected columns:
              </Text>
              <Text size={1} style={{fontFamily: 'monospace', wordBreak: 'break-all'}}>
                {schemaFields.map((f) => f.path).join(', ')}
              </Text>
            </Stack>
          </Card>
        </Stack>
      </Card>
    </Stack>
  )
}
