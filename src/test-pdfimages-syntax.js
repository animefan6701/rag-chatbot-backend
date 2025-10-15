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

async function testPdfImagesSyntax() {
  console.log('🧪 Testing pdfimages Command Syntax\n');

  // Create a minimal test PDF
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
(Test PDF with no images) Tj
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

  const testPdfPath = path.join(process.cwd(), 'test-syntax.pdf');
  const tempDir = path.join(process.cwd(), 'temp-syntax-test');
  
  try {
    // Create test PDF and temp directory
    await fs.writeFile(testPdfPath, testPdfContent);
    await fs.mkdir(tempDir, { recursive: true });
    
    console.log(`✅ Created test PDF: ${testPdfPath}`);
    console.log(`✅ Created temp directory: ${tempDir}`);
    
    // Test 1: Version check
    console.log('\n--- Test 1: Version Check ---');
    try {
      const { stdout } = await execPdfImages(['-v']);
      console.log('✅ Version check successful');
      console.log(`Version: ${stdout.trim()}`);
    } catch (vError) {
      console.log('❌ Version check failed');
      console.log(`Error: ${vError.message}`);
      return;
    }
    
    // Test 2: Help output
    console.log('\n--- Test 2: Help Output ---');
    try {
      const { stderr } = await execPdfImages(['-h']);
      console.log('✅ Help output received');
      console.log('Usage line found:', stderr.includes('Usage:') ? 'Yes' : 'No');
    } catch (hError) {
      console.log('⚠️ Help command had issues (this might be normal)');
    }
    
    // Test 3: List images (correct syntax)
    console.log('\n--- Test 3: List Images (with dummy root) ---');
    const dummyRoot = path.join(tempDir, 'dummy');
    try {
      const { stdout } = await execPdfImages(['-list', testPdfPath, dummyRoot]);
      console.log('✅ List command successful');
      console.log(`Output: ${stdout || '(no output - PDF has no images)'}`);
    } catch (listError) {
      console.log('❌ List command failed');
      console.log(`Error: ${listError.message}`);
      console.log(`Stderr: ${listError.stderr}`);
    }
    
    // Test 4: Extract images (correct syntax)
    console.log('\n--- Test 4: Extract Images ---');
    const outputPrefix = path.join(tempDir, 'img');
    try {
      const { stdout, stderr } = await execPdfImages(['-all', testPdfPath, outputPrefix]);
      console.log('✅ Extract command successful');
      console.log(`Stdout: ${stdout || '(no stdout)'}`);
      console.log(`Stderr: ${stderr || '(no stderr)'}`);
      
      // Check for extracted files
      const files = await fs.readdir(tempDir);
      const imageFiles = files.filter(f => f.startsWith('img-'));
      console.log(`Extracted files: ${imageFiles.length} (expected 0 for test PDF)`);
      
    } catch (extractError) {
      console.log('❌ Extract command failed');
      console.log(`Error: ${extractError.message}`);
      console.log(`Stderr: ${extractError.stderr}`);
    }
    
    // Test 5: Wrong syntax (for comparison)
    console.log('\n--- Test 5: Wrong Syntax (for comparison) ---');
    try {
      await execPdfImages(['-list', testPdfPath]); // Missing output root
      console.log('⚠️ Wrong syntax worked (unexpected)');
    } catch (wrongError) {
      console.log('✅ Wrong syntax correctly failed');
      console.log(`Expected error: ${wrongError.message.substring(0, 100)}...`);
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
  
  console.log('\n🎉 Syntax testing completed!');
  console.log('\n📋 Summary:');
  console.log('   - pdfimages requires: pdfimages [options] <PDF-file> <image-root>');
  console.log('   - Both PDF file AND image root are required for all commands');
  console.log('   - For -list, the image root is required but not used');
  console.log('   - For -all, the image root is the output prefix for extracted files');
}

// Run the test
testPdfImagesSyntax().catch(console.error);
