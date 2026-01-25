import {
  CheckmarkCircleIcon,
  CopyIcon,
  SpinnerIcon,
  TrashIcon,
  UploadIcon,
  WarningOutlineIcon,
} from '@sanity/icons'
import {Badge, Box, Button, Card, Flex, Grid, Stack, Text} from '@sanity/ui'
import {type ChangeEvent, type JSX, useCallback, useState} from 'react'
import {useClient} from 'sanity'

import {getImageFields, type SchemaField} from '../lib/schemaUtils'

/**
 * Allowed image MIME types for upload
 * Restricts uploads to common image formats for security
 */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
  'image/heic',
  'image/heif',
])

/**
 * Maximum file size in bytes (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024

/**
 * Validate that a file is an allowed image type
 */
function isValidImageFile(file: File): {valid: boolean; error?: string} {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Invalid file type: ${file.type || 'unknown'}. Allowed: JPEG, PNG, GIF, WebP, SVG, AVIF, HEIC`,
    }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1)
    return {
      valid: false,
      error: `File too large: ${sizeMB}MB. Maximum size: 10MB`,
    }
  }

  return {valid: true}
}

export interface UploadedImage {
  filename: string
  assetId: string
  url: string
}

export interface DuplicateInfo {
  filename: string
  existingIndex: number
}

export interface PendingUpload {
  filename: string
  previewUrl: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export interface ImageUploaderProps {
  schemaFields: SchemaField[]
  onImagesUploaded: (images: UploadedImage[]) => void
}

/**
 * Component for uploading images referenced in CSV data
 */
export function ImageUploader({schemaFields, onImagesUploaded}: ImageUploaderProps): JSX.Element {
  const client = useClient({apiVersion: '2024-01-01'})
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([])
  const [skippedDuplicates, setSkippedDuplicates] = useState<string[]>([])
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([])

  const imageFields = getImageFields(schemaFields)

  // Check for duplicates and validate files
  const findDuplicates = useCallback(
    (
      files: File[],
    ): {
      duplicates: DuplicateInfo[]
      newFiles: File[]
      invalidFiles: Array<{name: string; error: string}>
    } => {
      const duplicateInfos: DuplicateInfo[] = []
      const newFiles: File[] = []
      const invalidFiles: Array<{name: string; error: string}> = []
      const existingFilenames = new Set(uploadedImages.map((img) => img.filename.toLowerCase()))

      for (const file of files) {
        // Validate file type and size first
        const validation = isValidImageFile(file)
        if (!validation.valid) {
          invalidFiles.push({name: file.name, error: validation.error || 'Invalid file'})
          continue
        }

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

      return {duplicates: duplicateInfos, newFiles, invalidFiles}
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

      // Check for duplicates and validate
      const {duplicates: foundDuplicates, newFiles, invalidFiles} = findDuplicates(fileArray)

      // Show error for invalid files
      if (invalidFiles.length > 0) {
        const errorMsg = invalidFiles.map((f) => `${f.name}: ${f.error}`).join('; ')
        setError(`Some files were rejected: ${errorMsg}`)
      }

      if (foundDuplicates.length > 0) {
        setDuplicates(foundDuplicates)
        setSkippedDuplicates(foundDuplicates.map((d) => d.filename))
      }

      if (newFiles.length === 0) {
        setIsUploading(false)
        event.target.value = ''
        return
      }

      // Create preview thumbnails for all files before uploading
      const previews: PendingUpload[] = await Promise.all(
        newFiles.map(
          (file) =>
            new Promise<PendingUpload>((resolve) => {
              const reader = new FileReader()
              reader.onload = (e) => {
                resolve({
                  filename: file.name,
                  previewUrl: e.target?.result as string,
                  status: 'pending',
                })
              }
              reader.onerror = () => {
                resolve({
                  filename: file.name,
                  previewUrl: '',
                  status: 'pending',
                })
              }
              reader.readAsDataURL(file)
            }),
        ),
      )

      setPendingUploads(previews)

      const newImages: UploadedImage[] = []

      try {
        for (let i = 0; i < newFiles.length; i++) {
          const file = newFiles[i]

          // Update status to uploading
          setPendingUploads((prev) =>
            prev.map((p, idx) => (idx === i ? {...p, status: 'uploading'} : p)),
          )

          try {
            // Upload to Sanity assets
            const asset = await client.assets.upload('image', file, {
              filename: file.name,
            })

            newImages.push({
              filename: file.name,
              assetId: asset._id,
              url: asset.url,
            })

            // Update status to done
            setPendingUploads((prev) =>
              prev.map((p, idx) => (idx === i ? {...p, status: 'done'} : p)),
            )
          } catch (err) {
            // Update status to error for this specific file
            setPendingUploads((prev) =>
              prev.map((p, idx) =>
                idx === i
                  ? {...p, status: 'error', error: err instanceof Error ? err.message : 'Failed'}
                  : p,
              ),
            )
          }
        }

        setUploadedImages((prev) => [...prev, ...newImages])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload images')
      } finally {
        setIsUploading(false)
        // Clear pending uploads after a short delay to show completion
        setTimeout(() => {
          setPendingUploads([])
        }, 1500)
        // Reset input
        event.target.value = ''
      }
    },
    [client, findDuplicates],
  )

  const handleRemoveImage = useCallback((filename: string) => {
    setUploadedImages((prev) => prev.filter((img) => img.filename !== filename))
  }, [])

  /**
   * Create remove handler for a specific image
   */
  const createRemoveHandler = useCallback(
    (filename: string) => () => {
      handleRemoveImage(filename)
    },
    [handleRemoveImage],
  )

  const handleDismissDuplicateWarning = useCallback(() => {
    setDuplicates([])
    setSkippedDuplicates([])
  }, [])

  const handleContinue = useCallback(() => {
    onImagesUploaded(uploadedImages)
  }, [onImagesUploaded, uploadedImages])

  const handleSkip = useCallback(() => {
    onImagesUploaded([])
  }, [onImagesUploaded])

  // Get unique count (total uploaded minus any that might be conceptually duplicated)
  const uniqueCount = uploadedImages.length

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone="primary">
        <Stack space={3}>
          <Text weight="semibold">Upload Images</Text>
          <Text muted size={1}>
            Upload images that will be referenced in your CSV. Name your files to match the values
            you&apos;ll use in the CSV (e.g., if CSV has &quot;hero.jpg&quot; in the image column,
            upload a file named &quot;hero.jpg&quot;).
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

          {/* Pending Uploads with Thumbnails */}
          {pendingUploads.length > 0 && (
            <Stack space={3}>
              <Flex align="center" justify="space-between">
                <Text weight="semibold" size={1}>
                  Uploading...
                </Text>
                <Badge tone="caution">
                  {pendingUploads.filter((p) => p.status === 'done').length} /{' '}
                  {pendingUploads.length}
                </Badge>
              </Flex>
              <Grid columns={4} gap={2}>
                {pendingUploads.map((pending) => {
                  const getTone = () => {
                    if (pending.status === 'error') return 'critical'
                    if (pending.status === 'done') return 'positive'
                    return 'default'
                  }
                  return (
                    <Card key={pending.filename} padding={2} radius={2} shadow={1} tone={getTone()}>
                      <Stack space={2}>
                        <Box
                          style={{
                            position: 'relative',
                            width: '100%',
                            height: '60px',
                            backgroundImage: pending.previewUrl
                              ? `url(${pending.previewUrl})`
                              : undefined,
                            backgroundColor: pending.previewUrl
                              ? undefined
                              : 'var(--card-bg2-color)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          {/* Overlay for uploading/pending state */}
                          {(pending.status === 'pending' || pending.status === 'uploading') && (
                            <Box
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              {pending.status === 'uploading' && (
                                <SpinnerIcon
                                  style={{
                                    color: 'white',
                                    fontSize: '24px',
                                    animation: 'spin 1s linear infinite',
                                  }}
                                />
                              )}
                            </Box>
                          )}
                          {/* Checkmark for completed */}
                          {pending.status === 'done' && (
                            <Box
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                backgroundColor: 'var(--card-positive-bg-color)',
                                borderRadius: '50%',
                                padding: '2px',
                              }}
                            >
                              <CheckmarkCircleIcon
                                style={{color: 'var(--card-positive-fg-color)'}}
                              />
                            </Box>
                          )}
                          {/* Error indicator */}
                          {pending.status === 'error' && (
                            <Box
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                backgroundColor: 'var(--card-critical-bg-color)',
                                borderRadius: '50%',
                                padding: '2px',
                              }}
                            >
                              <WarningOutlineIcon
                                style={{color: 'var(--card-critical-fg-color)'}}
                              />
                            </Box>
                          )}
                        </Box>
                        <Text
                          size={0}
                          muted={pending.status === 'pending'}
                          style={{
                            wordBreak: 'break-all',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {pending.filename}
                        </Text>
                      </Stack>
                    </Card>
                  )
                })}
              </Grid>
              <style>
                {`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </Stack>
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
                            onClick={createRemoveHandler(img.filename)}
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
