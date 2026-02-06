# Testing the Image Carousel

## Quick Test Guide

### Step 1: Create an Invoice with Multiple Images

1. Open http://localhost:3001/dashboard/create-invoice
2. Fill in the form:
   - Product Name: "Test Multi-Image Invoice"
   - Description: "Testing the beautiful image carousel"
   - Price: 100
   - Currency: EUR

3. Upload multiple images (2-5 images):
   - You can drag and drop images
   - Or click to select files
   - Support for JPG, PNG, GIF, WebP
   - Max 5 images

4. Click "Create Invoice"

### Step 2: View the Carousel

1. You'll be redirected to the invoice success page
2. Click "View Invoice" or navigate to the invoice detail page
3. The carousel will display with:
   - Main large image (perfectly fitted)
   - Navigation arrows (appear on hover)
   - Image counter (top right)
   - Zoom indicator (bottom left, on hover)
   - Thumbnail strip (below main image)

### Step 3: Test Features

**Navigation:**
- Click left/right arrows to navigate
- Click thumbnails to jump to specific image
- On mobile: swipe left/right

**Zoom:**
- Click the main image to zoom in 1.5x
- Click again to zoom out

**Auto-Advance:**
- Images automatically change every 5 seconds
- Pauses when you zoom in
- Resumes when you zoom out

**Mobile:**
- Swipe gestures work perfectly
- Thumbnails scroll horizontally
- Touch-friendly controls

## Sample Images to Test

You can use these free stock image sources:

1. **Unsplash**: https://source.unsplash.com/800x600/?product
2. **Picsum Photos**: https://picsum.photos/800/600
3. **Placeholder.com**: https://via.placeholder.com/800x600

Or take screenshots and upload them!

## Expected Behavior

✅ **Perfect Fit**: Images never crop or stretch - they fit perfectly
✅ **Smooth Navigation**: Buttery smooth transitions
✅ **Active State**: Current thumbnail highlighted with blue ring
✅ **Dark Mode**: Fully styled in both light and dark themes
✅ **Loading**: Graceful loading states
✅ **No Images**: Shows nice placeholder when no images

## Common Issues & Solutions

**Issue**: Images appear zoomed in
**Solution**: ✅ Fixed! Using object-contain ensures perfect fit

**Issue**: Can't scroll thumbnails
**Solution**: Thumbnails scroll horizontally automatically

**Issue**: Auto-advance too fast/slow
**Solution**: Currently set to 5 seconds, configurable in ImageCarousel.tsx

**Issue**: Images not uploading
**Solution**: Check file size (should be reasonable for base64 storage)

## Database Check

After creating an invoice, you can verify the images are stored:

```sql
-- Check if images array is populated
SELECT id, name, images FROM products WHERE id = 'your-invoice-id';

-- Should return something like:
-- images: ["data:image/jpeg;base64,...", "data:image/png;base64,..."]
```

## Future Enhancements (Optional)

- [ ] Upload to Cloudflare R2 instead of base64
- [ ] Lazy loading for performance
- [ ] Image compression before upload
- [ ] Fullscreen lightbox mode
- [ ] Share individual images
- [ ] Image captions/descriptions
