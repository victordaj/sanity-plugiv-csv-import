import {TrashIcon, UploadIcon} from '@sanity/icons'
import {Box, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {useCallback, useRef, useState} from 'react'
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
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const imageFields = getImageFields(schemaFields)

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
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

        const updated = [...uploadedImages, ...newImages]
        setUploadedImages(updated)
        // Auto-notify parent when images are uploaded
        onImagesUploaded(updated)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload images')
      } finally {
        setIsUploading(false)
      }
    },
    [client, uploadedImages, onImagesUploaded],
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      if (files) {
        uploadFiles(files)
      }
      // Reset input for re-upload
      event.target.value = ''
    },
    [uploadFiles],
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files.length > 0) {
        // Filter to only images
        const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'))
        if (imageFiles.length > 0) {
          uploadFiles(imageFiles)
        }
      }
    },
    [uploadFiles],
  )

  const handleRemoveImage = useCallback(
    (filename: string) => {
      const updated = uploadedImages.filter((img) => img.filename !== filename)
      setUploadedImages(updated)
      onImagesUploaded(updated)
    },
    [uploadedImages, onImagesUploaded],
  )

  const handleDropZoneClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <Stack space={3}>
      <Text muted size={1}>
        Upload images that match filenames in your CSV (e.g., "hero.jpg")
      </Text>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{display: 'none'}}
        disabled={isUploading}
      />

      {/* Drop zone */}
      <Card
        padding={4}
        radius={2}
        tone={isDragging ? 'primary' : 'transparent'}
        style={{
          border: isDragging
            ? '2px solid var(--card-focus-ring-color)'
            : '2px dashed var(--card-border-color)',
          cursor: isUploading ? 'wait' : 'pointer',
          transition: 'all 0.15s ease',
        }}
        onClick={handleDropZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Flex align="center" justify="center" gap={3}>
          <UploadIcon style={{fontSize: '1.5em', opacity: 0.5}} />
          <Text muted size={1}>
            {isUploading ? 'Uploading...' : 'Click or drop images here'}
          </Text>
        </Flex>
      </Card>

      {error && (
        <Card padding={3} radius={2} tone="critical">
          <Text size={1}>{error}</Text>
        </Card>
      )}

      {/* Uploaded images grid */}
      {uploadedImages.length > 0 && (
        <Box style={{maxHeight: '240px', overflowY: 'auto'}}>
          <Grid columns={3} gap={3}>
            {uploadedImages.map((img) => (
              <Card key={img.filename} padding={2} radius={2} tone="positive">
                <Stack space={2}>
                  <Box
                    style={{
                      width: '100%',
                      aspectRatio: '4/3',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={`${img.url}?w=200&h=150&fit=crop`}
                      alt={img.filename}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        backgroundColor: 'var(--card-bg2-color)',
                      }}
                    />
                  </Box>
                  <Flex align="center" justify="space-between" gap={1}>
                    <Text size={0} style={{wordBreak: 'break-all', flex: 1}} title={img.filename}>
                      {img.filename.length > 15 ? `${img.filename.slice(0, 12)}...` : img.filename}
                    </Text>
                    <Box
                      style={{cursor: 'pointer', opacity: 0.6}}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRemoveImage(img.filename)
                      }}
                    >
                      <TrashIcon />
                    </Box>
                  </Flex>
                </Stack>
              </Card>
            ))}
          </Grid>
        </Box>
      )}

      {/* Show image fields info */}
      {imageFields.length > 0 && (
        <Text muted size={0}>
          Fields: {imageFields.map((f) => f.path).join(', ')}
        </Text>
      )}
    </Stack>
  )
}
