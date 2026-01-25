# Test Data for CSV Import Plugin

This directory contains sample CSV files for testing the Sanity CSV Import plugin.

## Files

### Basic Content Types

- **`articles.csv`** - 10 blog articles with title, slug, excerpt, body, date, and featured flag
- **`authors.csv`** - 5 authors with name, email, bio, role, and social handle
- **`products.csv`** - 10 products with name, description, price, SKU, image references, and stock status
- **`events.csv`** - 8 events with dates, locations, capacity, and registration URLs

### Testing Specific Features

- **`posts-with-authors.csv`** - Articles with author references (for testing reference matching by email)
- **`gallery-images.csv`** - Photos with image fields (for testing image upload/matching)
- **`duplicate-images-test.csv`** - Products with intentionally shared/duplicate image filenames (for testing duplicate detection)
- **`large-dataset.csv`** - 50 task items (for testing pagination in table preview)

## Test Scenarios

### Table Preview (CsvPreview component)
- Use `large-dataset.csv` to test pagination (shows 10 rows per page)
- Use `articles.csv` to test value truncation (body field is long)

### Live Row Progress (ImportProgress component)
- Use `products.csv` or `large-dataset.csv` to see row-by-row progress during import

### Duplicate Image Detection (ImageUploader component)
1. Upload all images referenced in `duplicate-images-test.csv`
2. Try uploading some of the same images again
3. Verify the duplicate warning appears with correct filenames

### Reference Matching (ReferenceConfig component)
1. First import `authors.csv` as author documents
2. Then import `posts-with-authors.csv` with reference matching configured to match `author` field by `email`

## Creating Test Images

For testing image uploads, create placeholder images with these filenames:

```bash
# Products
touch headphones.jpg tshirt.jpg bottle.jpg keyboard.jpg yogamat.jpg
touch mugs.jpg wallet.jpg shoes.jpg smartwatch.jpg cuttingboard.jpg

# Gallery
touch sunrise.jpg skyline.jpg forest.jpg beach-sunset.jpg market.jpg
touch winter-lake.jpg neon.jpg desert.jpg coffee-shop.jpg autumn.jpg

# Duplicate test images
touch alpha-main.jpg alpha-thumb.jpg alpha-1.jpg alpha-2.jpg alpha-3.jpg
touch beta-main.jpg beta-1.jpg beta-2.jpg beta-3.jpg
touch gamma-thumb.jpg gamma-1.jpg gamma-2.jpg
touch delta-main.jpg delta-thumb.jpg delta-1.jpg delta-2.jpg delta-3.jpg
touch epsilon-3.jpg
```

Or use actual images by downloading sample images and renaming them to match.
