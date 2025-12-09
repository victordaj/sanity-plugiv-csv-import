import {type ObjectField, type Schema, type SchemaType} from 'sanity'

export interface ArrayOfType {
  type: string
}

export interface SchemaField {
  name: string
  path: string
  type: string
  title: string
  required: boolean
  isArray: boolean
  isReference: boolean
  isImage: boolean
  referenceTarget?: string[]
  referenceTo?: string // Single reference target for convenience
  fields?: SchemaField[]
  of?: ArrayOfType[] // Array item types
}

/**
 * Extract fields from a document type schema, flattening nested objects
 * to dot notation (e.g., seo.title, seo.description)
 */
export function getSchemaFields(schema: Schema, typeName: string): SchemaField[] {
  const schemaType = schema.get(typeName)
  if (!schemaType) {
    return []
  }

  return extractFields(schemaType, '', schema)
}

function extractFields(schemaType: SchemaType, parentPath: string, schema: Schema): SchemaField[] {
  const fields: SchemaField[] = []

  // Handle document and object types
  const typeFields = (schemaType as {fields?: ObjectField[]}).fields || []

  for (const field of typeFields) {
    const fieldPath = parentPath ? `${parentPath}.${field.name}` : field.name
    const fieldType = resolveFieldType(field, schema)

    // Skip internal Sanity fields
    if (field.name.startsWith('_')) {
      continue
    }

    const schemaField = createSchemaField(field, fieldPath, fieldType, schema)
    fields.push(schemaField)

    // If it's an object type (not reference, not image), flatten its fields
    if (fieldType === 'object' && !schemaField.isReference && !schemaField.isImage) {
      const nestedType = resolveType(field.type, schema)
      if (nestedType && 'fields' in nestedType) {
        const nestedFields = extractFields(nestedType as SchemaType, fieldPath, schema)
        fields.push(...nestedFields)
      }
    }
  }

  return fields
}

function resolveFieldType(field: ObjectField, schema: Schema): string {
  const type = field.type
  if (typeof type === 'string') {
    return type
  }
  if (typeof type === 'object' && type !== null) {
    if ('name' in type && typeof type.name === 'string') {
      return type.name
    }
    if ('type' in type && typeof type.type === 'string') {
      return type.type
    }
    // Handle jsonType for primitives
    if ('jsonType' in type && typeof type.jsonType === 'string') {
      return type.jsonType
    }
  }
  return 'unknown'
}

function resolveType(type: unknown, schema: Schema): SchemaType | null {
  if (typeof type === 'string') {
    return schema.get(type) || null
  }
  if (typeof type === 'object' && type !== null && 'name' in type) {
    const typeName = (type as {name: string}).name
    return schema.get(typeName) || (type as SchemaType)
  }
  return type as SchemaType | null
}

function createSchemaField(
  field: ObjectField,
  fieldPath: string,
  fieldType: string,
  schema: Schema,
): SchemaField {
  const isArray = fieldType === 'array'
  const isReference = fieldType === 'reference' || isArrayOfReferences(field, schema)
  const isImage = fieldType === 'image' || isArrayOfImages(field, schema)

  let referenceTarget: string[] | undefined
  if (isReference) {
    referenceTarget = getReferenceTargets(field, schema)
  }

  // Get the underlying type for arrays
  let actualType = fieldType
  let arrayOf: ArrayOfType[] | undefined
  if (isArray) {
    actualType = getArrayItemType(field, schema)
    arrayOf = [{type: actualType}]
  }

  return {
    name: field.name,
    path: fieldPath,
    type: actualType,
    title: getFieldTitle(field),
    required: isFieldRequired(field),
    isArray,
    isReference,
    isImage,
    referenceTarget,
    referenceTo: referenceTarget?.[0],
    of: arrayOf,
  }
}

function getFieldTitle(field: ObjectField): string {
  if (typeof field.type === 'object' && field.type !== null && 'title' in field.type) {
    return (field.type as {title?: string}).title || field.name
  }
  return field.name
}

function isFieldRequired(field: ObjectField): boolean {
  if (typeof field.type === 'object' && field.type !== null) {
    const type = field.type as {validation?: unknown}
    // Check for required validation rule
    if (type.validation) {
      // This is a simplified check - in reality, validation rules are more complex
      return String(type.validation).includes('required')
    }
  }
  return false
}

function isArrayOfReferences(field: ObjectField, _schema: Schema): boolean {
  const type = field.type
  if (typeof type === 'object' && type !== null && 'of' in type) {
    const ofTypes = (type as {of: unknown[]}).of
    return ofTypes.some((ofType) => {
      if (typeof ofType === 'object' && ofType !== null && 'type' in ofType) {
        return (ofType as {type: string}).type === 'reference'
      }
      return false
    })
  }
  return false
}

function isArrayOfImages(field: ObjectField, _schema: Schema): boolean {
  const type = field.type
  if (typeof type === 'object' && type !== null && 'of' in type) {
    const ofTypes = (type as {of: unknown[]}).of
    return ofTypes.some((ofType) => {
      if (typeof ofType === 'object' && ofType !== null && 'type' in ofType) {
        return (ofType as {type: string}).type === 'image'
      }
      return false
    })
  }
  return false
}

function getReferenceTargets(field: ObjectField, _schema: Schema): string[] {
  const type = field.type

  // Direct reference field
  if (typeof type === 'object' && type !== null && 'to' in type) {
    const toTypes = (type as {to: unknown[]}).to
    return toTypes
      .map((to) => {
        if (typeof to === 'object' && to !== null && 'type' in to) {
          return (to as {type: string}).type
        }
        return null
      })
      .filter((t): t is string => t !== null)
  }

  // Array of references
  if (typeof type === 'object' && type !== null && 'of' in type) {
    const ofTypes = (type as {of: unknown[]}).of
    const targets: string[] = []
    for (const ofType of ofTypes) {
      if (typeof ofType === 'object' && ofType !== null && 'to' in ofType) {
        const toTypes = (ofType as {to: unknown[]}).to
        for (const to of toTypes) {
          if (typeof to === 'object' && to !== null && 'type' in to) {
            targets.push((to as {type: string}).type)
          }
        }
      }
    }
    return targets
  }

  return []
}

function getArrayItemType(field: ObjectField, _schema: Schema): string {
  const type = field.type
  if (typeof type === 'object' && type !== null && 'of' in type) {
    const ofTypes = (type as {of: unknown[]}).of
    if (ofTypes.length > 0) {
      const firstType = ofTypes[0]
      if (typeof firstType === 'object' && firstType !== null && 'type' in firstType) {
        return (firstType as {type: string}).type
      }
      if (typeof firstType === 'string') {
        return firstType
      }
    }
  }
  return 'unknown'
}

/**
 * Check if schema fields contain any image fields
 */
export function hasImageFields(fields: SchemaField[]): boolean {
  return fields.some((field) => field.isImage)
}

/**
 * Check if schema fields contain any reference fields
 */
export function hasReferenceFields(fields: SchemaField[]): boolean {
  return fields.some((field) => field.isReference)
}

/**
 * Get only the top-level fields (non-nested)
 */
export function getTopLevelFields(fields: SchemaField[]): SchemaField[] {
  return fields.filter((field) => !field.path.includes('.'))
}

/**
 * Get fields for a specific type that can be used as reference match fields
 * (string fields that are likely to be unique identifiers)
 */
export function getMatchableFields(schema: Schema, typeName: string): SchemaField[] {
  const fields = getSchemaFields(schema, typeName)
  return fields.filter(
    (field) =>
      field.type === 'string' ||
      field.type === 'slug' ||
      field.type === 'email' ||
      field.type === 'url',
  )
}

/**
 * Get image fields from schema
 */
export function getImageFields(fields: SchemaField[]): SchemaField[] {
  return fields.filter((field) => field.isImage)
}

/**
 * Get reference fields from schema
 */
export function getReferenceFields(fields: SchemaField[]): SchemaField[] {
  return fields.filter((field) => field.isReference)
}
