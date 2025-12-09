import {Box, Card, Container, Heading, Stack, Text} from '@sanity/ui'
import {useSchema} from 'sanity'

import {Wizard} from './Wizard'

export function CsvImportToolComponent() {
  const schema = useSchema()

  // Get all document types from schema
  const documentTypes =
    schema._original?.types
      .filter((type) => type.type === 'document' && !type.name.startsWith('sanity.'))
      .map((type) => ({
        name: type.name,
        title: type.title || type.name,
      }))
      .sort((a, b) => a.title.localeCompare(b.title)) || []

  return (
    <Box padding={4} sizing="border">
      <Container width={2}>
        <Stack space={5}>
          <Box paddingY={2}>
            <Stack space={2}>
              <Heading as="h1" size={4} style={{fontWeight: 700}}>
                Bulk Import
              </Heading>
              <Text size={2} muted>
                From spreadsheet to Sanity in seconds
              </Text>
            </Stack>
          </Box>

          {documentTypes.length === 0 ? (
            <Card padding={4} radius={2} tone="caution">
              <Text>No document types found in schema.</Text>
            </Card>
          ) : (
            <Wizard documentTypes={documentTypes} schema={schema} />
          )}
        </Stack>
      </Container>
    </Box>
  )
}
