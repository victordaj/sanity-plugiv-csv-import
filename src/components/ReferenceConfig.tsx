import {Box, Button, Card, Grid, Select, Stack, Text} from '@sanity/ui'
import {type ChangeEvent, type JSX, useCallback, useMemo, useState} from 'react'
import {type Schema} from 'sanity'

import {getMatchableFields, getReferenceFields, type SchemaField} from '../lib/schemaUtils'

export interface ReferenceMatchConfig {
  fieldPath: string
  targetType: string
  matchField: string
}

export interface ReferenceConfigProps {
  schemaFields: SchemaField[]
  schema: Schema
  onConfigured: (mappings: ReferenceMatchConfig[]) => void
}

interface ReferenceFieldConfig {
  field: SchemaField
  targetType: string
  matchField: string
  availableMatchFields: SchemaField[]
}

/**
 * Component for configuring how reference fields are matched during import
 */
export function ReferenceConfig({
  schemaFields,
  schema,
  onConfigured,
}: ReferenceConfigProps): JSX.Element {
  /**
   * Initialize reference field configurations based on schema
   * Using useMemo to avoid recalculation on every render
   */
  const initialConfigs = useMemo((): ReferenceFieldConfig[] => {
    const referenceFields = getReferenceFields(schemaFields)
    return referenceFields.map((field) => {
      const targetTypes = field.referenceTarget || []
      const firstTarget = targetTypes[0] || ''
      const matchFields = firstTarget ? getMatchableFields(schema, firstTarget) : []

      return {
        field,
        targetType: firstTarget,
        matchField: matchFields[0]?.path || '',
        availableMatchFields: matchFields,
      }
    })
  }, [schemaFields, schema])

  const [configs, setConfigs] = useState<ReferenceFieldConfig[]>(initialConfigs)

  /**
   * Handle target type selection change
   */
  const handleTargetTypeChange = useCallback(
    (index: number, targetType: string) => {
      setConfigs((prev) => {
        const updated = [...prev]
        const matchFields = getMatchableFields(schema, targetType)
        updated[index] = {
          ...updated[index],
          targetType,
          matchField: matchFields[0]?.path || '',
          availableMatchFields: matchFields,
        }
        return updated
      })
    },
    [schema],
  )

  /**
   * Handle match field selection change
   */
  const handleMatchFieldChange = useCallback((index: number, matchField: string) => {
    setConfigs((prev) => {
      const updated = [...prev]
      updated[index] = {
        ...updated[index],
        matchField,
      }
      return updated
    })
  }, [])

  /**
   * Create select change handler for target type
   */
  const createTargetTypeHandler = useCallback(
    (index: number) => (e: ChangeEvent<HTMLSelectElement>) => {
      handleTargetTypeChange(index, e.target.value)
    },
    [handleTargetTypeChange],
  )

  /**
   * Create select change handler for match field
   */
  const createMatchFieldHandler = useCallback(
    (index: number) => (e: ChangeEvent<HTMLSelectElement>) => {
      handleMatchFieldChange(index, e.target.value)
    },
    [handleMatchFieldChange],
  )

  const handleContinue = useCallback(() => {
    const mappings: ReferenceMatchConfig[] = configs
      .filter((c) => c.targetType && c.matchField)
      .map((c) => ({
        fieldPath: c.field.path,
        targetType: c.targetType,
        matchField: c.matchField,
      }))
    onConfigured(mappings)
  }, [configs, onConfigured])

  const isValid = configs.every((c) => c.targetType && c.matchField)

  return (
    <Stack space={4}>
      <Card padding={4} radius={2} tone="primary">
        <Stack space={3}>
          <Text weight="semibold">Configure Reference Fields</Text>
          <Text muted size={1}>
            For each reference field, select which field to use for matching. The CSV will contain
            values that will be looked up in the referenced documents.
          </Text>
        </Stack>
      </Card>

      {configs.length === 0 ? (
        <Card padding={4} radius={2} tone="caution">
          <Text>No reference fields found in this document type.</Text>
        </Card>
      ) : (
        <Stack space={4}>
          {configs.map((config, index) => (
            <Card key={config.field.path} padding={4} radius={2} shadow={1}>
              <Stack space={3}>
                <Text weight="semibold">
                  {config.field.title || config.field.name}
                  {config.field.isArray && ' (array)'}
                </Text>
                <Text muted size={1} style={{fontFamily: 'monospace'}}>
                  Field: {config.field.path}
                </Text>

                <Grid columns={2} gap={3}>
                  <Box>
                    <Stack space={2}>
                      <Text size={1} weight="medium">
                        Target Type
                      </Text>
                      <Select
                        fontSize={1}
                        padding={2}
                        value={config.targetType}
                        onChange={createTargetTypeHandler(index)}
                      >
                        <option value="">Select type...</option>
                        {config.field.referenceTarget?.map((target) => (
                          <option key={target} value={target}>
                            {target}
                          </option>
                        ))}
                      </Select>
                    </Stack>
                  </Box>

                  <Box>
                    <Stack space={2}>
                      <Text size={1} weight="medium">
                        Match By Field
                      </Text>
                      <Select
                        fontSize={1}
                        padding={2}
                        value={config.matchField}
                        onChange={createMatchFieldHandler(index)}
                        disabled={!config.targetType}
                      >
                        <option value="">Select field...</option>
                        {config.availableMatchFields.map((f) => (
                          <option key={f.path} value={f.path}>
                            {f.path} ({f.type})
                          </option>
                        ))}
                      </Select>
                    </Stack>
                  </Box>
                </Grid>

                {config.targetType && config.matchField && (
                  <Card padding={2} radius={2} tone="positive">
                    <Text size={1}>
                      CSV column:{' '}
                      <code>
                        {config.field.path}→{config.targetType}.{config.matchField}
                      </code>
                    </Text>
                  </Card>
                )}
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      <Box>
        <Button
          fontSize={2}
          padding={3}
          text="Continue"
          tone="primary"
          onClick={handleContinue}
          disabled={!isValid}
        />
      </Box>
    </Stack>
  )
}
