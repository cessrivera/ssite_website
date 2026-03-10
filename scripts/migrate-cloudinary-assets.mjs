import crypto from 'node:crypto';
import fs from 'node:fs/promises';

const required = [
  'OLD_CLOUDINARY_CLOUD_NAME',
  'OLD_CLOUDINARY_API_KEY',
  'OLD_CLOUDINARY_API_SECRET',
  'NEW_CLOUDINARY_CLOUD_NAME',
  'NEW_CLOUDINARY_API_KEY',
  'NEW_CLOUDINARY_API_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const oldCloud = process.env.OLD_CLOUDINARY_CLOUD_NAME;
const oldKey = process.env.OLD_CLOUDINARY_API_KEY;
const oldSecret = process.env.OLD_CLOUDINARY_API_SECRET;
const newCloud = process.env.NEW_CLOUDINARY_CLOUD_NAME;
const newKey = process.env.NEW_CLOUDINARY_API_KEY;
const newSecret = process.env.NEW_CLOUDINARY_API_SECRET;

const prefix = process.env.CLOUDINARY_PREFIX || 'ssite';
const maxToCopy = Number(process.env.CLOUDINARY_MAX_TO_COPY || '0');
const concurrency = Number(process.env.CLOUDINARY_CONCURRENCY || '4');

const oldAuth = Buffer.from(`${oldKey}:${oldSecret}`).toString('base64');

function signUpload(params, apiSecret) {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');

  return crypto.createHash('sha1').update(sorted + apiSecret).digest('hex');
}

async function listOldResources() {
  const all = [];
  let nextCursor = null;

  while (true) {
    const query = new URLSearchParams({
      max_results: '500',
      prefix,
      type: 'upload',
    });

    if (nextCursor) {
      query.set('next_cursor', nextCursor);
    }

    const url = `https://api.cloudinary.com/v1_1/${oldCloud}/resources/image?${query.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Basic ${oldAuth}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed listing old resources: ${res.status} ${errText}`);
    }

    const data = await res.json();
    all.push(...(data.resources || []));

    if (!data.next_cursor) {
      break;
    }

    nextCursor = data.next_cursor;

    if (maxToCopy > 0 && all.length >= maxToCopy) {
      break;
    }
  }

  return maxToCopy > 0 ? all.slice(0, maxToCopy) : all;
}

async function copyOne(resource) {
  const timestamp = Math.floor(Date.now() / 1000);

  const signable = {
    overwrite: 'true',
    public_id: resource.public_id,
    timestamp: String(timestamp),
  };

  const signature = signUpload(signable, newSecret);

  const body = new URLSearchParams({
    api_key: newKey,
    file: resource.secure_url,
    overwrite: 'true',
    public_id: resource.public_id,
    signature,
    timestamp: String(timestamp),
  });

  const uploadUrl = `https://api.cloudinary.com/v1_1/${newCloud}/image/upload`;
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed for ${resource.public_id}: ${res.status} ${errText}`);
  }

  const uploaded = await res.json();
  return {
    publicId: resource.public_id,
    oldUrl: resource.secure_url,
    newUrl: uploaded.secure_url,
  };
}

async function runPool(items, worker, limit) {
  const results = [];
  let i = 0;

  async function next() {
    if (i >= items.length) {
      return;
    }

    const idx = i;
    i += 1;

    try {
      const out = await worker(items[idx]);
      results[idx] = { ok: true, value: out };
      console.log(`[${idx + 1}/${items.length}] Copied ${items[idx].public_id}`);
    } catch (error) {
      results[idx] = { ok: false, error: String(error), publicId: items[idx].public_id };
      console.error(`[${idx + 1}/${items.length}] Failed ${items[idx].public_id}: ${error}`);
    }

    await next();
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => next()));
  return results;
}

async function main() {
  console.log(`Listing resources from old cloud '${oldCloud}' with prefix '${prefix}'...`);
  const resources = await listOldResources();
  console.log(`Found ${resources.length} resources to copy.`);

  if (resources.length === 0) {
    console.log('Nothing to copy. Exiting.');
    return;
  }

  const poolResults = await runPool(resources, copyOne, concurrency);

  const success = poolResults.filter((r) => r.ok).map((r) => r.value);
  const failed = poolResults.filter((r) => !r.ok);

  await fs.writeFile(
    'cloudinary-migration-map.json',
    JSON.stringify(
      {
        oldCloud,
        newCloud,
        prefix,
        copiedCount: success.length,
        failedCount: failed.length,
        copied: success,
        failed,
      },
      null,
      2,
    ),
    'utf8',
  );

  console.log(`Done. Copied: ${success.length}, failed: ${failed.length}`);
  console.log('Wrote mapping to cloudinary-migration-map.json');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
