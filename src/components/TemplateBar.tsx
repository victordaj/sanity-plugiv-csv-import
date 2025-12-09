import {DownloadIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Text} from '@sanity/ui'

import {type SchemaField} from '../lib/schemaUtils'
import {downloadTemplate} from '../lib/templateGenerator'
import {type ReferenceMatchConfig} from './ReferenceConfig'

export interface TemplateBarProps {
  documentType: string
  documentTypeTitle: string
  schemaFields: SchemaField[]
  referenceConfig: ReferenceMatchConfig[]
  visible: boolean
}

export function TemplateBar({
  documentType,
  documentTypeTitle,
  schemaFields,
  referenceConfig,
  visible,
}: TemplateBarProps) {
  if (!visible || !documentType || schemaFields.length === 0) {
    return null
  }

  const handleDownload = (format: 'xlsx' | 'csv') => {
    downloadTemplate(schemaFields, referenceConfig, documentType, format)
  }

  return (
    <Box
      style={{
        position: 'sticky',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        marginTop: 'auto',
      }}
    >
      <Card
        padding={3}
        radius={2}
        shadow={2}
        tone="default"
        style={{
          borderTop: '1px solid var(--card-border-color)',
          backgroundColor: 'var(--card-bg-color)',
        }}
      >
        <Flex align="center" justify="space-between" gap={3} wrap="wrap">
          <Flex align="center" gap={2}>
            <DownloadIcon style={{fontSize: 18, opacity: 0.6}} />
            <Text size={1}>
              Download template for <strong>{documentTypeTitle}</strong>
            </Text>
          </Flex>

          <Flex gap={2}>
            <Button
              text="Excel (.xlsx)"
              mode="ghost"
              tone="primary"
              fontSize={1}
              padding={2}
              onClick={() => handleDownload('xlsx')}
            />
            <Button
              text="CSV"
              mode="ghost"
              fontSize={1}
              padding={2}
              onClick={() => handleDownload('csv')}
            />
          </Flex>
        </Flex>
      </Card>
    </Box>
  )
}
