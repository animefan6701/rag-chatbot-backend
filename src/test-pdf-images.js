import 'dotenv/config';
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

async function testPdfImageExtraction() {
  console.log('Testing PDF processing...');
  
  try {
    // Check if there's a test PDF file in uploads
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const files = await fs.readdir(uploadsDir).catch(() => []);
    
    if (files.length === 0) {
      console.log('❌ No files found in uploads directory');
      console.log('Please upload a PDF file first, then run this test');
      return;
    }
    
    const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'));
    if (pdfFiles.length === 0) {
      console.log('❌ No PDF files found in uploads directory');
      return;
    }
    
    const testFile = path.join(uploadsDir, pdfFiles[0]);
    console.log(`Testing with file: ${pdfFiles[0]}`);
    
    const buffer = await fs.readFile(testFile);
    
    // Test PDF processing
    console.log('\n1. Testing PDF processing...');
    
    const pdfData = await pdf(buffer);
    console.log(`✅ PDF loaded with ${pdfData.numpages} pages`);
    console.log(`   - Text length: ${pdfData.text.length} characters`);
    console.log(`   - Info: ${JSON.stringify(pdfData.info, null, 2)}`);
    
    console.log('\nNote: For image extraction from PDFs, consider using:');
    console.log('   - DOCX files (already supported)');
    console.log('   - pdf-lib library');
    console.log('   - pdf2pic library');
    console.log('   - Or implement page rendering as images');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Error details:', error.message);
  }
}

testPdfImageExtraction();
