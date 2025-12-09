import {DownloadIcon} from '@sanity/icons'
import {Box, Button, Card, Inline, Select, Stack, Text} from '@sanity/ui'
import {useState} from 'react'
import {type Schema} from 'sanity'

import {type SchemaField} from '../lib/schemaUtils'
import {downloadTemplate} from '../lib/templateGenerator'

export interface DocumentType {
  name: string
  title: string
}

export interface TypeSelectorProps {
  documentTypes: DocumentType[]
  selectedType: string
  schemaFields: SchemaField[]
  onTypeSelect: (typeName: string) => void
  schema: Schema
}

export function TypeSelector({
  documentTypes,
  selectedType,
  schemaFields,
  onTypeSelect,
}: TypeSelectorProps) {
  const [templateFormat, setTemplateFormat] = useState<'xlsx' | 'csv'>('xlsx')

  const handleTypeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onTypeSelect(event.target.value)
  }

  const handleDownloadTemplate = () => {
    if (selectedType && schemaFields.length > 0) {
      // For initial template, no reference mappings configured yet
      downloadTemplate(schemaFields, [], selectedType, templateFormat)
    }
  }

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone="primary">
        <Stack space={3}>
          <Text weight="semibold">Select Document Type</Text>
          <Text muted size={1}>
            Choose the document type you want to import data into.
          </Text>
        </Stack>
      </Card>

      <Box>
        <Select fontSize={2} padding={3} value={selectedType} onChange={handleTypeChange}>
          <option value="">Select a document type...</option>
          {documentTypes.map((type) => (
            <option key={type.name} value={type.name}>
              {type.title}
            </option>
          ))}
        </Select>
      </Box>

      {selectedType && schemaFields.length > 0 && (
        <Card padding={4} radius={2} shadow={1}>
          <Stack space={4}>
            <Text weight="semibold">Schema Fields</Text>
            <Text muted size={1}>
              The following fields will be included in the import template:
            </Text>

            <Box
              style={{
                maxHeight: '200px',
                overflowY: 'auto',
              }}
            >
              <Stack space={2}>
                {schemaFields.map((field) => (
                  <Inline key={field.path} space={2}>
                    <Text size={1} style={{fontFamily: 'monospace'}}>
                      {field.path}
                    </Text>
                    <Text muted size={1}>
                      ({field.type}
                      {field.required && ', required'}
                      {field.isArray && ', array'}
                      {field.isReference && ', reference'}
                      {field.isImage && ', image'})
                    </Text>
                  </Inline>
                ))}
              </Stack>
            </Box>

            <Stack space={3}>
              <Text weight="semibold" size={1}>
                Download Template
              </Text>
              <Inline space={2}>
                <Select
                  fontSize={1}
                  padding={2}
                  value={templateFormat}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setTemplateFormat(e.target.value as 'xlsx' | 'csv')
                  }
                  style={{width: '100px'}}
                >
                  <option value="xlsx">Excel</option>
                  <option value="csv">CSV</option>
                </Select>
                <Button
                  fontSize={1}
                  icon={DownloadIcon}
                  mode="ghost"
                  padding={2}
                  text="Download Template"
                  onClick={handleDownloadTemplate}
                />
              </Inline>
            </Stack>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
