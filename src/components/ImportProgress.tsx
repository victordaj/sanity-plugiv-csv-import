import {CheckmarkCircleIcon, ErrorOutlineIcon, SyncIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'

export interface ImportResult {
  row: number
  success: boolean
  documentId?: string
  error?: string
}

export interface ImportProgressProps {
  totalRows: number
  processedRows: number
  results: ImportResult[]
  isComplete: boolean
}

export function ImportProgress({
  totalRows,
  processedRows,
  results,
  isComplete,
}: ImportProgressProps) {
  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length
  const progressPercent = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0

  return (
    <Stack space={4}>
      <Card
        padding={4}
        radius={2}
        tone={isComplete ? (errorCount > 0 ? 'caution' : 'positive') : 'primary'}
      >
        <Stack space={3}>
          <Flex align="center" gap={2}>
            {isComplete ? (
              errorCount > 0 ? (
                <ErrorOutlineIcon />
              ) : (
                <CheckmarkCircleIcon />
              )
            ) : (
              <SyncIcon style={{animation: 'spin 1s linear infinite'}} />
            )}
            <Text weight="semibold">
              {isComplete
                ? errorCount > 0
                  ? 'Import Completed with Errors'
                  : 'Import Completed Successfully'
                : 'Importing Documents...'}
            </Text>
          </Flex>
          {!isComplete && (
            <Text muted size={1}>
              Please wait while documents are being created...
            </Text>
          )}
        </Stack>
      </Card>

      {/* Progress Bar */}
      <Card padding={3} radius={2} shadow={1}>
        <Stack space={3}>
          <Flex justify="space-between">
            <Text size={1}>Progress</Text>
            <Text size={1} weight="semibold">
              {progressPercent}%
            </Text>
          </Flex>
          <Box
            style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--card-border-color)',
              borderRadius: '4px',
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: 'var(--card-badge-positive-dot-color)',
                transition: 'width 0.3s ease',
              }}
            />
          </Box>
          <Flex justify="space-between">
            <Text size={1} muted>
              {processedRows} of {totalRows} documents
            </Text>
            <Flex gap={2}>
              <Flex align="center" gap={1}>
                <Badge tone="positive" fontSize={0}>
                  {successCount}
                </Badge>
                <Text size={0} muted>
                  success
                </Text>
              </Flex>
              {errorCount > 0 && (
                <Flex align="center" gap={1}>
                  <Badge tone="critical" fontSize={0}>
                    {errorCount}
                  </Badge>
                  <Text size={0} muted>
                    failed
                  </Text>
                </Flex>
              )}
            </Flex>
          </Flex>
        </Stack>
      </Card>

      {/* Error Details */}
      {errorCount > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={3}>
            <Text weight="semibold">Failed Imports</Text>
            <Box style={{maxHeight: '200px', overflowY: 'auto'}}>
              <Stack space={2}>
                {results
                  .filter((r) => !r.success)
                  .slice(0, 20)
                  .map((result, index) => (
                    <Card key={index} padding={3} radius={2} tone="critical">
                      <Flex align="center" gap={3}>
                        <ErrorOutlineIcon />
                        <Stack space={1}>
                          <Text size={1} weight="semibold">
                            Row {result.row + 1}
                          </Text>
                          <Text size={1}>{result.error || 'Unknown error'}</Text>
                        </Stack>
                      </Flex>
                    </Card>
                  ))}
                {errorCount > 20 && (
                  <Text size={1} muted style={{textAlign: 'center'}}>
                    ... and {errorCount - 20} more errors
                  </Text>
                )}
              </Stack>
            </Box>
          </Stack>
        </Card>
      )}

      {/* Success Summary */}
      {isComplete && successCount > 0 && (
        <Card padding={4} radius={2} tone="positive">
          <Flex align="center" gap={3}>
            <CheckmarkCircleIcon />
            <Stack space={1}>
              <Text weight="semibold">
                {successCount} document{successCount !== 1 ? 's' : ''} created successfully
              </Text>
              <Text size={1} muted>
                You can now view and edit these documents in Sanity Studio.
              </Text>
            </Stack>
          </Flex>
        </Card>
      )}

      {/* CSS for spinning animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Stack>
  )
}
