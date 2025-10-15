import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

// Resolve Xpdf pdfimages.exe path
function resolvePdfImages() {
  if (process.env.XPDF_PATH) {
    return path.join(process.env.XPDF_PATH, 'pdfimages.exe');
  }
  return 'pdfimages.exe';
}

// Execute pdfimages command
function execPdfImages(args) {
  return new Promise((resolve, reject) => {
    console.log(`Executing: ${resolvePdfImages()} ${args.join(' ')}`);
    execFile(resolvePdfImages(), args, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr?.toString?.();
        err.stdout = stdout?.toString?.();
        return reject(err);
      }
      resolve({ 
        stdout: stdout?.toString?.() ?? '', 
        stderr: stderr?.toString?.() ?? '' 
      });
    });
  });
}

async function testPdfWithNoImages() {
  console.log('🧪 Testing PDF with No Images\n');

  // Create a text-only PDF (no images)
  const testPdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
  /Font <<
    /F1 <<
      /Type /Font
      /Subtype /Type1
      /BaseFont /Helvetica
    >>
  >>
>>
>>
endobj

4 0 obj
<<
/Length 120
>>
stream
BT
/F1 12 Tf
100 700 Td
(This is a test PDF with NO images) Tj
0 -20 Td
(Only text content here) Tj
0 -20 Td
(Should result in no extracted images) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000350 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
489
%%EOF`;

  const testPdfPath = path.join(process.cwd(), 'test-no-images.pdf');
  const tempDir = path.join(process.cwd(), 'temp-no-images-test');
  
  try {
    // Create test PDF and temp directory
    await fs.writeFile(testPdfPath, testPdfContent);
    await fs.mkdir(tempDir, { recursive: true });
    
    console.log(`✅ Created test PDF: ${testPdfPath}`);
    console.log(`✅ Created temp directory: ${tempDir}`);
    
    // Test 1: List images (should show no images)
    console.log('\n--- Test 1: List Images ---');
    const dummyRoot = path.join(tempDir, 'dummy');
    try {
      const { stdout } = await execPdfImages(['-list', testPdfPath, dummyRoot]);
      console.log('✅ List command successful');
      console.log(`Output: "${stdout}"`);
      if (!stdout.trim()) {
        console.log('📝 Empty output indicates no images (expected)');
      }
    } catch (listError) {
      console.log('❌ List command failed');
      console.log(`Error message: ${listError.message}`);
      console.log(`Error code: ${listError.code}`);
      console.log(`Error signal: ${listError.signal}`);
      console.log(`Stderr: "${listError.stderr}"`);
      console.log(`Stdout: "${listError.stdout}"`);
    }
    
    // Test 2: Extract images (should fail or succeed with no output)
    console.log('\n--- Test 2: Extract Images ---');
    const outputPrefix = path.join(tempDir, 'img');
    try {
      const { stdout, stderr } = await execPdfImages(['-all', testPdfPath, outputPrefix]);
      console.log('✅ Extract command successful');
      console.log(`Stdout: "${stdout}"`);
      console.log(`Stderr: "${stderr}"`);
      
      // Check for extracted files
      const files = await fs.readdir(tempDir);
      const imageFiles = files.filter(f => f.startsWith('img-'));
      console.log(`Extracted files: ${imageFiles.length} (expected 0)`);
      
    } catch (extractError) {
      console.log('❌ Extract command failed (this might be normal for PDFs with no images)');
      console.log(`Error message: ${extractError.message}`);
      console.log(`Error code: ${extractError.code}`);
      console.log(`Error signal: ${extractError.signal}`);
      console.log(`Stderr: "${extractError.stderr}"`);
      console.log(`Stdout: "${extractError.stdout}"`);
      
      // Analyze the error
      if (extractError.code === 1) {
        console.log('📝 Exit code 1 often means "no images found" (normal)');
      } else if (extractError.code === 2) {
        console.log('📝 Exit code 2 often means "error opening file"');
      } else if (extractError.code === 3) {
        console.log('📝 Exit code 3 often means "error reading PDF"');
      }
      
      if (extractError.stderr && extractError.stderr.toLowerCase().includes('no images')) {
        console.log('📝 Error message indicates no images (normal)');
      }
    }
    
    // Test 3: Check what files were actually created
    console.log('\n--- Test 3: Check Created Files ---');
    try {
      const allFiles = await fs.readdir(tempDir);
      console.log(`All files in temp dir: ${allFiles.length}`);
      for (const file of allFiles) {
        const filePath = path.join(tempDir, file);
        const stats = await fs.stat(filePath);
        console.log(`  - ${file} (${stats.size} bytes)`);
      }
    } catch (readError) {
      console.log(`Could not read temp directory: ${readError.message}`);
    }
    
  } catch (error) {
    console.log('❌ Test setup failed');
    console.log(`Error: ${error.message}`);
  } finally {
    // Cleanup
    try {
      await fs.unlink(testPdfPath);
      await fs.rm(tempDir, { recursive: true, force: true });
      console.log('\n✅ Cleaned up test files');
    } catch (cleanupError) {
      console.log('\n⚠️ Cleanup had issues (not critical)');
    }
  }
  
  console.log('\n🎉 No-images PDF testing completed!');
  console.log('\n📋 Key Insights:');
  console.log('   - pdfimages may exit with code 1 when no images are found');
  console.log('   - This is normal behavior, not an actual error');
  console.log('   - Empty stdout/stderr often indicates no images');
  console.log('   - Check exit codes to distinguish between "no images" and "real errors"');
}

// Run the test
testPdfWithNoImages().catch(console.error);
