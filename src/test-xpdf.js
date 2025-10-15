import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs/promises';

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
        return reject(err);
      }
      resolve({ 
        stdout: stdout?.toString?.() ?? '', 
        stderr: stderr?.toString?.() ?? '' 
      });
    });
  });
}

async function testXpdfInstallation() {
  console.log('🧪 Testing Xpdf Installation\n');

  // Test 1: Check if pdfimages is available
  console.log('1. Testing pdfimages availability...');
  try {
    const pdfimagesPath = resolvePdfImages();
    console.log(`   Trying path: ${pdfimagesPath}`);
    
    const { stdout } = await execPdfImages(['-v']);
    console.log('✅ pdfimages found!');
    console.log(`   Version info: ${stdout.trim()}`);
  } catch (error) {
    console.log('❌ pdfimages not found');
    console.log(`   Error: ${error.message}`);
    console.log('\n📋 Setup Instructions:');
    console.log('   1. Download Xpdf from: https://www.xpdfreader.com/download.html');
    console.log('   2. Extract to C:\\tools\\xpdf\\');
    console.log('   3. Add C:\\tools\\xpdf\\bin64 to PATH or set XPDF_PATH in .env');
    console.log('   4. Restart terminal and try again');
    return;
  }

  console.log();

  // Test 2: Check help output
  console.log('2. Testing pdfimages help...');
  try {
    const { stderr } = await execPdfImages([]);
    if (stderr.includes('pdfimages') && stderr.includes('Usage:')) {
      console.log('✅ Help output looks correct');
      console.log('   Available options include: -list, -all, -png, -j, -f, -l, -p');
    } else {
      console.log('⚠️ Unexpected help output');
      console.log(`   Output: ${stderr.substring(0, 200)}...`);
    }
  } catch (error) {
    console.log('⚠️ Could not get help output');
    console.log(`   Error: ${error.message}`);
  }

  console.log();

  // Test 3: Create a minimal test PDF and try extraction
  console.log('3. Testing with a sample PDF...');
  
  // Create a simple test PDF (minimal PDF structure)
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
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Test PDF) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
299
%%EOF`;

  const testPdfPath = path.join(process.cwd(), 'test-sample.pdf');
  
  try {
    // Write test PDF
    await fs.writeFile(testPdfPath, testPdfContent);
    console.log(`   Created test PDF: ${testPdfPath}`);
    
    // Try to list images (should show no images)
    try {
      const { stdout } = await execPdfImages(['-list', testPdfPath]);
      console.log('✅ pdfimages -list command works');
      if (stdout.includes('no images')) {
        console.log('   Result: No images found (expected for test PDF)');
      } else {
        console.log(`   Output: ${stdout.trim()}`);
      }
    } catch (listError) {
      console.log('⚠️ pdfimages -list failed');
      console.log(`   Error: ${listError.message}`);
    }
    
    // Try to extract images (should complete without errors)
    const tempDir = path.join(process.cwd(), 'temp-test');
    await fs.mkdir(tempDir, { recursive: true });
    
    try {
      await execPdfImages(['-all', testPdfPath, path.join(tempDir, 'img')]);
      console.log('✅ pdfimages -all command works');
      
      // Check if any files were created
      const files = await fs.readdir(tempDir);
      const imageFiles = files.filter(f => f.startsWith('img-'));
      console.log(`   Extracted ${imageFiles.length} images (expected 0 for test PDF)`);
      
    } catch (extractError) {
      console.log('⚠️ pdfimages -all failed');
      console.log(`   Error: ${extractError.message}`);
    }
    
    // Cleanup
    await fs.rm(tempDir, { recursive: true, force: true });
    await fs.unlink(testPdfPath);
    console.log('   ✅ Cleaned up test files');
    
  } catch (testError) {
    console.log('❌ Test PDF creation/processing failed');
    console.log(`   Error: ${testError.message}`);
  }

  console.log();

  // Test 4: Environment configuration
  console.log('4. Checking environment configuration...');
  
  if (process.env.XPDF_PATH) {
    console.log(`✅ XPDF_PATH is set: ${process.env.XPDF_PATH}`);
    
    // Check if the path exists
    try {
      const fullPath = path.join(process.env.XPDF_PATH, 'pdfimages.exe');
      await fs.access(fullPath);
      console.log(`   ✅ pdfimages.exe found at: ${fullPath}`);
    } catch (accessError) {
      console.log(`   ❌ pdfimages.exe not found at: ${path.join(process.env.XPDF_PATH, 'pdfimages.exe')}`);
    }
  } else {
    console.log('⚠️ XPDF_PATH not set, relying on PATH');
    console.log('   This is OK if pdfimages.exe is in your system PATH');
  }

  console.log('\n🎉 Xpdf testing completed!');
  console.log('\n📋 Summary:');
  console.log('   - If all tests passed, your PDF image extraction should work');
  console.log('   - Upload a PDF with images to test the full integration');
  console.log('   - Check server logs for detailed extraction information');
}

// Run the test
testXpdfInstallation().catch(console.error);
