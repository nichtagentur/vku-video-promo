#!/usr/bin/env npx tsx

/**
 * Interactive Meta API Token Setup
 *
 * Guides you through setting up Instagram publishing:
 * 1. Create a Meta Developer App
 * 2. Get Instagram Business Account ID
 * 3. Generate and save access token
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import * as readline from 'readline';

const ENV_FILE = resolve(process.cwd(), '.env.local');

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('Instagram Publishing Setup');
  console.log('==========================\n');

  console.log('Prerequisites:');
  console.log('1. A Meta Developer App (https://developers.facebook.com/apps/)');
  console.log('2. A Facebook Page linked to an Instagram Business Account');
  console.log('3. App permissions: instagram_content_publish, instagram_basic, pages_read_engagement\n');

  const token = await ask('Enter your Meta Access Token: ');
  if (!token) {
    console.log('No token provided, exiting.');
    return;
  }

  // Verify token by fetching account info
  console.log('\nVerifying token...');
  try {
    const res = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=id,username&access_token=${token}`,
    );
    const data = await res.json();

    if (data.error) {
      console.error(`Token verification failed: ${data.error.message}`);
      console.log('\nMake sure your token has the correct permissions.');
      return;
    }

    console.log(`Account verified: @${data.username} (ID: ${data.id})`);

    // Save to .env.local
    let envContent = '';
    if (existsSync(ENV_FILE)) {
      envContent = readFileSync(ENV_FILE, 'utf-8');
    }

    // Remove existing entries
    envContent = envContent
      .replace(/^META_ACCESS_TOKEN=.*/m, '')
      .replace(/^INSTAGRAM_ACCOUNT_ID=.*/m, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    envContent += `\n\n# Instagram Publishing (added ${new Date().toISOString().slice(0, 10)})\nMETA_ACCESS_TOKEN=${token}\nINSTAGRAM_ACCOUNT_ID=${data.id}\n`;

    writeFileSync(ENV_FILE, envContent);
    console.log(`\nSaved to ${ENV_FILE}`);
    console.log('You can now run: npm run automate');

  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
  }
}

main();
