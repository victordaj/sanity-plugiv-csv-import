import {
  CheckmarkCircleIcon,
  CopyIcon,
  TrashIcon,
  UploadIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import {Badge, Box, Button, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {type ChangeEvent, useCallback, useState} from 'react'
import {useClient} from 'sanity'

import {getImageFields, type SchemaField} from '../lib/schemaUtils'

export interface UploadedImage {
  filename: string
  assetId: string
  url: string
}

export interface DuplicateInfo {
  filename: string
  existingIndex: number
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
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([])

  const imageFields = getImageFields(schemaFields)

  // Check for duplicates in the file list
  const findDuplicates = useCallback(
    (files: File[]): {duplicates: DuplicateInfo[]; newFiles: File[]} => {
      const duplicateInfos: DuplicateInfo[] = []
      const newFiles: File[] = []
      const existingFilenames = new Set(uploadedImages.map((img) => img.filename.toLowerCase()))

      for (const file of files) {
        const lowerFilename = file.name.toLowerCase()
        const existingIndex = uploadedImages.findIndex(
          (img) => img.filename.toLowerCase() === lowerFilename,
        )

        if (existingIndex !== -1) {
          duplicateInfos.push({
            filename: file.name,
            existingIndex,
          })
        } else if (existingFilenames.has(lowerFilename)) {
          // Already processed in this batch
          duplicateInfos.push({
            filename: file.name,
            existingIndex: -1,
          })
        } else {
          existingFilenames.add(lowerFilename)
          newFiles.push(file)
        }
      }

      return {duplicates: duplicateInfos, newFiles}
    },
    [uploadedImages],
  )

  const handleFileSelect = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (!files || files.length === 0) return

      setIsUploading(true)
      setError(null)
      setDuplicates([])
      setSkippedDuplicates([])

      const fileArray = Array.from(files)

      // Check for duplicates
      const {duplicates: foundDuplicates, newFiles} = findDuplicates(fileArray)

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates)
        setSkippedDuplicates(foundDuplicates.map((d) => d.filename))
      }

      if (newFiles.length === 0) {
        setIsUploading(false)
        event.target.value = ''
        return
      }

      const newImages: UploadedImage[] = []

      try {
        for (const file of newFiles) {
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
    [client, findDuplicates],
  )

  const handleRemoveImage = useCallback((filename: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.filename !== filename))
  }, [])

  const handleDismissDuplicateWarning = useCallback(() => {
    setDuplicates([])
    setSkippedDuplicates([])
  }, [])

  const handleContinue = () => {
    onImagesUploaded(uploadedImages)
  }

  const handleSkip = () => {
    onImagesUploaded([])
  }

  // Get unique count (total uploaded minus any that might be conceptually duplicated)
  const uniqueCount = uploadedImages.length

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
            <Flex align="center" gap={2}>
              <Text muted size={1}>
                {uniqueCount} image(s) uploaded
              </Text>
              {uniqueCount > 0 && (
                <Badge tone="positive" fontSize={0}>
                  Ready
                </Badge>
              )}
            </Flex>
          </Flex>

          {error && (
            <Card padding={3} radius={2} tone="critical">
              <Text size={1}>{error}</Text>
            </Card>
          )}

          {/* Duplicate Warning */}
          {duplicates.length > 0 && (
            <Card padding={4} radius={2} tone="caution">
              <Stack space={3}>
                <Flex align="center" gap={2}>
                  <WarningOutlineIcon />
                  <Text weight="semibold" size={1}>
                    Duplicate Images Detected
                  </Text>
                  <Badge tone="caution" fontSize={0}>
                    {duplicates.length} skipped
                  </Badge>
                </Flex>
                <Text size={1} muted>
                  The following files were skipped because images with the same name already exist:
                </Text>
                <Box
                  style={{
                    maxHeight: '120px',
                    overflowY: 'auto',
                    padding: '8px',
                    backgroundColor: 'var(--card-bg2-color)',
                    borderRadius: '4px',
                  }}
                >
                  <Stack space={2}>
                    {skippedDuplicates.map((filename) => (
                      <Flex key={filename} align="center" gap={2}>
                        <CopyIcon style={{color: 'var(--card-muted-fg-color)', flexShrink: 0}} />
                        <Text size={1} style={{fontFamily: 'monospace'}}>
                          {filename}
                        </Text>
                      </Flex>
                    ))}
                  </Stack>
                </Box>
                <Flex justify="flex-end">
                  <Button
                    fontSize={1}
                    mode="ghost"
                    padding={2}
                    text="Dismiss"
                    onClick={handleDismissDuplicateWarning}
                  />
                </Flex>
              </Stack>
            </Card>
          )}

          {uploadedImages.length > 0 && (
            <Stack space={3}>
              <Flex align="center" justify="space-between">
                <Text weight="semibold" size={1}>
                  Uploaded Images
                </Text>
                <Badge>{uploadedImages.length}</Badge>
              </Flex>
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
                            title="Remove image"
                          />
                        </Flex>
                      </Stack>
                    </Card>
                  ))}
                </Grid>
              </Box>
            </Stack>
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
