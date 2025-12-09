# Sanity CSV Import Plugin - v1 Documentation

A Studio Tool plugin for bulk CSV imports with template generation, reference matching via user-selected fields, image uploads, and a multi-step wizard with validation summary.

## v1 Scope

### Features

- ✅ Studio Tool (sidebar) with document type selector
- ✅ Template download (Excel .xlsx + CSV) with tips row for formatting guidance
- ✅ Basic field types: string, number, boolean (`true/false`), date, datetime, url
- ✅ Slug fields: auto-generate from `title` if not provided
- ✅ Nested objects via dot notation (`seo.title`, `seo.description`)
- ✅ Arrays of primitives via comma-separated values (`tag1, tag2, tag3`)
- ✅ References: UI step to choose match field per reference type, GROQ lookup
- ✅ Array of references: comma-separated match values
- ✅ Images: wizard step when schema has image fields, filename matching, supports metadata (`mainImage.alt`)
- ✅ Duplicate handling: user chooses (skip / update / fail)
- ✅ Validation summary before import (valid/warning/error counts with row numbers)
- ✅ Progress UI during import with success/fail per row
- ✅ Cancel support (keeps already-created documents)
- ✅ 500 row limit
- ✅ Dates: ISO 8601 only (`YYYY-MM-DD`, `YYYY-MM-DDTHH:mm:ss`)
- ✅ Empty cells treated as `null`
- ✅ Unit tests with 60%+ coverage

### Behavior Rules

| Scenario | Behavior |
|----------|----------|
| Required field missing | Row fails, shown in validation |
| Reference not found | Row fails |
| Multiple reference matches | Use first match |
| Image not found | Warning, row uploads without image |
| Empty cell | Treated as `null` |
| Slug not provided | Auto-generate from `title` field |

## Implementation Steps

1. **Create Studio Tool shell** — Register tool via `definePlugin` with `tools` array, render panel with document type dropdown using `useSchema()`.

2. **Build schema introspection** — `src/lib/schemaUtils.ts`: extract fields, flatten nested objects to dot notation, detect types, identify image/reference fields and their target types.

3. **Implement template generator** — `src/lib/templateGenerator.ts`: generate Excel (.xlsx) and CSV with headers from schema, include tips row (date format, boolean values, comma-separation for arrays).

4. **Build reference configuration step** — UI component where user selects match field per reference type (dropdown showing target type's string fields like `email`, `slug`, `name`).

5. **Create import wizard** — Multi-step flow:
   - Step 1: Select document type + configure references
   - Step 2: Upload images (shown only if schema has image fields)
   - Step 3: Upload CSV
   - Step 4: Validation summary (✓ valid / ⚠ warnings / ✗ errors)
   - Step 5: Choose duplicate handling + Import with progress

6. **Implement CSV parser** — `src/lib/csvParser.ts`: use PapaParse, validate row count ≤500, parse with header row.

7. **Build document transformer** — `src/lib/documentTransformer.ts`: convert CSV rows to Sanity documents:
   - Reconstruct nested objects from dot notation
   - Split comma-separated values to arrays
   - Convert types (boolean, date, number)
   - Auto-generate slugs from title
   - GROQ lookup for references
   - Match image filenames to uploaded assets

8. **Add validation engine** — `src/lib/validator.ts`: check required fields, validate types, verify reference lookups, check image matches. Return structured results (valid/warning/error per row).

9. **Implement import engine** — `src/lib/importEngine.ts`: batch `createOrReplace` mutations via `useClient()`, progress callbacks, error collection, cancel support.

10. **Build progress UI** — Show real-time progress bar, success/fail counts, expandable error details with row numbers.

11. **Write unit tests** — Vitest tests for: schema introspection, template generation, CSV parsing, document transformation, validation logic. Target 60%+ coverage.

## File Structure

```
src/
├── index.ts                    # Plugin entry, definePlugin
├── tool/
│   └── CsvImportTool.tsx       # Main tool component
├── components/
│   ├── Wizard.tsx              # Multi-step wizard container
│   ├── TypeSelector.tsx        # Document type dropdown
│   ├── ReferenceConfig.tsx     # Reference match field selection
│   ├── ImageUploader.tsx       # Image upload step
│   ├── CsvUploader.tsx         # CSV file upload
│   ├── ValidationSummary.tsx   # Pre-import validation results
│   ├── ImportProgress.tsx      # Progress bar + results
│   └── DuplicateOptions.tsx    # Skip/Update/Fail selector
├── lib/
│   ├── schemaUtils.ts          # Schema introspection
│   ├── templateGenerator.ts    # Excel/CSV generation
│   ├── csvParser.ts            # CSV parsing with PapaParse
│   ├── documentTransformer.ts  # Row → Sanity document
│   ├── validator.ts            # Pre-import validation
│   └── importEngine.ts         # Batch mutations
└── __tests__/
    ├── schemaUtils.test.ts
    ├── templateGenerator.test.ts
    ├── csvParser.test.ts
    ├── documentTransformer.test.ts
    └── validator.test.ts
```

## Dependencies

### Production
- `papaparse` — CSV parsing
- `xlsx` — Excel generation

### Development
- `vitest` — Testing
- `@sanity/ui` — UI components (already available via sanity peer dep)

## Field Type Handling

### Basic Types

| Sanity Type | CSV Format | Example |
|-------------|------------|---------|
| `string` | Plain text | `Hello World` |
| `number` | Numeric | `42` or `3.14` |
| `boolean` | `true` / `false` | `true` |
| `date` | ISO 8601 | `2024-12-09` |
| `datetime` | ISO 8601 | `2024-12-09T14:30:00` |
| `url` | Valid URL | `https://example.com` |
| `slug` | Text (or auto from title) | `my-post-slug` |

### Complex Types

| Sanity Type | CSV Format | Example |
|-------------|------------|---------|
| Nested object | Dot notation columns | `seo.title`, `seo.description` |
| Array of strings | Comma-separated | `tag1, tag2, tag3` |
| Reference | Match field value | `john@example.com` (matched by email) |
| Array of references | Comma-separated match values | `cat-1, cat-2, cat-3` |
| Image | Filename (uploaded separately) | `hero.jpg` |
| Image with alt | Separate column | `mainImage` + `mainImage.alt` |

## User Workflow

1. **Open CSV Import tool** from Studio sidebar
2. **Select document type** from dropdown
3. **Configure references** — choose which field to match on for each reference type
4. **Download template** — Excel or CSV with proper headers and tips
5. **Fill template** with data
6. **Upload images** (if schema requires) — name files to match CSV values
7. **Upload CSV**
8. **Review validation summary** — see valid/warning/error counts
9. **Choose duplicate handling** — skip, update, or fail on duplicates
10. **Import** — watch progress, see results
11. **Review any failures** — row numbers and error messages shown

## Template Format

The generated template includes:

**Row 1 (Headers):** Field names in dot notation
```
title | slug | seo.title | seo.description | author→person.email | tags | mainImage | mainImage.alt
```

**Row 2 (Tips):** Formatting guidance
```
Required | Auto-generated | Optional | Optional | Reference: match by email | Comma-separated | Filename | Optional
```

**Row 3+:** Data rows for user to fill
