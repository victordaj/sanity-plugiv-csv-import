import {CheckmarkCircleIcon, TrashIcon, UploadIcon} from '@sanity/icons'
import {Box, Button, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import React, {useCallback, useState} from 'react'
import {useClient} from 'sanity'

import {getImageFields, type SchemaField} from '../lib/schemaUtils'

export interface UploadedImage {
  filename: string
  assetId: string
  url: string
}

export interface ImageUploaderProps {
  schemaFields: SchemaField[]
  onImagesUploaded: (images: UploadedImage[]) => void
}

export function ImageUploader({schemaFields, onImagesUploaded}: ImageUploaderProps) {
  const client = useClient({apiVersion: '2024-01-01'})
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const imageFields = getImageFields(schemaFields)

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      setIsUploading(true)
      setError(null)

      const newImages: UploadedImage[] = []

      try {
        for (const file of Array.from(files)) {
          // Upload to Sanity assets
          const asset = await client.assets.upload('image', file, {
            filename: file.name,
          })

          newImages.push({
            filename: file.name,
            assetId: asset._id,
            url: asset.url,
          })
        }

        setUploadedImages((prev) => [...prev, ...newImages])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload images')
      } finally {
        setIsUploading(false)
        // Reset input
        event.target.value = ''
      }
    },
    [client],
  )

  const handleRemoveImage = useCallback((filename: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.filename !== filename))
  }, [])

  const handleContinue = () => {
    onImagesUploaded(uploadedImages)
  }

  const handleSkip = () => {
    onImagesUploaded([])
  }

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone="primary">
        <Stack space={3}>
          <Text weight="semibold">Upload Images</Text>
          <Text muted size={1}>
            Upload images that will be referenced in your CSV. Name your files to match the values
            you'll use in the CSV (e.g., if CSV has "hero.jpg" in the image column, upload a file
            named "hero.jpg").
          </Text>
        </Stack>
      </Card>

      <Card padding={4} radius={2} shadow={1}>
        <Stack space={3}>
          <Text weight="semibold" size={1}>
            Image Fields in Schema
          </Text>
          {imageFields.map((field) => (
            <Text key={field.path} size={1} style={{fontFamily: 'monospace'}}>
              • {field.path}
              {field.isArray && ' (array)'}
              {field.required && ' (required)'}
            </Text>
          ))}
        </Stack>
      </Card>

      <Card padding={4} radius={2} shadow={1}>
        <Stack space={4}>
          <Flex align="center" gap={3}>
            <Box style={{position: 'relative'}}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer',
                }}
                disabled={isUploading}
              />
              <Button
                fontSize={1}
                icon={UploadIcon}
                mode="ghost"
                padding={3}
                text={isUploading ? 'Uploading...' : 'Select Images'}
                disabled={isUploading}
              />
            </Box>
            <Text muted size={1}>
              {uploadedImages.length} image(s) uploaded
            </Text>
          </Flex>

          {error && (
            <Card padding={3} radius={2} tone="critical">
              <Text size={1}>{error}</Text>
            </Card>
          )}

          {uploadedImages.length > 0 && (
            <Box
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              <Grid columns={3} gap={3}>
                {uploadedImages.map((img) => (
                  <Card key={img.filename} padding={2} radius={2} shadow={1}>
                    <Stack space={2}>
                      <Box
                        style={{
                          width: '100%',
                          height: '80px',
                          backgroundImage: `url(${img.url}?w=200)`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderRadius: '4px',
                        }}
                      />
                      <Flex align="center" justify="space-between">
                        <Text size={0} style={{wordBreak: 'break-all'}}>
                          {img.filename}
                        </Text>
                        <Button
                          icon={TrashIcon}
                          mode="bleed"
                          padding={1}
                          tone="critical"
                          onClick={() => handleRemoveImage(img.filename)}
                        />
                      </Flex>
                    </Stack>
                  </Card>
                ))}
              </Grid>
            </Box>
          )}
        </Stack>
      </Card>

      <Flex gap={3}>
        <Button
          fontSize={2}
          icon={CheckmarkCircleIcon}
          padding={3}
          text={`Continue with ${uploadedImages.length} image(s)`}
          tone="primary"
          onClick={handleContinue}
        />
        <Button fontSize={2} mode="ghost" padding={3} text="Skip Images" onClick={handleSkip} />
      </Flex>
    </Stack>
  )
}
