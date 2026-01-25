# sanity-plugin-csv-import

A Sanity Studio tool for bulk importing CSV data into your content lake.

![CSV Import Screenshot](https://via.placeholder.com/800x400?text=CSV+Import+Tool)

## Features

- **Step-by-step wizard** - Guided import process with validation at each step
- **Template generation** - Download CSV templates based on your schema
- **Smart field mapping** - Automatically maps CSV columns to document fields
- **Reference handling** - Match CSV values to existing documents by any field
- **Image uploads** - Import images from URLs directly into Sanity assets
- **Duplicate detection** - Skip, update, or create duplicates based on your preference
- **Validation preview** - See errors and warnings before importin
- **Progress tracking** - Real-time feedback during import

## Installation

```sh
npm install sanity-plugin-csv-import
```

## Setup

Add the plugin to your `sanity.config.ts`:

```ts
import {defineConfig} from 'sanity'
import {csvImportTool} from 'sanity-plugin-csv-import'

export default defineConfig({
  // ...
  plugins: [csvImportTool()],
})
```

The CSV Import tool will appear in your Studio's tool menu.

## Usage

### 1. Select document type

Choose which document type you want to import data into.

### 2. Download template (optional)

Click "Download CSV Template" to get a pre-formatted CSV with all the fields for your selected type. This ensures your columns match the expected schema.

### 3. Upload CSV

Drag and drop your CSV file or click to browse. The plugin accepts `.csv` files with comma, semicolon, or tab delimiters.

### 4. Configure references

If your schema has reference fields, map which CSV column contains the lookup value and which field to match against in the referenced documents.

For example, if importing blog posts with an `author` reference:
- CSV column: `author_email`
- Match field: `email`

The plugin will find existing author documents where `email` matches your CSV value.

### 5. Handle duplicates

Choose how to handle rows that match existing documents:
- **Skip** - Don't import matching rows
- **Update** - Merge new data into existing documents
- **Create** - Always create new documents

### 6. Review and import

Preview validation results, then start the import. Watch progress in real-time and review any errors when complete.

## CSV Format

### Basic fields

```csv
title,slug,description
My Post,my-post,A description here
```

### Nested fields

Use dot notation for nested objects:

```csv
title,seo.title,seo.description
My Post,SEO Title,Meta description
```

### Arrays

Separate array values with `|`:

```csv
title,tags
My Post,tech|tutorial|sanity
```

### References

Include a column with the lookup value:

```csv
title,author_email
My Post,john@example.com
```

Then configure the reference mapping in step 4.

### Images

Provide public URLs - the plugin will download and upload them as Sanity assets:

```csv
title,mainImage
My Post,https://example.com/image.jpg
```

## Requirements

- Sanity Studio v3
- Node.js 18+

## License

MIT © Daj Victor

---

## Development

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit) for development tooling.

```sh
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Link for local development
npm run link-watch
```

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio) for local development setup.

### Releasing

Run the ["CI & Release" workflow](https://github.com/victordaj/sanity-plugiv-csv-import/actions/workflows/main.yml) from GitHub Actions. Select the main branch and check "Release new version".

Releases follow [semantic versioning](https://semver.org/) based on [conventional commits](https://www.conventionalcommits.org/).
