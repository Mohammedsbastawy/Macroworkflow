import { execSync } from 'child_process';

console.log("Restarting directus_instance to flush collection permission cache...");
try {
  execSync('docker restart directus_instance', { encoding: 'utf-8' });
  console.log("Restarted OK.");
} catch (e) {
  console.error("Restart error:", e.message);
}
