/**
 * downgrade_directus.mjs
 * =======================
 * Automatically stops the Directus v12 container and recreates it
 * using Directus v11.1.2 (unlimited self-hosted community edition).
 */

import { execSync } from 'child_process';

let dockerdPid;
try {
  dockerdPid = execSync("wsl -d docker-desktop -- pidof dockerd", { encoding: 'utf-8' }).trim();
} catch (e) {
  console.error("Could not find dockerd PID. Make sure Docker is running.");
  process.exit(1);
}

const CONTAINER_NAME = 'directus_instance';
const DOCKER_IMAGE   = 'directus/directus:11.1.2';
const DOCKER_SOCKET  = `unix:///proc/${dockerdPid}/root/run/docker.sock`;
const DOCKER_CMD     = `DOCKER_HOST="${DOCKER_SOCKET}" /mnt/docker-desktop-disk/tmp/docker/docker`;

function runWsl(cmd) {
  return execSync(`wsl -d docker-desktop -- sh -c "${cmd.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
}

console.log('\n══════════════════════════════════════════════');
console.log('  Downgrading Directus to v11 (Unlimited)');
console.log('══════════════════════════════════════════════\n');

try {
  // 1. Pull Directus 11.1.2
  console.log(`[1/4] Pulling ${DOCKER_IMAGE}...`);
  console.log('This might take a minute, please wait...');
  runWsl(`${DOCKER_CMD} pull ${DOCKER_IMAGE}`);
  console.log('  ✅ Image pulled successfully.');

  // 2. Stop existing Directus 12 container
  console.log(`[2/4] Stopping existing ${CONTAINER_NAME} container...`);
  try {
    runWsl(`${DOCKER_CMD} stop ${CONTAINER_NAME}`);
    console.log('  ✅ Stopped.');
  } catch (e) {
    console.log('  ⏭️  Container was not running or not found.');
  }

  // 3. Remove existing Directus 12 container
  console.log(`[3/4] Removing existing ${CONTAINER_NAME} container...`);
  try {
    runWsl(`${DOCKER_CMD} rm ${CONTAINER_NAME}`);
    console.log('  ✅ Removed.');
  } catch (e) {
    console.log('  ⏭️  Container not found.');
  }

  // 4. Create and start Directus 11.1.2 container
  console.log(`[4/4] Creating and starting Directus v11 container...`);
  const runCmd = `${DOCKER_CMD} run -d --name ${CONTAINER_NAME} -p 8055:8055 --network dashboardanalysis_default -e TELEMETRY=false -e DB_CLIENT=mysql -e DB_HOST=emacro_mysql -e DB_PORT=3306 -e DB_DATABASE=emacro_dashboard -e DB_USER=emacro -e DB_PASSWORD=emacro123 -e KEY=supersecretkey -e SECRET=supersecretsecret -e ADMIN_EMAIL=admin@example.com -e ADMIN_PASSWORD=admin ${DOCKER_IMAGE}`;

  const containerId = runWsl(runCmd).trim();
  console.log(`  ✅ Directus v11 started successfully! Container ID: ${containerId}`);
  console.log('\n🎉 Directus v11 is now running on http://localhost:8055 with no limits.');

} catch (e) {
  console.error('\n✗ Error during downgrade:', e.message);
  if (e.stdout) console.log('Stdout:', e.stdout);
  if (e.stderr) console.error('Stderr:', e.stderr);
}
