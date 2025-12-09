import {DocumentIcon, EditIcon, UploadIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Stack, Text} from '@sanity/ui'
import type {JSX} from 'react'

export interface WelcomeScreenProps {
  onGetStarted: () => void
}

export function WelcomeScreen({onGetStarted}: WelcomeScreenProps): JSX.Element {
  return (
    <Card padding={6} radius={3} shadow={1}>
      <Stack space={6}>
        {/* Header */}
        <Stack space={3} style={{textAlign: 'center'}}>
          <Text size={3} weight="bold">
            CSV Import
          </Text>
          <Text size={1} muted>
            Bulk import data from CSV or Excel files into your Sanity documents
          </Text>
        </Stack>

        {/* Steps Illustration */}
        <Flex justify="center" align="center" gap={4} wrap="wrap" paddingY={4}>
          {/* Step 1 */}
          <Stack space={3} style={{textAlign: 'center', maxWidth: 140}}>
            <Flex justify="center">
              <Box
                padding={4}
                style={{
                  backgroundColor: 'var(--card-badge-default-bg-color)',
                  borderRadius: '50%',
                }}
              >
                <DocumentIcon style={{fontSize: 28, color: 'var(--card-badge-default-fg-color)'}} />
              </Box>
            </Flex>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                1. Select & Download
              </Text>
              <Text size={0} muted>
                Choose a document type and download the template
              </Text>
            </Stack>
          </Stack>

          {/* Arrow */}
          <Text size={2} muted style={{opacity: 0.3}}>
            →
          </Text>

          {/* Step 2 */}
          <Stack space={3} style={{textAlign: 'center', maxWidth: 140}}>
            <Flex justify="center">
              <Box
                padding={4}
                style={{
                  backgroundColor: 'var(--card-badge-default-bg-color)',
                  borderRadius: '50%',
                }}
              >
                <EditIcon style={{fontSize: 28, color: 'var(--card-badge-default-fg-color)'}} />
              </Box>
            </Flex>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                2. Fill Your Data
              </Text>
              <Text size={0} muted>
                Add your data to the template file
              </Text>
            </Stack>
          </Stack>

          {/* Arrow */}
          <Text size={2} muted style={{opacity: 0.3}}>
            →
          </Text>

          {/* Step 3 */}
          <Stack space={3} style={{textAlign: 'center', maxWidth: 140}}>
            <Flex justify="center">
              <Box
                padding={4}
                style={{
                  backgroundColor: 'var(--card-badge-positive-bg-color)',
                  borderRadius: '50%',
                }}
              >
                <UploadIcon style={{fontSize: 28, color: 'var(--card-badge-positive-fg-color)'}} />
              </Box>
            </Flex>
            <Stack space={2}>
              <Text size={1} weight="semibold">
                3. Upload & Import
              </Text>
              <Text size={0} muted>
                Upload your CSV and import documents
              </Text>
            </Stack>
          </Stack>
        </Flex>

        {/* Features */}
        <Card padding={4} radius={2} tone="transparent">
          <Flex justify="center" gap={5} wrap="wrap">
            <Text size={0} muted>
              ✓ Up to 500 rows
            </Text>
            <Text size={0} muted>
              ✓ References & Images
            </Text>
            <Text size={0} muted>
              ✓ Validation preview
            </Text>
            <Text size={0} muted>
              ✓ Duplicate handling
            </Text>
          </Flex>
        </Card>

        {/* CTA */}
        <Flex justify="center">
          <Button
            text="Get Started"
            tone="primary"
            fontSize={2}
            padding={4}
            onClick={onGetStarted}
            style={{minWidth: 160}}
          />
        </Flex>
      </Stack>
    </Card>
  )
}
