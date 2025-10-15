import 'dotenv/config';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';

async function testMammothImageExtraction() {
  console.log('Testing Mammoth image extraction...');
  
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
    
    // Try to find DOCX files or any files to test
    const docxFiles = files.filter(f => f.toLowerCase().endsWith('.docx'));
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    const txtFiles = files.filter(f => f.toLowerCase().endsWith('.txt'));
    
    console.log(`\nFile types found:`);
    console.log(`  - DOCX: ${docxFiles.length}`);
    console.log(`  - PDF: ${pdfFiles.length}`);
    console.log(`  - TXT: ${txtFiles.length}`);
    
    // Test with first available file
    let testFile = null;
    let fileType = '';
    
    if (docxFiles.length > 0) {
      testFile = path.join(uploadsDir, docxFiles[0]);
      fileType = 'DOCX';
    } else if (pdfFiles.length > 0) {
      testFile = path.join(uploadsDir, pdfFiles[0]);
      fileType = 'PDF';
    } else if (txtFiles.length > 0) {
      testFile = path.join(uploadsDir, txtFiles[0]);
      fileType = 'TXT';
    } else {
      // Try with any file
      testFile = path.join(uploadsDir, files[0]);
      fileType = 'UNKNOWN';
    }
    
    console.log(`\nTesting with file: ${path.basename(testFile)} (${fileType})`);
    
    const buffer = await fs.readFile(testFile);
    console.log(`File size: ${buffer.length} bytes`);
    
    if (fileType === 'DOCX') {
      // Test 1: Basic HTML conversion
      console.log('\n1. Testing basic HTML conversion...');
      const { value: html, messages } = await mammoth.convertToHtml({ buffer });
      console.log(`✅ HTML conversion successful`);
      console.log(`   - Messages: ${messages.length}`);
      messages.forEach(msg => console.log(`   - ${msg.type}: ${msg.message}`));
      
      // Test 2: Image extraction
      console.log('\n2. Testing image extraction...');
      let imageCount = 0;
      
      const result = await mammoth.convertToHtml(
        { buffer },
        {
          convertImage: mammoth.images.imgElement(async (image) => {
            imageCount++;
            console.log(`✅ Found image ${image.index}:`);
            console.log(`   - Type: ${image.contentType}`);
            console.log(`   - Alt text: ${image.altText || 'none'}`);
            
            const imgBuf = await image.read('buffer');
            console.log(`   - Size: ${imgBuf.length} bytes`);
            
            return { src: `test-image-${image.index}.${image.contentType?.split('/')[1] || 'png'}` };
          })
        }
      );
      
      if (imageCount === 0) {
        console.log('\n❌ No images found in the DOCX file');
        console.log('Possible reasons:');
        console.log('   - The DOCX file doesn\'t contain images');
        console.log('   - Images are embedded in a different format');
        console.log('   - File might be corrupted');
        console.log('\nTry uploading a different DOCX file with images');
      } else {
        console.log(`\n✅ Successfully extracted ${imageCount} images`);
      }
    } else {
      console.log(`\n⚠️ File type ${fileType} is not supported for image extraction`);
      console.log('Please upload a DOCX file with images');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
  }
}

testMammothImageExtraction();
