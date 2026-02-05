/**
 * Fix placeholder geometry for manually-added featured trails
 * 
 * These trails were added before COTREX import with simplified geometry.
 * This script replaces their geometry with matching COTREX trails.
 * 
 * Usage: npx tsx scripts/fix-placeholder-geometry.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Manual trail ID -> COTREX trail ID mapping
// Based on name matching and location verification
const GEOMETRY_FIXES: Record<number, number> = {
  1: 2383,   // Apex Trail -> Apex Trail (108 pts)
  // 2: skip - Betasso Canyon has unique loop, no exact match
  3: 1511,   // Hall Ranch - Nelson Loop -> Nelson Loop Trail (191 pts)
  // 4: skip - White Ranch Longhorn is multi-segment, no single match
  // 5: skip - Marshall Mesa Trail not in COTREX
  6: 300,    // Walker Ranch Loop -> Walker Ranch Loop (1181 pts)
  7: 541,    // Heil Valley - Wapiti -> Wapiti Trail (575 pts)
  // 8: skip - Colorado Trail Buffalo Creek section not a single trail
  9: 697,    // Dakota Ridge Trail -> Dakota Ridge Trail (459 pts)
  10: 313,   // North Table Mountain Loop -> North Table Loop (620 pts)
  11: 1352,  // Chimney Gulch Trail -> Chimney Gulch Trail (232 pts)
  12: 580,   // Lair O' the Bear - Creekside -> Creekside Trail (542 pts)
  13: 795,   // Mount Falcon - Castle Trail -> Castle Trail (287 pts)
  14: 1754,  // Green Mountain - Hayden Trail -> Hayden Trail (132 pts)
  // 15: skip - South Valley Coyote Song not in COTREX by that name
  // 16: skip - Centennial Cone Travois not in COTREX
  // 17: skip - Reynolds Park Eagle's View not in COTREX
  18: 1081,  // Elk Meadow - Bergen Peak -> Bergen Peak Trail (264 pts)
  19: 2254,  // Alderfer/Three Sisters -> Sisters Trail (380 pts)
  // 20: skip - Meyer Ranch Lodgepole not in COTREX
  21: 1759,  // Horsetooth Falls Trail -> Horsetooth Rock Trail (234 pts)
  // 22: skip - Lory State Park Arthur's Rock not in COTREX
  23: 367,   // Bear Creek Lake - Mount Carbon Loop -> Mt Carbon Loop (380 pts)
  // 24: skip - Coot Lake not in COTREX with good geometry
};

async function fixGeometry() {
  console.log('🔧 Fixing Placeholder Geometry');
  console.log('==============================\n');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  let fixed = 0;
  let errors = 0;

  for (const [manualId, cotrexId] of Object.entries(GEOMETRY_FIXES)) {
    const targetId = parseInt(manualId);
    const sourceId = cotrexId;

    // Get source geometry
    const { data: source, error: sourceError } = await supabase
      .from('trails')
      .select('name, geometry')
      .eq('id', sourceId)
      .single();

    if (sourceError || !source) {
      console.log(`❌ Source ID ${sourceId} not found`);
      errors++;
      continue;
    }

    // Get target trail name
    const { data: target, error: targetError } = await supabase
      .from('trails')
      .select('name')
      .eq('id', targetId)
      .single();

    if (targetError || !target) {
      console.log(`❌ Target ID ${targetId} not found`);
      errors++;
      continue;
    }

    // Update geometry
    const { error: updateError } = await supabase
      .from('trails')
      .update({ geometry: source.geometry })
      .eq('id', targetId);

    if (updateError) {
      console.log(`❌ Failed to update ID ${targetId}: ${updateError.message}`);
      errors++;
    } else {
      console.log(`✅ ${target.name} <- ${source.name}`);
      fixed++;
    }
  }

  console.log('\n==============================');
  console.log(`Fixed: ${fixed} trails`);
  console.log(`Errors: ${errors}`);
  console.log('\nRun generate-predictions.ts to rebuild predictions.json');
}

fixGeometry().catch(console.error);
