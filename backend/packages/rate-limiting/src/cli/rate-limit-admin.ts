#!/usr/bin/env node

import { Command } from 'commander';
import * as Redis from 'ioredis';
import { config } from 'dotenv';

config();

const program = new Command();
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

program
  .name('rate-limit-admin')
  .description('CLI tool for managing rate limits')
  .version('1.0.0');

// Block IP command
program
  .command('block-ip <ip>')
  .description('Block an IP address')
  .option('-d, --duration <seconds>', 'Block duration in seconds', '3600')
  .option('-r, --reason <reason>', 'Reason for blocking', 'Manual block')
  .action(async (ip, options) => {
    try {
      const key = `rate-limit:blocked:ip:${ip}`;
      await redis.setex(key, options.duration, JSON.stringify({
        reason: options.reason,
        blockedAt: new Date().toISOString(),
        duration: options.duration,
      }));
      console.log(`✅ Blocked IP ${ip} for ${options.duration} seconds`);
      console.log(`   Reason: ${options.reason}`);
    } catch (error) {
      console.error('❌ Error blocking IP:', error.message);
    }
  });

// Unblock IP command
program
  .command('unblock-ip <ip>')
  .description('Unblock an IP address')
  .action(async (ip) => {
    try {
      const key = `rate-limit:blocked:ip:${ip}`;
      await redis.del(key);
      console.log(`✅ Unblocked IP ${ip}`);
    } catch (error) {
      console.error('❌ Error unblocking IP:', error.message);
    }
  });

// Block user command
program
  .command('block-user <userId>')
  .description('Block a user')
  .option('-d, --duration <seconds>', 'Block duration in seconds', '3600')
  .option('-r, --reason <reason>', 'Reason for blocking', 'Manual block')
  .action(async (userId, options) => {
    try {
      const key = `rate-limit:blocked:user:${userId}`;
      await redis.setex(key, options.duration, JSON.stringify({
        reason: options.reason,
        blockedAt: new Date().toISOString(),
        duration: options.duration,
      }));
      console.log(`✅ Blocked user ${userId} for ${options.duration} seconds`);
      console.log(`   Reason: ${options.reason}`);
    } catch (error) {
      console.error('❌ Error blocking user:', error.message);
    }
  });

// Unblock user command
program
  .command('unblock-user <userId>')
  .description('Unblock a user')
  .action(async (userId) => {
    try {
      const key = `rate-limit:blocked:user:${userId}`;
      await redis.del(key);
      console.log(`✅ Unblocked user ${userId}`);
    } catch (error) {
      console.error('❌ Error unblocking user:', error.message);
    }
  });

// List blocked IPs
program
  .command('list-blocked-ips')
  .description('List all blocked IP addresses')
  .action(async () => {
    try {
      const keys = await redis.keys('rate-limit:blocked:ip:*');
      if (keys.length === 0) {
        console.log('No blocked IPs found');
        return;
      }

      console.log('Blocked IPs:');
      console.log('─'.repeat(80));
      
      for (const key of keys) {
        const ip = key.replace('rate-limit:blocked:ip:', '');
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        if (data) {
          const blockInfo = JSON.parse(data);
          console.log(`IP: ${ip}`);
          console.log(`  Reason: ${blockInfo.reason}`);
          console.log(`  Blocked at: ${blockInfo.blockedAt}`);
          console.log(`  Expires in: ${ttl} seconds`);
          console.log('─'.repeat(80));
        }
      }
    } catch (error) {
      console.error('❌ Error listing blocked IPs:', error.message);
    }
  });

// List blocked users
program
  .command('list-blocked-users')
  .description('List all blocked users')
  .action(async () => {
    try {
      const keys = await redis.keys('rate-limit:blocked:user:*');
      if (keys.length === 0) {
        console.log('No blocked users found');
        return;
      }

      console.log('Blocked Users:');
      console.log('─'.repeat(80));
      
      for (const key of keys) {
        const userId = key.replace('rate-limit:blocked:user:', '');
        const data = await redis.get(key);
        const ttl = await redis.ttl(key);
        
        if (data) {
          const blockInfo = JSON.parse(data);
          console.log(`User ID: ${userId}`);
          console.log(`  Reason: ${blockInfo.reason}`);
          console.log(`  Blocked at: ${blockInfo.blockedAt}`);
          console.log(`  Expires in: ${ttl} seconds`);
          console.log('─'.repeat(80));
        }
      }
    } catch (error) {
      console.error('❌ Error listing blocked users:', error.message);
    }
  });

// View rate limit status
program
  .command('status <key>')
  .description('View rate limit status for a key')
  .action(async (key) => {
    try {
      const pattern = `rate-limit:*:${key}`;
      const keys = await redis.keys(pattern);
      
      if (keys.length === 0) {
        console.log(`No rate limit data found for key: ${key}`);
        return;
      }

      console.log(`Rate limit status for: ${key}`);
      console.log('─'.repeat(80));
      
      for (const redisKey of keys) {
        const data = await redis.get(redisKey);
        const ttl = await redis.ttl(redisKey);
        
        if (data) {
          console.log(`Key: ${redisKey}`);
          console.log(`  Data: ${data}`);
          console.log(`  TTL: ${ttl} seconds`);
          console.log('─'.repeat(40));
        }
      }
    } catch (error) {
      console.error('❌ Error getting status:', error.message);
    }
  });

// Reset rate limits
program
  .command('reset <pattern>')
  .description('Reset rate limits matching pattern')
  .option('-c, --confirm', 'Confirm the reset operation')
  .action(async (pattern, options) => {
    try {
      const keys = await redis.keys(`rate-limit:*:${pattern}`);
      
      if (keys.length === 0) {
        console.log(`No rate limit keys found matching pattern: ${pattern}`);
        return;
      }

      console.log(`Found ${keys.length} keys matching pattern: ${pattern}`);
      
      if (!options.confirm) {
        console.log('Use --confirm flag to actually delete these keys');
        console.log('Keys that would be deleted:');
        keys.forEach(key => console.log(`  - ${key}`));
        return;
      }

      for (const key of keys) {
        await redis.del(key);
      }
      
      console.log(`✅ Reset ${keys.length} rate limit keys`);
    } catch (error) {
      console.error('❌ Error resetting rate limits:', error.message);
    }
  });

// Analytics command
program
  .command('analytics')
  .description('View rate limit analytics')
  .option('-t, --top <n>', 'Show top N violators', '10')
  .action(async (options) => {
    try {
      const violationsKey = 'rate-limit:analytics:violations:*';
      const keys = await redis.keys(violationsKey);
      
      if (keys.length === 0) {
        console.log('No analytics data found');
        return;
      }

      const violations = [];
      
      for (const key of keys) {
        const data = await redis.get(key);
        if (data) {
          const parts = key.split(':');
          const identifier = parts[parts.length - 1];
          violations.push({
            identifier,
            count: parseInt(data),
          });
        }
      }
      
      // Sort by violation count
      violations.sort((a, b) => b.count - a.count);
      
      console.log(`Top ${options.top} Rate Limit Violators:`);
      console.log('─'.repeat(80));
      
      const topViolators = violations.slice(0, parseInt(options.top));
      topViolators.forEach((violator, index) => {
        console.log(`${index + 1}. ${violator.identifier}: ${violator.count} violations`);
      });
      
      console.log('─'.repeat(80));
      console.log(`Total unique violators: ${violations.length}`);
      console.log(`Total violations: ${violations.reduce((sum, v) => sum + v.count, 0)}`);
    } catch (error) {
      console.error('❌ Error getting analytics:', error.message);
    }
  });

// Whitelist IP
program
  .command('whitelist-add <ip>')
  .description('Add IP to whitelist')
  .action(async (ip) => {
    try {
      const key = `rate-limit:whitelist:ip:${ip}`;
      await redis.set(key, '1');
      console.log(`✅ Added ${ip} to whitelist`);
    } catch (error) {
      console.error('❌ Error whitelisting IP:', error.message);
    }
  });

// Remove from whitelist
program
  .command('whitelist-remove <ip>')
  .description('Remove IP from whitelist')
  .action(async (ip) => {
    try {
      const key = `rate-limit:whitelist:ip:${ip}`;
      await redis.del(key);
      console.log(`✅ Removed ${ip} from whitelist`);
    } catch (error) {
      console.error('❌ Error removing from whitelist:', error.message);
    }
  });

// List whitelist
program
  .command('whitelist-list')
  .description('List all whitelisted IPs')
  .action(async () => {
    try {
      const keys = await redis.keys('rate-limit:whitelist:ip:*');
      if (keys.length === 0) {
        console.log('No whitelisted IPs found');
        return;
      }

      console.log('Whitelisted IPs:');
      keys.forEach(key => {
        const ip = key.replace('rate-limit:whitelist:ip:', '');
        console.log(`  - ${ip}`);
      });
    } catch (error) {
      console.error('❌ Error listing whitelist:', error.message);
    }
  });

// Handle cleanup on exit
process.on('SIGINT', async () => {
  await redis.quit();
  process.exit(0);
});

program.parse(process.argv);