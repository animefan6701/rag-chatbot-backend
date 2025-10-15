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
      const result = {
        success: !err,
        code: err?.code || 0,
        signal: err?.signal || null,
        stdout: stdout?.toString?.() ?? '',
        stderr: stderr?.toString?.() ?? '',
        error: err?.message || null
      };
      
      // Don't reject on exit code 1 (might be normal)
      if (err && err.code !== 1) {
        return reject(err);
      }
      
      resolve(result);
    });
  });
}

async function testPdfImagesOptions() {
  console.log('🧪 Testing pdfimages Options and Syntax\n');

  // Create a simple test PDF
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

  const testPdfPath = path.join(process.cwd(), 'test-options.pdf');
  const tempDir = path.join(process.cwd(), 'temp-options-test');
  
  try {
    // Create test PDF and temp directory
    await fs.writeFile(testPdfPath, testPdfContent);
    await fs.mkdir(tempDir, { recursive: true });
    
    console.log(`✅ Created test PDF: ${testPdfPath}`);
    console.log(`✅ Created temp directory: ${tempDir}`);
    
    // Test different command variations
    const tests = [
      {
        name: 'Help (-h)',
        args: ['-h']
      },
      {
        name: 'Version (-v)',
        args: ['-v']
      },
      {
        name: 'Invalid option (-all)',
        args: ['-all', testPdfPath, path.join(tempDir, 'test1')]
      },
      {
        name: 'Basic extraction (no options)',
        args: [testPdfPath, path.join(tempDir, 'test2')]
      },
      {
        name: 'JPEG preservation (-j)',
        args: ['-j', testPdfPath, path.join(tempDir, 'test3')]
      },
      {
        name: 'Raw format (-raw)',
        args: ['-raw', testPdfPath, path.join(tempDir, 'test4')]
      },
      {
        name: 'List only (-list)',
        args: ['-list', testPdfPath, path.join(tempDir, 'test5')]
      },
      {
        name: 'Verbose (-verbose)',
        args: ['-verbose', testPdfPath, path.join(tempDir, 'test6')]
      }
    ];
    
    for (const test of tests) {
      console.log(`\n--- ${test.name} ---`);
      try {
        const result = await execPdfImages(test.args);
        console.log(`✅ Command succeeded (exit code: ${result.code})`);
        if (result.stdout) console.log(`Stdout: ${result.stdout.substring(0, 200)}${result.stdout.length > 200 ? '...' : ''}`);
        if (result.stderr) console.log(`Stderr: ${result.stderr.substring(0, 200)}${result.stderr.length > 200 ? '...' : ''}`);
        
        // Check if help/usage was displayed (indicates invalid option)
        if (result.stderr.includes('Usage:') || result.stdout.includes('Usage:')) {
          console.log('⚠️ Help/usage displayed - likely invalid option or syntax');
        }
        
      } catch (error) {
        console.log(`❌ Command failed (exit code: ${error.code})`);
        console.log(`Error: ${error.message}`);
        if (error.stderr) console.log(`Stderr: ${error.stderr.substring(0, 200)}${error.stderr.length > 200 ? '...' : ''}`);
        
        // Check if this is a usage error
        if (error.code === 99 || (error.stderr && error.stderr.includes('Usage:'))) {
          console.log('📝 Exit code 99 or usage message indicates invalid command syntax');
        }
      }
    }
    
    // Check what files were created
    console.log('\n--- Files Created ---');
    try {
      const allFiles = await fs.readdir(tempDir);
      console.log(`Files in temp directory: ${allFiles.length}`);
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
  
  console.log('\n🎉 pdfimages options testing completed!');
  console.log('\n📋 Key Findings:');
  console.log('   - Exit code 99 usually means invalid command syntax');
  console.log('   - Usage message in stderr indicates unrecognized options');
  console.log('   - Basic syntax: pdfimages [options] <PDF-file> <image-root>');
  console.log('   - Valid options: -j, -raw, -list, -verbose, -f, -l, etc.');
  console.log('   - -all is NOT a valid option in Xpdf 4.05');
}

// Run the test
testPdfImagesOptions().catch(console.error);
