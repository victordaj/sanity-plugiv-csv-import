import {ChevronLeftIcon, ChevronRightIcon, DocumentIcon} from '@sanity/icons'
import {Badge, Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import {useState} from 'react'

export interface CsvPreviewProps {
  headers: string[]
  rows: Record<string, string>[]
  maxPreviewRows?: number
}

const ROWS_PER_PAGE = 10

export function CsvPreview({headers, rows, maxPreviewRows = 50}: CsvPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const previewRows = rows.slice(0, maxPreviewRows)
  const totalPages = Math.ceil(previewRows.length / ROWS_PER_PAGE)
  const startIndex = currentPage * ROWS_PER_PAGE
  const endIndex = Math.min(startIndex + ROWS_PER_PAGE, previewRows.length)
  const currentRows = previewRows.slice(startIndex, endIndex)

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))
  }

  const truncateValue = (value: string, maxLength = 40): string => {
    if (!value) return '—'
    if (value.length <= maxLength) return value
    return `${value.substring(0, maxLength)}...`
  }

  return (
    <Card padding={4} radius={2} shadow={1}>
      <Stack space={4}>
        {/* Header */}
        <Flex align="center" justify="space-between">
          <Flex align="center" gap={2}>
            <DocumentIcon />
            <Text weight="semibold">Data Preview</Text>
          </Flex>
          <Flex align="center" gap={2}>
            <Badge tone="primary">{rows.length} rows</Badge>
            <Badge>{headers.length} columns</Badge>
          </Flex>
        </Flex>

        {/* Table Container */}
        <Box
          style={{
            overflowX: 'auto',
            border: '1px solid var(--card-border-color)',
            borderRadius: '4px',
          }}
        >
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '13px',
              minWidth: `${headers.length * 150}px`,
            }}
          >
            {/* Table Header */}
            <thead>
              <tr>
                <th
                  style={{
                    padding: '10px 12px',
                    textAlign: 'center',
                    backgroundColor: 'var(--card-bg2-color)',
                    borderBottom: '2px solid var(--card-border-color)',
                    fontWeight: 600,
                    color: 'var(--card-muted-fg-color)',
                    width: '50px',
                    position: 'sticky',
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  #
                </th>
                {headers.map((header) => (
                  <th
                    key={`header-${header}`}
                    style={{
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: 'var(--card-bg2-color)',
                      borderBottom: '2px solid var(--card-border-color)',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                    title={header}
                  >
                    {truncateValue(header, 25)}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {currentRows.map((row, rowIndex) => (
                <tr
                  key={`row-${startIndex + rowIndex}`}
                  style={{
                    backgroundColor: rowIndex % 2 === 0 ? 'transparent' : 'var(--card-bg2-color)',
                  }}
                >
                  <td
                    style={{
                      padding: '8px 12px',
                      textAlign: 'center',
                      borderBottom: '1px solid var(--card-border-color)',
                      color: 'var(--card-muted-fg-color)',
                      fontWeight: 500,
                      fontSize: '12px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor:
                        rowIndex % 2 === 0 ? 'var(--card-bg-color)' : 'var(--card-bg2-color)',
                      zIndex: 1,
                    }}
                  >
                    {startIndex + rowIndex + 1}
                  </td>
                  {headers.map((header) => (
                    <td
                      key={`cell-${header}`}
                      style={{
                        padding: '8px 12px',
                        borderBottom: '1px solid var(--card-border-color)',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={row[header] || ''}
                    >
                      {row[header] ? (
                        <span>{truncateValue(row[header])}</span>
                      ) : (
                        <span style={{color: 'var(--card-muted-fg-color)'}}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Flex align="center" justify="space-between">
            <Text size={1} muted>
              Showing rows {startIndex + 1}–{endIndex} of {previewRows.length}
              {rows.length > maxPreviewRows && (
                <span> (preview limited to {maxPreviewRows} rows)</span>
              )}
            </Text>
            <Flex gap={2}>
              <Button
                icon={ChevronLeftIcon}
                mode="ghost"
                padding={2}
                disabled={currentPage === 0}
                onClick={handlePrevPage}
                title="Previous page"
              />
              <Flex align="center" gap={1}>
                <Text size={1}>
                  Page {currentPage + 1} of {totalPages}
                </Text>
              </Flex>
              <Button
                icon={ChevronRightIcon}
                mode="ghost"
                padding={2}
                disabled={currentPage >= totalPages - 1}
                onClick={handleNextPage}
                title="Next page"
              />
            </Flex>
          </Flex>
        )}

        {/* Info Note */}
        {rows.length > maxPreviewRows && (
          <Card padding={3} radius={2} tone="caution">
            <Text size={1}>
              Showing first {maxPreviewRows} rows for preview. All {rows.length} rows will be
              validated and imported.
            </Text>
          </Card>
        )}
      </Stack>
    </Card>
  )
}
