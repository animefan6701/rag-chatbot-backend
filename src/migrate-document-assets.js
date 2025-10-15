import { sb } from './storage.js';

async function migrateDocumentAssets() {
  console.log('🔄 Migrating document_assets table to add metadata column\n');

  try {
    // Check if the metadata column already exists
    console.log('1. Checking current table structure...');
    
    // Try to select metadata column to see if it exists
    const { data: testData, error: testError } = await sb
      .from('document_assets')
      .select('metadata')
      .limit(1);
    
    if (testError && testError.code === 'PGRST204') {
      console.log('❌ metadata column does not exist - needs migration');
      
      console.log('\n2. Adding metadata column...');
      console.log('Please run the following SQL in your Supabase SQL editor:');
      console.log('\n--- SQL Migration ---');
      console.log('-- Add metadata column to document_assets table');
      console.log('ALTER TABLE document_assets ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT \'{}\'::jsonb;');
      console.log('\n-- Update existing records to have empty metadata');
      console.log('UPDATE document_assets SET metadata = \'{}\'::jsonb WHERE metadata IS NULL;');
      console.log('\n--- End SQL Migration ---\n');
      
      console.log('After running the SQL, restart your server and try uploading again.');
      
    } else if (testError) {
      console.error('❌ Error checking table structure:', testError);
      console.log('This might indicate the document_assets table doesn\'t exist.');
      console.log('\nPlease run the full schema from server/src/sql/supabase.schema.sql');
      
    } else {
      console.log('✅ metadata column already exists');
      
      // Test inserting a record with metadata
      console.log('\n2. Testing metadata column functionality...');
      const testDocId = '00000000-0000-0000-0000-000000000001';
      
      const { error: insertError } = await sb
        .from('document_assets')
        .insert({
          doc_id: testDocId,
          kind: 'test_migration',
          image_index: 999,
          url: 'https://example.com/test-migration.jpg',
          content_type: 'image/jpeg',
          metadata: {
            test: true,
            migration_check: new Date().toISOString(),
            width: 100,
            height: 100,
            extraction_method: 'test'
          }
        });
      
      if (insertError) {
        console.error('❌ Error testing metadata insert:', insertError);
      } else {
        console.log('✅ Successfully inserted test record with metadata');
        
        // Clean up test record
        const { error: deleteError } = await sb
          .from('document_assets')
          .delete()
          .eq('doc_id', testDocId)
          .eq('kind', 'test_migration');
        
        if (deleteError) {
          console.log('⚠️ Could not clean up test record (not critical)');
        } else {
          console.log('✅ Cleaned up test record');
        }
      }
    }
    
    // Show current table info
    console.log('\n3. Current document_assets table info...');
    const { data: existingRecords, error: countError } = await sb
      .from('document_assets')
      .select('id, doc_id, kind, page_index, image_index, content_type')
      .limit(5);
    
    if (countError) {
      console.error('❌ Error querying existing records:', countError);
    } else {
      console.log(`✅ Found ${existingRecords.length} existing records (showing first 5):`);
      existingRecords.forEach(record => {
        console.log(`  - ID: ${record.id}, Kind: ${record.kind}, Page: ${record.page_index}, Index: ${record.image_index}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration check failed:', error);
  }
  
  console.log('\n🎉 Migration check completed!');
  console.log('\n📋 Next Steps:');
  console.log('   1. If SQL migration is needed, run it in Supabase SQL editor');
  console.log('   2. Restart your server');
  console.log('   3. Try uploading a PDF with images again');
  console.log('   4. Check that metadata is properly stored');
}

// Run the migration check
migrateDocumentAssets().catch(console.error);
