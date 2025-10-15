import 'dotenv/config';
import JSZip from 'jszip';
import fs from 'fs/promises';
import path from 'path';

async function testJszipDocxExtraction() {
  console.log('Testing JSZip DOCX image extraction...');
  
  try {
    // Check if there's a test DOCX file in uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir).catch(() => []);
    
    if (files.length === 0) {
      console.log('❌ No files found in uploads directory');
      console.log('Please upload a DOCX file first, then run this test');
      return;
    }
    
    console.log(`Found ${files.length} files in uploads directory:`);
    files.forEach(file => console.log(`  - ${file}`));
    
    // Look for DOCX files
    const docxFiles = files.filter(f => f.toLowerCase().endsWith('.docx'));
    
    if (docxFiles.length === 0) {
      console.log('\n❌ No DOCX files found in uploads directory');
      console.log('Please upload a DOCX file with images to test');
      return;
    }
    
    const testFile = path.join(uploadsDir, docxFiles[0]);
    console.log(`\nTesting with file: ${docxFiles[0]}`);
    
    const buffer = await fs.readFile(testFile);
    console.log(`File size: ${buffer.length} bytes`);
    
    // Test JSZip DOCX extraction
    console.log('\n1. Loading DOCX as ZIP...');
    const zip = new JSZip();
    const zipContent = await zip.loadAsync(buffer);
    
    console.log('✅ DOCX file loaded as ZIP');
    
    // Get all files in the ZIP
    const allFiles = Object.keys(zipContent.files);
    console.log(`Total files in DOCX: ${allFiles.length}`);
    
    // Show some interesting files
    console.log('\n2. DOCX structure:');
    const interestingFiles = allFiles.filter(file => 
      file.startsWith('word/') || 
      file.startsWith('_rels/') || 
      file.startsWith('[Content_Types]')
    );
    interestingFiles.slice(0, 10).forEach(file => console.log(`  - ${file}`));
    
    // Look for image files in the media folder
    const imageFiles = allFiles.filter(file => 
      file.startsWith('word/media/') && 
      (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.gif') || file.endsWith('.bmp'))
    );
    
    console.log(`\n3. Image files found: ${imageFiles.length}`);
    if (imageFiles.length > 0) {
      imageFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        console.log(`  - ${file} (${ext})`);
      });
      
      // Test extracting first image
      if (imageFiles.length > 0) {
        const firstImage = imageFiles[0];
        console.log(`\n4. Testing extraction of first image: ${firstImage}`);
        
        const imageFile = zipContent.files[firstImage];
        if (imageFile) {
          const imageBuffer = await imageFile.async('nodebuffer');
          console.log(`  ✅ Image extracted successfully`);
          console.log(`  - Buffer size: ${imageBuffer.length} bytes`);
          console.log(`  - File extension: ${path.extname(firstImage)}`);
        } else {
          console.log(`  ❌ Failed to extract image`);
        }
      }
    } else {
      console.log('\n❌ No images found in the DOCX file');
      console.log('Possible reasons:');
      console.log('   - The DOCX file doesn\'t contain images');
      console.log('   - Images might be in a different format');
      console.log('   - File might be corrupted');
      console.log('\nTry uploading a different DOCX file with images');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testJszipDocxExtraction();
