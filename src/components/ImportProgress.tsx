import {CheckmarkCircleIcon, DocumentIcon, ErrorOutlineIcon, SyncIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Grid, Stack, Text} from '@sanity/ui'

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
      {/* Header */}
      <Box>
        <Text weight="semibold" size={2}>
          {isComplete ? 'Import Complete' : 'Importing Documents'}
        </Text>
        <Text muted size={1} style={{marginTop: '8px'}}>
          {isComplete
            ? 'Your documents have been processed'
            : 'Please wait while documents are being created...'}
        </Text>
      </Box>

      {/* Status Banner */}
      <Card
        padding={4}
        radius={3}
        tone={isComplete ? (errorCount > 0 ? 'caution' : 'positive') : 'primary'}
      >
        <Flex align="center" gap={3}>
          <Box
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: isComplete
                ? errorCount > 0
                  ? 'var(--card-badge-caution-bg-color)'
                  : 'var(--card-badge-positive-bg-color)'
                : 'var(--card-badge-primary-bg-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isComplete ? (
              errorCount > 0 ? (
                <ErrorOutlineIcon style={{fontSize: '1.75em'}} />
              ) : (
                <CheckmarkCircleIcon style={{fontSize: '1.75em'}} />
              )
            ) : (
              <SyncIcon style={{fontSize: '1.75em', animation: 'spin 1s linear infinite'}} />
            )}
          </Box>
          <Stack space={2}>
            <Text weight="semibold" size={2}>
              {isComplete
                ? errorCount > 0
                  ? `Completed with ${errorCount} error${errorCount !== 1 ? 's' : ''}`
                  : 'All documents imported!'
                : `Importing... ${progressPercent}%`}
            </Text>
            <Text size={1}>
              {successCount} of {totalRows} document{totalRows !== 1 ? 's' : ''} created
              successfully
            </Text>
          </Stack>
        </Flex>
      </Card>

      {/* Progress Bar */}
      <Card padding={4} radius={2} shadow={1}>
        <Stack space={3}>
          <Flex justify="space-between" align="center">
            <Text size={1} weight="semibold">
              Progress
            </Text>
            <Badge tone={isComplete ? 'positive' : 'primary'} fontSize={1}>
              {progressPercent}%
            </Badge>
          </Flex>
          <Box
            style={{
              width: '100%',
              height: '12px',
              backgroundColor: 'var(--card-bg2-color)',
              borderRadius: '6px',
              overflow: 'hidden',
            }}
          >
            <Box
              style={{
                width: `${progressPercent}%`,
                height: '100%',
                backgroundColor: isComplete
                  ? 'var(--card-badge-positive-dot-color)'
                  : 'var(--card-badge-primary-dot-color)',
                transition: 'width 0.3s ease',
                borderRadius: '6px',
              }}
            />
          </Box>
          <Text size={1} muted style={{textAlign: 'center'}}>
            {processedRows} of {totalRows} documents processed
          </Text>
        </Stack>
      </Card>

      {/* Stats Grid */}
      <Grid columns={[2, 2, 3]} gap={3}>
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              TOTAL
            </Text>
            <Flex align="center" gap={2}>
              <DocumentIcon style={{opacity: 0.5}} />
              <Text size={4} weight="bold">
                {totalRows}
              </Text>
            </Flex>
          </Stack>
        </Card>
        <Card padding={4} radius={2} shadow={1} tone="positive">
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              SUCCESS
            </Text>
            <Flex align="center" gap={2}>
              <CheckmarkCircleIcon style={{color: 'var(--card-badge-positive-icon-color)'}} />
              <Text size={4} weight="bold">
                {successCount}
              </Text>
            </Flex>
          </Stack>
        </Card>
        <Card padding={4} radius={2} shadow={1} tone={errorCount > 0 ? 'critical' : 'default'}>
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              FAILED
            </Text>
            <Flex align="center" gap={2}>
              <ErrorOutlineIcon
                style={{
                  color: errorCount > 0 ? 'var(--card-badge-critical-icon-color)' : 'inherit',
                  opacity: errorCount > 0 ? 1 : 0.5,
                }}
              />
              <Text size={4} weight="bold">
                {errorCount}
              </Text>
            </Flex>
          </Stack>
        </Card>
      </Grid>

      {/* Error Details */}
      {errorCount > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={3}>
            <Flex align="center" justify="space-between">
              <Text weight="semibold">Failed Imports</Text>
              <Badge tone="critical" fontSize={0}>
                {errorCount} error{errorCount !== 1 ? 's' : ''}
              </Badge>
            </Flex>
            <Box
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
                borderRadius: '4px',
                border: '1px solid var(--card-border-color)',
              }}
            >
              <Stack space={0}>
                {results
                  .filter((r) => !r.success)
                  .slice(0, 20)
                  .map((result, index) => (
                    <Box
                      key={index}
                      padding={3}
                      style={{
                        borderBottom:
                          index <
                          Math.min(results.filter((r) => !r.success).length, 20) - 1
                            ? '1px solid var(--card-border-color)'
                            : 'none',
                        backgroundColor: 'rgba(var(--card-badge-critical-bg-color-rgb), 0.1)',
                      }}
                    >
                      <Flex align="center" gap={3}>
                        <ErrorOutlineIcon
                          style={{
                            flexShrink: 0,
                            color: 'var(--card-badge-critical-icon-color)',
                          }}
                        />
                        <Stack space={1} style={{flex: 1}}>
                          <Badge mode="outline" fontSize={0}>
                            Row {result.row + 1}
                          </Badge>
                          <Text size={1}>{result.error || 'Unknown error'}</Text>
                        </Stack>
                      </Flex>
                    </Box>
                  ))}
              </Stack>
            </Box>
            {errorCount > 20 && (
              <Text size={1} muted style={{textAlign: 'center'}}>
                Showing 20 of {errorCount} errors
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Success Summary */}
      {isComplete && successCount > 0 && (
        <Card padding={4} radius={2} tone="positive" style={{textAlign: 'center'}}>
          <Stack space={3}>
            <Flex justify="center">
              <Box
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--card-badge-positive-bg-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckmarkCircleIcon style={{fontSize: '1.5em'}} />
              </Box>
            </Flex>
            <Stack space={1}>
              <Text weight="semibold" size={2}>
                {successCount} document{successCount !== 1 ? 's' : ''} created
              </Text>
              <Text size={1} muted>
                You can now view and edit these documents in Sanity Studio
              </Text>
            </Stack>
          </Stack>
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
