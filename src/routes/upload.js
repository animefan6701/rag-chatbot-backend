import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extractText } from '../parse.js';
import { chunkText } from '../chunker.js';
import { embedBatch } from '../embeddings.js';
import { db } from '../db.js';
import { sb, uploadBuffer } from '../storage.js';
import fs from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';
import pdf from 'pdf-parse';
import JSZip from 'jszip';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

const upload = multer({ dest: 'uploads/' });
const router = Router();

// Helper function to determine if we should convert image format
function shouldConvertImage(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  // Convert PPM and PBM to PNG for better web compatibility
  return ext === '.ppm' || ext === '.pbm';
}

// Helper function to get web-friendly content type
function getWebFriendlyContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();

  // Web-friendly formats
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.tif' || ext === '.tiff') return 'image/tiff';
  if (ext === '.jp2') return 'image/jp2';

  // Convert less common formats to PNG for web compatibility
  if (ext === '.ppm' || ext === '.pbm') return 'image/png';

  return 'image/png'; // default
}

// Resolve Xpdf pdfimages.exe path
function resolvePdfImages() {
  // Prefer explicit env var
  if (process.env.XPDF_PATH) {
    return path.join(process.env.XPDF_PATH, 'pdfimages.exe');
  }
  // Try in PATH
  return 'pdfimages.exe';
}

// Execute pdfimages command
function execPdfImages(args) {
  return new Promise((resolve, reject) => {
    execFile(resolvePdfImages(), args, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr?.toString?.();
        err.stdout = stdout?.toString?.();

        // Check if this is a "no images found" situation (exit code 1)
        // This is normal and shouldn't be treated as a hard error
        if (err.code === 1 && !err.stderr?.includes('Error') && !err.stderr?.includes('error')) {
          console.log('📝 pdfimages exit code 1 (likely no images found - this is normal)');
          return resolve({
            stdout: stdout?.toString?.() ?? '',
            stderr: stderr?.toString?.() ?? '',
            noImages: true
          });
        }

        return reject(err);
      }
      resolve({
        stdout: stdout?.toString?.() ?? '',
        stderr: stderr?.toString?.() ?? ''
      });
    });
  });
}

// Function to extract images from PDF using Xpdf pdfimages
async function extractPdfImages(pdfPath, documentId) {
  console.log(`\n=== PDF IMAGE EXTRACTION (Xpdf) ===`);
  console.log(`Extracting images from PDF for document ${documentId}`);
  console.log(`PDF path: ${pdfPath}`);

  let extractedCount = 0;

  try {
    // Normalize the PDF path and check if file exists
    const normalizedPdfPath = path.resolve(pdfPath);
    console.log(`Normalized PDF path: ${normalizedPdfPath}`);

    try {
      await fs.access(normalizedPdfPath);
      console.log(`✅ PDF file exists and is accessible`);
    } catch (accessError) {
      throw new Error(`PDF file not accessible: ${normalizedPdfPath} (${accessError.message})`);
    }

    // Create temporary directory for extracted images
    const tempDir = path.join(process.cwd(), 'temp', documentId);
    await fs.mkdir(tempDir, { recursive: true });

    console.log(`Created temp directory: ${tempDir}`);

    // Step 1: List images to get metadata
    console.log(`\n--- Step 1: Listing images in PDF ---`);
    let listOutput;
    try {
      // pdfimages -list requires: pdfimages -list <PDF-file> <dummy-root>
      // The dummy root is required but not used for listing
      const dummyRoot = path.join(tempDir, 'list-dummy');
      console.log(`List command: pdfimages -list "${normalizedPdfPath}" "${dummyRoot}"`);
      const { stdout: listOut } = await execPdfImages(['-list', normalizedPdfPath, dummyRoot]);
      listOutput = listOut;
      console.log(`Image list output:\n${listOut}`);
    } catch (listError) {
      console.log(`Warning: Could not list images (${listError.message}), proceeding with extraction...`);
      console.log(`List error details: ${listError.stderr || listError.stdout || 'No details'}`);

      // Check if this is a command syntax error
      if (listError.code === 99 || (listError.stderr && listError.stderr.includes('Usage:'))) {
        console.log(`📝 Command syntax error detected - this suggests invalid pdfimages options`);
      }

      listOutput = '';
    }

    // Step 2: Extract all images as PNG with page numbers in filenames
    console.log(`\n--- Step 2: Extracting images ---`);
    const outputPrefix = path.join(tempDir, 'img');

    // Use -p (page numbers in filenames) and -png (force PNG output)
    console.log(`Extract command: pdfimages -p -png "${normalizedPdfPath}" "${outputPrefix}"`);

    try {
      // Extract with page numbers and PNG format
      const { stdout, stderr, noImages } = await execPdfImages(['-j', normalizedPdfPath, outputPrefix]);
      if (noImages) {
        console.log(`📝 PDF contains no extractable images (exit code 1)`);
      } else {
        console.log(`✅ Image extraction completed`);
      }
      if (stdout) console.log(`Stdout: ${stdout}`);
      if (stderr) console.log(`Stderr: ${stderr}`);
    } catch (extractError) {
      console.log(`Warning: Image extraction had issues: ${extractError.message}`);
      console.log(`Extract error stderr: ${extractError.stderr || 'No stderr'}`);
      console.log(`Extract error stdout: ${extractError.stdout || 'No stdout'}`);
      console.log(`Extract error code: ${extractError.code || 'No code'}`);
      console.log(`Extract error signal: ${extractError.signal || 'No signal'}`);

      // Check if it's a "no images" situation vs actual error
      if (extractError.stderr && extractError.stderr.includes('no images')) {
        console.log(`📝 PDF contains no extractable images (this is normal for text-only PDFs)`);
      } else if (extractError.code === 1) {
        console.log(`📝 pdfimages exited with code 1 (may indicate no images found)`);
      } else {
        console.log(`❌ Actual extraction error occurred`);
      }

      // Continue anyway, some images might have been extracted
    }

    // Step 3: Process extracted image files
    console.log(`\n--- Step 3: Processing extracted images ---`);

    let files = [];
    try {
      const dirContents = await fs.readdir(tempDir);
      files = dirContents
        .filter(f => /^img-\d+-\d+\.png$/i.test(f)) // Match img-XXX-YYY.png format (with -p option)
        .sort((a, b) => {
          // Sort by image index first, then by page number
          const aMatch = a.match(/^img-(\d+)-(\d+)\.png$/i);
          const bMatch = b.match(/^img-(\d+)-(\d+)\.png$/i);
          const aImg = parseInt(aMatch?.[1] || '0');
          const bImg = parseInt(bMatch?.[1] || '0');
          const aPage = parseInt(aMatch?.[2] || '0');
          const bPage = parseInt(bMatch?.[2] || '0');

          // Sort by image index first, then by page
          if (aImg !== bImg) return aImg - bImg;
          return aPage - bPage;
        });

      console.log(`Found ${files.length} extracted PNG image files:`, files);
    } catch (readError) {
      console.error(`Error reading temp directory: ${readError.message}`);
      return 0;
    }

    // Step 4: Parse image metadata from list output
    const lines = listOutput.split(/\r?\n/);
    const headerIdx = lines.findIndex(l => /\bpage\b/i.test(l) && /\bwidth\b/i.test(l));
    const dataLines = headerIdx >= 0 ? lines.slice(headerIdx + 1).filter(Boolean) : [];

    // Step 5: Upload images to storage and save to database (following DOCX pattern)
    console.log(`\n--- Step 4: Uploading images to storage ---`);

    for (let i = 0; i < files.length; i++) {
      const fileName = files[i];
      try {
        const filePath = path.join(tempDir, fileName);
        const imageBuffer = await fs.readFile(filePath);

        console.log(`\nProcessing image ${i + 1}/${files.length}: ${fileName}`);
        console.log(`  - Image buffer size: ${imageBuffer.length} bytes`);

        // All images are now PNG format due to -png option
        const contentType = 'image/png';
        console.log(`  - Content type: ${contentType}`);

        // Parse page and image info from filename (img-XXX-YYY.png format)
        const fileMatch = fileName.match(/^img-(\d+)-(\d+)\.png$/i);
        const imageIndex = fileMatch ? parseInt(fileMatch[1]) : i;
        const pageIndex = fileMatch ? parseInt(fileMatch[2]) : null;

        console.log(`  - Image index: ${imageIndex}, Page: ${pageIndex}`);

        // Parse additional metadata from list output (if available)
        const cols = (dataLines[i] || '').trim().split(/\s+/);
        const imageType = cols[2] || null;
        const width = Number(cols[3]) || null;
        const height = Number(cols[4]) || null;

        // Create asset path (similar to DOCX pattern)
        const assetPath = `pdf/${documentId}/image_${i}`;
        console.log(`  - Uploading to path: ${assetPath}`);

        // Upload to Supabase storage
        const url = await uploadBuffer('assets', assetPath, imageBuffer, contentType);
        console.log(`  - Image uploaded to: ${url}`);

        // Save to database (following DOCX pattern)
        const { error } = await sb.from('document_assets').insert({
          doc_id: documentId,
          kind: 'pdf_image',
          page_index: pageIndex,
          image_index: imageIndex,
          url,
          content_type: contentType,
          metadata: {
            original_filename: fileName,
            width,
            height,
            image_type: imageType,
            extraction_method: 'xpdf_pdfimages',
            extraction_options: '-p -png',
            format_converted: 'PNG'
          }
        });

        if (error) {
          console.error(`  - Database insert error:`, error);
        } else {
          console.log(`  - Image ${i} saved to database`);
          extractedCount++;
        }

      } catch (imgError) {
        console.error(`  - Error processing image ${fileName}:`, imgError.message);
      }
    }

    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log(`\n✅ Cleaned up temp directory: ${tempDir}`);
    } catch (cleanupError) {
      console.error(`\n⚠️ Could not cleanup temp directory: ${cleanupError.message}`);
    }

    console.log(`\nPDF image extraction completed. Successfully extracted ${extractedCount}/${files.length} images.`);
    return extractedCount;

  } catch (error) {
    console.error(`❌ PDF image extraction failed:`, error.message);
    console.error(`Error details:`, error.stderr || error.stdout || 'No additional details');

    // Cleanup on error
    try {
      const tempDir = path.join(process.cwd(), 'temp', documentId);
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Ignore cleanup errors
    }

    return 0;
  }
}

// Function to extract images from DOCX using jszip
async function extractDocxImages(docxBuffer, documentId) {
  console.log(`Extracting images from DOCX using jszip for document ${documentId}`);
  
  try {
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(docxBuffer);
    
    console.log('DOCX file loaded as ZIP');
    
    // Get all files in the ZIP
    const files = Object.keys(zipContent.files);
    console.log(`Total files in DOCX: ${files.length}`);
    
    // Look for image files in the media folder
    const imageFiles = files.filter(file => 
      file.startsWith('word/media/') && 
      (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.gif') || file.endsWith('.bmp'))
    );
    
    console.log(`Found ${imageFiles.length} image files in DOCX:`);
    imageFiles.forEach(file => console.log(`  - ${file}`));
    
    let extractedCount = 0;
    
    // Extract each image
    for (let i = 0; i < imageFiles.length; i++) {
      const imagePath = imageFiles[i];
      try {
        console.log(`\nProcessing image ${i + 1}/${imageFiles.length}: ${imagePath}`);
        
        // Get the image file from the ZIP
        const imageFile = zipContent.files[imagePath];
        if (!imageFile) {
          console.log(`  - Image file not found in ZIP`);
          continue;
        }
        
        // Get image data as buffer
        const imageBuffer = await imageFile.async('nodebuffer');
        console.log(`  - Image buffer size: ${imageBuffer.length} bytes`);
        
        // Determine content type from file extension
        const ext = path.extname(imagePath).toLowerCase();
        let contentType = 'image/png'; // default
        if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
        else if (ext === '.gif') contentType = 'image/gif';
        else if (ext === '.bmp') contentType = 'image/bmp';
        
        console.log(`  - Content type: ${contentType}`);
        
        // Create asset path
        const assetPath = `docx/${documentId}/image_${i}`;
        console.log(`  - Uploading to path: ${assetPath}`);
        
        // Upload to Supabase storage
        const url = await uploadBuffer('assets', assetPath, imageBuffer, contentType);
        console.log(`  - Image uploaded to: ${url}`);
        
        // Save to database
        const { error } = await sb.from('document_assets').insert({
          doc_id: documentId,
          kind: 'docx_image',
          image_index: i,
          url,
          content_type: contentType
        });
        
        if (error) {
          console.error(`  - Database insert error:`, error);
        } else {
          console.log(`  - Image ${i} saved to database`);
          extractedCount++;
        }
        
      } catch (imgError) {
        console.error(`  - Error processing image ${imagePath}:`, imgError);
      }
    }
    
    console.log(`\nDOCX image extraction completed. Successfully extracted ${extractedCount}/${imageFiles.length} images.`);
    return extractedCount;
    
  } catch (error) {
    console.error('Error extracting DOCX images with jszip:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return 0;
  }
}

router.post('/', upload.array('files'), async (req, res) => {
  try {
    const documentId = uuidv4();
    const d = db();

    for (const [fileIndex, file] of req.files.entries()) {
      // 1) Keep original file in Supabase Storage
      const originalBuf = await fs.readFile(file.path);
      const storePath = `originals/${documentId}/${file.originalname}`;
      const originalUrl = await uploadBuffer('documents', storePath, originalBuf, file.mimetype);

      // 2) Parse text (existing behavior)
      const text = await extractText(file.path, file.mimetype, file.originalname);
      if (!text || !text.trim()) {
        // Clean up file if no text extracted
        await fs.unlink(file.path).catch(() => {});
        continue;
      }

      // 3) Extract images based on file type (BEFORE deleting the file)
      const ext = path.extname(file.originalname).toLowerCase();
      console.log(`\n=== Processing file: ${file.originalname} ===`);
      console.log(`File extension: ${ext}`);
      console.log(`File mimetype: ${file.mimetype}`);
      console.log(`File size: ${originalBuf.length} bytes`);
      
      if (ext === '.docx') {
        console.log(`Processing DOCX file: ${file.originalname} for document ${documentId}`);
        try {
          // Extract images using jszip (more reliable than mammoth)
          const imageCount = await extractDocxImages(originalBuf, documentId);
          console.log(`DOCX processing completed for ${file.originalname}. Extracted ${imageCount} images.`);
        } catch (imageError) {
          console.error('Error processing DOCX images:', imageError);
          console.error('Error details:', imageError.message);
          console.error('Error stack:', imageError.stack);
        }
      } else if (ext === '.pdf') {
        console.log(`Processing PDF file: ${file.originalname} for document ${documentId}`);

        // Check if Xpdf is available
        const useXpdf = process.env.USE_XPDF !== 'false'; // Default to true unless explicitly disabled

        if (useXpdf) {
          try {
            console.log(`Multer file path: ${file.path}`);
            const fileExists = await fs.access(file.path).then(() => true).catch(() => false);
            console.log(`File exists at multer path: ${fileExists}`);

            // Create a temporary PDF file with a proper extension for pdfimages
            const tempPdfPath = path.join(process.cwd(), 'temp', `${documentId}.pdf`);
            await fs.mkdir(path.dirname(tempPdfPath), { recursive: true });

            if (fileExists) {
              // Copy from multer file if it exists
              await fs.copyFile(file.path, tempPdfPath);
              console.log(`Created temporary PDF from multer file: ${tempPdfPath}`);
            } else {
              // Use the buffer we already read if multer file doesn't exist
              await fs.writeFile(tempPdfPath, originalBuf);
              console.log(`Created temporary PDF from buffer: ${tempPdfPath}`);
            }

            // Use Xpdf pdfimages for better image extraction
            const imageCount = await extractPdfImages(tempPdfPath, documentId);
            console.log(`PDF processing completed for ${file.originalname}. Extracted ${imageCount} images using Xpdf.`);

            // Clean up temporary PDF
            try {
              await fs.unlink(tempPdfPath);
              console.log(`Cleaned up temporary PDF: ${tempPdfPath}`);
            } catch (cleanupError) {
              console.log(`Warning: Could not cleanup temporary PDF: ${cleanupError.message}`);
            }

          } catch (pdfError) {
            console.error('Error processing PDF images with Xpdf:', pdfError);
            console.error('Error details:', pdfError.message);
            console.error('Error stderr:', pdfError.stderr);
            console.log('⚠️ Xpdf processing failed. To troubleshoot:');
            console.log('   1. Check if Xpdf is installed: pdfimages -v');
            console.log('   2. Verify PDF file is not corrupted');
            console.log('   3. Check file permissions');
            console.log('   4. Or set USE_XPDF=false in .env to disable');
            console.log('📝 Continuing without PDF image extraction...');
          }
        } else {
          console.log('📝 Xpdf disabled (USE_XPDF=false). Skipping PDF image extraction.');
        }
      } else {
        console.log(`File type ${ext} not supported for image extraction`);
      }

      // 4) Chunk + embed + store with file_url in metadata
      const chunks = chunkText(text, 1000, 200);
      const embeddings = await embedBatch(chunks);

      const rows = chunks.map((content, i) => ({
        doc_id: documentId,
        chunk_index: i,
        content,
        metadata: {
          filename: file.originalname,
          fileIndex,
          file_url: originalUrl
        },
        embedding: embeddings[i]
      }));

      await d.insertChunks(rows);

      // 5) Clean up multer temporary file after all processing is complete
      try {
        await fs.unlink(file.path);
        console.log(`✅ Cleaned up multer file: ${file.path}`);
      } catch (cleanupError) {
        console.log(`⚠️ Could not cleanup multer file (may already be deleted): ${cleanupError.message}`);
      }
    }

    res.json({ ok: true, doc_id: documentId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;