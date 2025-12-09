import {CheckmarkCircleIcon, DocumentIcon, ImageIcon, LinkIcon, SearchIcon} from '@sanity/icons'
import {Badge, Box, Card, Flex, Grid, Stack, Text, TextInput} from '@sanity/ui'
import {useMemo, useState} from 'react'
import {type Schema} from 'sanity'

import {getSchemaFields, hasImageFields, hasReferenceFields} from '../lib/schemaUtils'

export interface DocumentType {
  name: string
  title: string
}

export interface TypeSelectorProps {
  documentTypes: DocumentType[]
  selectedType: string
  onTypeSelect: (typeName: string) => void
  schema: Schema
}

interface TypeCardInfo {
  name: string
  title: string
  fieldCount: number
  hasReferences: boolean
  hasImages: boolean
}

export function TypeSelector({
  documentTypes,
  selectedType,
  onTypeSelect,
  schema,
}: TypeSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Pre-compute type info for all document types
  const typeInfos = useMemo((): TypeCardInfo[] => {
    return documentTypes.map((type) => {
      const fields = getSchemaFields(schema, type.name)
      return {
        name: type.name,
        title: type.title,
        fieldCount: fields.length,
        hasReferences: hasReferenceFields(fields),
        hasImages: hasImageFields(fields),
      }
    })
  }, [documentTypes, schema])

  // Filter types by search
  const filteredTypes = useMemo(() => {
    if (!searchQuery.trim()) return typeInfos
    const query = searchQuery.toLowerCase()
    return typeInfos.filter(
      (type) => type.title.toLowerCase().includes(query) || type.name.toLowerCase().includes(query),
    )
  }, [typeInfos, searchQuery])

  const showSearch = documentTypes.length > 6

  return (
    <Stack space={5}>
      {/* Header */}
      <Stack space={3}>
        <Text size={2} weight="semibold">
          Select Document Type
        </Text>
        <Text size={1} muted>
          Choose the type of document you want to import. Each type has different fields and
          requirements.
        </Text>
      </Stack>

      {/* Search - only show if more than 6 types */}
      {showSearch && (
        <TextInput
          icon={SearchIcon}
          placeholder="Search document types..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          fontSize={1}
          padding={3}
          radius={2}
        />
      )}

      {/* Type Cards Grid */}
      <Grid columns={[1, 2, 3]} gap={3}>
        {filteredTypes.map((type) => {
          const isSelected = selectedType === type.name

          return (
            <Card
              key={type.name}
              padding={4}
              radius={2}
              shadow={isSelected ? 2 : 1}
              tone={isSelected ? 'primary' : 'default'}
              style={{
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: isSelected
                  ? '2px solid var(--card-focus-ring-color)'
                  : '2px solid transparent',
              }}
              onClick={() => onTypeSelect(type.name)}
            >
              <Stack space={3}>
                {/* Title Row */}
                <Flex align="center" justify="space-between">
                  <Flex align="center" gap={2}>
                    <DocumentIcon style={{fontSize: 18, opacity: 0.6}} />
                    <Text size={1} weight="semibold">
                      {type.title}
                    </Text>
                  </Flex>
                  {isSelected && (
                    <CheckmarkCircleIcon
                      style={{
                        fontSize: 20,
                        color: 'var(--card-focus-ring-color)',
                      }}
                    />
                  )}
                </Flex>

                {/* Meta Row */}
                <Flex align="center" gap={2} wrap="wrap">
                  <Badge tone="default" fontSize={0} padding={1}>
                    {type.fieldCount} fields
                  </Badge>
                  {type.hasReferences && (
                    <Badge tone="caution" fontSize={0} padding={1}>
                      <Flex align="center" gap={1}>
                        <LinkIcon style={{fontSize: 12}} />
                        <span>refs</span>
                      </Flex>
                    </Badge>
                  )}
                  {type.hasImages && (
                    <Badge tone="positive" fontSize={0} padding={1}>
                      <Flex align="center" gap={1}>
                        <ImageIcon style={{fontSize: 12}} />
                        <span>images</span>
                      </Flex>
                    </Badge>
                  )}
                </Flex>

                {/* Type name (technical) */}
                <Text size={0} muted style={{fontFamily: 'monospace'}}>
                  {type.name}
                </Text>
              </Stack>
            </Card>
          )
        })}
      </Grid>

      {/* Empty state for search */}
      {filteredTypes.length === 0 && searchQuery && (
        <Card padding={5} radius={2} tone="transparent">
          <Stack space={3} style={{textAlign: 'center'}}>
            <Text size={1} muted>
              No document types found matching "{searchQuery}"
            </Text>
            <Box>
              <Text
                size={1}
                style={{color: 'var(--card-link-color)', cursor: 'pointer'}}
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Text>
            </Box>
          </Stack>
        </Card>
      )}
    </Stack>
  )
}
