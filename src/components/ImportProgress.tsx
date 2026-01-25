import {CheckmarkCircleIcon, CloseCircleIcon, ErrorOutlineIcon, SyncIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Stack, Text} from '@sanity/ui'
import {useEffect, useRef} from 'react'

export interface ImportResult {
  row: number
  success: boolean
  documentId?: string
  documentTitle?: string
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
  const scrollRef = useRef<HTMLDivElement>(null)
  const successCount = results.filter((r) => r.success).length
  const errorCount = results.filter((r) => !r.success).length
  const progressPercent = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0

  // Auto-scroll to bottom as new results come in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [results.length])

  /**
   * Determine card tone based on import state
   */
  function getStatusTone(): 'caution' | 'positive' | 'primary' {
    if (!isComplete) return 'primary'
    if (errorCount > 0) return 'caution'
    return 'positive'
  }

  /**
   * Get status message based on import state
   */
  function getStatusMessage(): string {
    if (!isComplete) return 'Importing Documents...'
    if (errorCount > 0) return 'Import Completed with Errors'
    return 'Import Completed Successfully'
  }

  /**
   * Render status icon based on import state
   */
  function renderStatusIcon() {
    if (!isComplete) {
      return <SyncIcon style={{animation: 'spin 1s linear infinite'}} />
    }
    if (errorCount > 0) {
      return <ErrorOutlineIcon />
    }
    return <CheckmarkCircleIcon />
  }

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone={getStatusTone()}>
        <Stack space={3}>
          <Flex align="center" gap={2}>
            {renderStatusIcon()}
            <Text weight="semibold">{getStatusMessage()}</Text>
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

      {/* Live Row Progress Feed */}
      <Card padding={4} radius={2} shadow={1}>
        <Stack space={3}>
          <Flex align="center" justify="space-between">
            <Text weight="semibold">Import Progress</Text>
            <Badge tone={isComplete ? 'default' : 'primary'}>
              {isComplete ? 'Complete' : 'Live'}
            </Badge>
          </Flex>

          <Box
            ref={scrollRef}
            style={{
              maxHeight: '280px',
              overflowY: 'auto',
              border: '1px solid var(--card-border-color)',
              borderRadius: '4px',
            }}
          >
            {results.length === 0 ? (
              <Flex align="center" justify="center" padding={4}>
                <Text muted size={1}>
                  Waiting for import to start...
                </Text>
              </Flex>
            ) : (
              <Stack space={0}>
                {results.map((result, index) => (
                  <Flex
                    key={`row-${result.row}`}
                    align="center"
                    gap={3}
                    padding={3}
                    style={{
                      borderBottom:
                        index < results.length - 1 ? '1px solid var(--card-border-color)' : 'none',
                      backgroundColor: result.success
                        ? 'transparent'
                        : 'var(--card-badge-critical-bg-color)',
                    }}
                  >
                    {/* Status Icon */}
                    <Box style={{flexShrink: 0}}>
                      {result.success ? (
                        <CheckmarkCircleIcon
                          style={{
                            color: 'var(--card-badge-positive-icon-color)',
                            fontSize: '18px',
                          }}
                        />
                      ) : (
                        <CloseCircleIcon
                          style={{
                            color: 'var(--card-badge-critical-icon-color)',
                            fontSize: '18px',
                          }}
                        />
                      )}
                    </Box>

                    {/* Row Info */}
                    <Flex align="center" gap={2} style={{flex: 1, minWidth: 0}}>
                      <Badge fontSize={0} tone="default">
                        Row {result.row + 1}
                      </Badge>
                      <Text
                        size={1}
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {result.success
                          ? result.documentTitle || result.documentId || 'Created'
                          : result.error || 'Failed'}
                      </Text>
                    </Flex>

                    {/* Status Badge */}
                    <Box style={{flexShrink: 0}}>
                      <Badge fontSize={0} tone={result.success ? 'positive' : 'critical'}>
                        {result.success ? 'OK' : 'Error'}
                      </Badge>
                    </Box>
                  </Flex>
                ))}
              </Stack>
            )}
          </Box>

          {/* Processing indicator */}
          {!isComplete && processedRows < totalRows && (
            <Flex align="center" gap={2} padding={2}>
              <SyncIcon
                style={{
                  animation: 'spin 1s linear infinite',
                  color: 'var(--card-muted-fg-color)',
                }}
              />
              <Text size={1} muted>
                Processing row {processedRows + 1}...
              </Text>
            </Flex>
          )}
        </Stack>
      </Card>

      {/* Error Details (only show unique errors when complete) */}
      {isComplete && errorCount > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={3}>
            <Text weight="semibold">Failed Imports ({errorCount})</Text>
            <Box style={{maxHeight: '200px', overflowY: 'auto'}}>
              <Stack space={2}>
                {results
                  .filter((r) => !r.success)
                  .slice(0, 20)
                  .map((result) => (
                    <Card key={`error-${result.row}`} padding={3} radius={2} tone="critical">
                      <Flex align="center" gap={3}>
                        <ErrorOutlineIcon />
                        <Stack space={1}>
                          <Text size={1} weight="semibold">
                            Row {result.row + 1}
                            {result.documentTitle && ` - ${result.documentTitle}`}
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
                {successCount} document{successCount === 1 ? '' : 's'} created successfully
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
