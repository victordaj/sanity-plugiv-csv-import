import {CheckmarkCircleIcon, ErrorOutlineIcon, WarningOutlineIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Grid, Stack, Text} from '@sanity/ui'

export interface ValidationIssue {
  row: number
  field: string
  type: 'error' | 'warning'
  message: string
}

export interface ValidationSummaryProps {
  totalRows: number
  validRows: number
  issues: ValidationIssue[]
  onContinue: () => void
  onCancel: () => void
}

export function ValidationSummary({totalRows, validRows, issues}: ValidationSummaryProps) {
  const errors = issues.filter((i) => i.type === 'error')
  const warnings = issues.filter((i) => i.type === 'warning')

  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0
  const invalidRows = totalRows - validRows
  const successRate = totalRows > 0 ? Math.round((validRows / totalRows) * 100) : 0

  return (
    <Stack space={4}>
      {/* Header */}
      <Box>
        <Text weight="semibold" size={2}>
          Validation Results
        </Text>
        <Text muted size={1} style={{marginTop: '8px'}}>
          Review the validation results before importing
        </Text>
      </Box>

      {/* Status Banner */}
      <Card
        padding={4}
        radius={3}
        tone={hasErrors ? 'critical' : hasWarnings ? 'caution' : 'positive'}
      >
        <Flex align="center" gap={3}>
          <Box
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: hasErrors
                ? 'var(--card-badge-critical-bg-color)'
                : hasWarnings
                  ? 'var(--card-badge-caution-bg-color)'
                  : 'var(--card-badge-positive-bg-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {hasErrors ? (
              <ErrorOutlineIcon style={{fontSize: '1.5em'}} />
            ) : hasWarnings ? (
              <WarningOutlineIcon style={{fontSize: '1.5em'}} />
            ) : (
              <CheckmarkCircleIcon style={{fontSize: '1.5em'}} />
            )}
          </Box>
          <Stack space={2}>
            <Text weight="semibold" size={2}>
              {hasErrors
                ? 'Some rows have errors'
                : hasWarnings
                  ? 'Ready with warnings'
                  : 'All rows validated successfully'}
            </Text>
            <Text size={1}>
              {validRows} of {totalRows} rows ({successRate}%) are valid and ready for import
            </Text>
          </Stack>
        </Flex>
      </Card>

      {/* Stats Grid */}
      <Grid columns={[2, 2, 4]} gap={3}>
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              TOTAL ROWS
            </Text>
            <Text size={4} weight="bold">
              {totalRows}
            </Text>
          </Stack>
        </Card>
        <Card padding={4} radius={2} shadow={1} tone="positive">
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              VALID
            </Text>
            <Flex align="baseline" gap={1}>
              <Text size={4} weight="bold">
                {validRows}
              </Text>
              <CheckmarkCircleIcon style={{color: 'var(--card-badge-positive-icon-color)'}} />
            </Flex>
          </Stack>
        </Card>
        <Card padding={4} radius={2} shadow={1} tone={hasErrors ? 'critical' : 'default'}>
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              ERRORS
            </Text>
            <Text size={4} weight="bold">
              {errors.length}
            </Text>
          </Stack>
        </Card>
        <Card padding={4} radius={2} shadow={1} tone={hasWarnings ? 'caution' : 'default'}>
          <Stack space={2}>
            <Text size={0} muted weight="semibold">
              WARNINGS
            </Text>
            <Text size={4} weight="bold">
              {warnings.length}
            </Text>
          </Stack>
        </Card>
      </Grid>

      {/* Issues List */}
      {issues.length > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={4}>
            <Flex align="center" justify="space-between">
              <Text weight="semibold">Issues Found</Text>
              <Flex gap={2}>
                {errors.length > 0 && (
                  <Badge tone="critical" fontSize={0}>
                    {errors.length} error{errors.length !== 1 ? 's' : ''}
                  </Badge>
                )}
                {warnings.length > 0 && (
                  <Badge tone="caution" fontSize={0}>
                    {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </Flex>
            </Flex>
            <Box
              style={{
                maxHeight: '280px',
                overflowY: 'auto',
                borderRadius: '4px',
                border: '1px solid var(--card-border-color)',
              }}
            >
              <Stack space={0}>
                {issues.slice(0, 50).map((issue, index) => (
                  <Box
                    key={index}
                    padding={3}
                    style={{
                      borderBottom:
                        index < Math.min(issues.length, 50) - 1
                          ? '1px solid var(--card-border-color)'
                          : 'none',
                      backgroundColor:
                        issue.type === 'error'
                          ? 'rgba(var(--card-badge-critical-bg-color-rgb), 0.1)'
                          : 'rgba(var(--card-badge-caution-bg-color-rgb), 0.1)',
                    }}
                  >
                    <Flex align="center" gap={3}>
                      {issue.type === 'error' ? (
                        <ErrorOutlineIcon
                          style={{
                            flexShrink: 0,
                            color: 'var(--card-badge-critical-icon-color)',
                          }}
                        />
                      ) : (
                        <WarningOutlineIcon
                          style={{
                            flexShrink: 0,
                            color: 'var(--card-badge-caution-icon-color)',
                          }}
                        />
                      )}
                      <Stack space={1} style={{flex: 1}}>
                        <Flex gap={2} align="center">
                          <Badge mode="outline" fontSize={0}>
                            Row {issue.row + 1}
                          </Badge>
                          <Badge mode="outline" tone="default" fontSize={0}>
                            {issue.field}
                          </Badge>
                        </Flex>
                        <Text size={1}>{issue.message}</Text>
                      </Stack>
                    </Flex>
                  </Box>
                ))}
              </Stack>
            </Box>
            {issues.length > 50 && (
              <Text size={1} muted style={{textAlign: 'center'}}>
                Showing 50 of {issues.length} issues
              </Text>
            )}
          </Stack>
        </Card>
      )}

      {/* Success message */}
      {!hasErrors && validRows > 0 && (
        <Card padding={4} radius={2} tone="positive" style={{textAlign: 'center'}}>
          <Stack space={2}>
            <Flex justify="center">
              <CheckmarkCircleIcon style={{fontSize: '1.5em'}} />
            </Flex>
            <Text weight="semibold">
              Ready to import {validRows} document{validRows !== 1 ? 's' : ''}
            </Text>
            {invalidRows > 0 && (
              <Text size={1} muted>
                {invalidRows} row{invalidRows !== 1 ? 's' : ''} will be skipped due to errors
              </Text>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
