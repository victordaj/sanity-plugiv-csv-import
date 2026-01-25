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
}

export function ValidationSummary({totalRows, validRows, issues}: ValidationSummaryProps) {
  const errors = issues.filter((i) => i.type === 'error')
  const warnings = issues.filter((i) => i.type === 'warning')

  const hasErrors = errors.length > 0
  const hasWarnings = warnings.length > 0

  /**
   * Determine card tone based on validation state
   */
  function getValidationTone(): 'critical' | 'caution' | 'positive' {
    if (hasErrors) return 'critical'
    if (hasWarnings) return 'caution'
    return 'positive'
  }

  /**
   * Get status message based on validation state
   */
  function getStatusMessage(): string {
    if (hasErrors) return 'Validation Failed'
    if (hasWarnings) return 'Validation Passed with Warnings'
    return 'Validation Passed'
  }

  /**
   * Render status icon based on validation state
   */
  function renderStatusIcon() {
    if (hasErrors) {
      return <ErrorOutlineIcon style={{color: 'var(--card-badge-critical-icon-color)'}} />
    }
    if (hasWarnings) {
      return <WarningOutlineIcon style={{color: 'var(--card-badge-caution-icon-color)'}} />
    }
    return <CheckmarkCircleIcon style={{color: 'var(--card-badge-positive-icon-color)'}} />
  }

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone={getValidationTone()}>
        <Stack space={3}>
          <Flex align="center" gap={2}>
            {renderStatusIcon()}
            <Text weight="semibold">{getStatusMessage()}</Text>
          </Flex>
          <Text muted size={1}>
            {validRows} of {totalRows} rows are valid and ready for import.
          </Text>
        </Stack>
      </Card>

      <Grid columns={[1, 1, 3]} gap={3}>
        <Card padding={3} radius={2} shadow={1}>
          <Stack space={2}>
            <Text size={1} muted>
              Total Rows
            </Text>
            <Text size={4} weight="semibold">
              {totalRows}
            </Text>
          </Stack>
        </Card>
        <Card padding={3} radius={2} shadow={1} tone="positive">
          <Stack space={2}>
            <Text size={1} muted>
              Valid Rows
            </Text>
            <Text size={4} weight="semibold">
              {validRows}
            </Text>
          </Stack>
        </Card>
        <Card padding={3} radius={2} shadow={1} tone={hasErrors ? 'critical' : 'default'}>
          <Stack space={2}>
            <Text size={1} muted>
              Errors
            </Text>
            <Text size={4} weight="semibold">
              {errors.length}
            </Text>
          </Stack>
        </Card>
      </Grid>

      {issues.length > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={4}>
            <Text weight="semibold">Issues ({issues.length})</Text>
            <Box style={{maxHeight: '300px', overflowY: 'auto'}}>
              <Stack space={2}>
                {issues.slice(0, 50).map((issue, index) => (
                  <Card
                    key={index}
                    padding={3}
                    radius={2}
                    tone={issue.type === 'error' ? 'critical' : 'caution'}
                  >
                    <Flex align="flex-start" gap={3}>
                      {issue.type === 'error' ? (
                        <ErrorOutlineIcon style={{flexShrink: 0}} />
                      ) : (
                        <WarningOutlineIcon style={{flexShrink: 0}} />
                      )}
                      <Stack space={1}>
                        <Flex gap={2} wrap="wrap">
                          <Badge tone={issue.type === 'error' ? 'critical' : 'caution'}>
                            Row {issue.row + 1}
                          </Badge>
                          <Badge>{issue.field}</Badge>
                        </Flex>
                        <Text size={1}>{issue.message}</Text>
                      </Stack>
                    </Flex>
                  </Card>
                ))}
                {issues.length > 50 && (
                  <Text size={1} muted style={{textAlign: 'center'}}>
                    ... and {issues.length - 50} more issues
                  </Text>
                )}
              </Stack>
            </Box>
          </Stack>
        </Card>
      )}

      {!hasErrors && validRows > 0 && (
        <Card padding={3} radius={2} tone="positive">
          <Flex align="center" gap={2}>
            <CheckmarkCircleIcon />
            <Text size={1}>
              Ready to import {validRows} document{validRows === 1 ? '' : 's'}
            </Text>
          </Flex>
        </Card>
      )}
    </Stack>
  )
}
