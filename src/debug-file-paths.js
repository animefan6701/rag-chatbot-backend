import fs from 'fs/promises';
import path from 'path';

async function debugFilePaths() {
  console.log('🔍 Debugging File Path Issues\n');

  // Check current working directory
  console.log('--- Current Working Directory ---');
  console.log(`process.cwd(): ${process.cwd()}`);
  console.log(`__dirname equivalent: ${path.dirname(new URL(import.meta.url).pathname)}`);

  // Check uploads directory
  console.log('\n--- Uploads Directory ---');
  const uploadsDir = path.join(process.cwd(), 'uploads');
  console.log(`Uploads directory: ${uploadsDir}`);
  
  try {
    await fs.access(uploadsDir);
    console.log('✅ Uploads directory exists');
    
    const files = await fs.readdir(uploadsDir);
    console.log(`Files in uploads: ${files.length}`);
    
    if (files.length > 0) {
      console.log('Recent files:');
      for (const file of files.slice(0, 5)) {
        const filePath = path.join(uploadsDir, file);
        try {
          const stats = await fs.stat(filePath);
          console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toISOString()})`);
        } catch (statError) {
          console.log(`  - ${file} (could not stat: ${statError.message})`);
        }
      }
    }
  } catch (accessError) {
    console.log('❌ Uploads directory not accessible');
    console.log(`Error: ${accessError.message}`);
  }

  // Check temp directory
  console.log('\n--- Temp Directory ---');
  const tempDir = path.join(process.cwd(), 'temp');
  console.log(`Temp directory: ${tempDir}`);
  
  try {
    await fs.access(tempDir);
    console.log('✅ Temp directory exists');
    
    const tempFiles = await fs.readdir(tempDir);
    console.log(`Items in temp: ${tempFiles.length}`);
    
    if (tempFiles.length > 0) {
      console.log('Recent temp items:');
      for (const item of tempFiles.slice(0, 5)) {
        const itemPath = path.join(tempDir, item);
        try {
          const stats = await fs.stat(itemPath);
          const type = stats.isDirectory() ? 'DIR' : 'FILE';
          console.log(`  - ${item} (${type}, ${stats.mtime.toISOString()})`);
        } catch (statError) {
          console.log(`  - ${item} (could not stat: ${statError.message})`);
        }
      }
    }
  } catch (accessError) {
    console.log('❌ Temp directory not accessible');
    console.log(`Error: ${accessError.message}`);
    
    // Try to create it
    try {
      await fs.mkdir(tempDir, { recursive: true });
      console.log('✅ Created temp directory');
    } catch (createError) {
      console.log(`❌ Could not create temp directory: ${createError.message}`);
    }
  }

  // Test path normalization
  console.log('\n--- Path Normalization Tests ---');
  const testPaths = [
    'uploads\\test.pdf',
    'uploads/test.pdf',
    path.join('uploads', 'test.pdf'),
    path.resolve('uploads', 'test.pdf')
  ];

  for (const testPath of testPaths) {
    console.log(`Original: "${testPath}"`);
    console.log(`  Resolved: "${path.resolve(testPath)}"`);
    console.log(`  Normalized: "${path.normalize(testPath)}"`);
    console.log(`  Platform separator: "${testPath.replace(/[/\\]/g, path.sep)}"`);
    console.log();
  }

  // Test file creation and access
  console.log('--- File Creation Test ---');
  const testFilePath = path.join(process.cwd(), 'temp', 'test-file.txt');
  
  try {
    await fs.mkdir(path.dirname(testFilePath), { recursive: true });
    await fs.writeFile(testFilePath, 'Test content');
    console.log(`✅ Created test file: ${testFilePath}`);
    
    // Test access
    await fs.access(testFilePath);
    console.log('✅ Test file is accessible');
    
    // Test with different path formats
    const windowsPath = testFilePath.replace(/\//g, '\\');
    const unixPath = testFilePath.replace(/\\/g, '/');
    
    console.log(`Testing Windows path: ${windowsPath}`);
    try {
      await fs.access(windowsPath);
      console.log('✅ Windows path format works');
    } catch (winError) {
      console.log(`❌ Windows path format failed: ${winError.message}`);
    }
    
    console.log(`Testing Unix path: ${unixPath}`);
    try {
      await fs.access(unixPath);
      console.log('✅ Unix path format works');
    } catch (unixError) {
      console.log(`❌ Unix path format failed: ${unixError.message}`);
    }
    
    // Cleanup
    await fs.unlink(testFilePath);
    console.log('✅ Cleaned up test file');
    
  } catch (testError) {
    console.log(`❌ File creation test failed: ${testError.message}`);
  }

  console.log('\n🎉 File path debugging completed!');
  console.log('\n📋 Recommendations:');
  console.log('   - Always use path.resolve() for absolute paths');
  console.log('   - Use path.join() for combining path segments');
  console.log('   - Check file existence with fs.access() before processing');
  console.log('   - Create temporary files with proper extensions');
}

// Run the debug
debugFilePaths().catch(console.error);
