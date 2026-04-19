import admin from 'firebase-admin';

const required = [
  'TARGET_PROJECT_ID',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_UPLOAD_PRESET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const projectId = process.env.TARGET_PROJECT_ID;
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

const collections = (process.env.FIRESTORE_COLLECTIONS || 'announcements,events,officers')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const imageFieldByCollection = {
  announcements: 'imageUrl',
  events: 'imageUrl',
  officers: 'image',
};

const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

admin.initializeApp({ projectId });
const db = admin.firestore();

async function uploadRemoteImageToCloudinary(sourceUrl, folder) {
  const body = new FormData();
  body.append('file', sourceUrl);
  body.append('upload_preset', uploadPreset);
  body.append('folder', folder);

  const response = await fetch(uploadUrl, {
    method: 'POST',
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Cloudinary upload failed (${response.status})`);
  }

  if (!payload?.secure_url) {
    throw new Error('Cloudinary upload returned no secure_url');
  }

  return payload.secure_url;
}

async function processCollection(collectionName) {
  const imageField = imageFieldByCollection[collectionName];
  if (!imageField) {
    console.log(`Skipping unknown collection mapping: ${collectionName}`);
    return { collectionName, inspected: 0, migrated: 0, skipped: 0, failed: 0 };
  }

  const snapshot = await db.collection(collectionName).get();
  let inspected = 0;
  let migrated = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    inspected += 1;
    const data = docSnap.data();
    const currentUrl = data?.[imageField];

    if (typeof currentUrl !== 'string' || !currentUrl.trim()) {
      skipped += 1;
      continue;
    }

    if (currentUrl.includes(`res.cloudinary.com/${cloudName}`)) {
      skipped += 1;
      continue;
    }

    try {
      const secureUrl = await uploadRemoteImageToCloudinary(currentUrl, `ssite/${collectionName}`);
      await docSnap.ref.set(
        {
          [imageField]: secureUrl,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      migrated += 1;
      console.log(`Migrated ${collectionName}/${docSnap.id}`);
    } catch (error) {
      failed += 1;
      console.log(`Failed ${collectionName}/${docSnap.id}: ${error.message}`);
    }
  }

  return { collectionName, inspected, migrated, skipped, failed };
}

async function main() {
  console.log(`Migrating external image URLs to Cloudinary (${cloudName}) in project '${projectId}'...`);
  const results = [];

  for (const collectionName of collections) {
    const result = await processCollection(collectionName);
    results.push(result);
  }

  const summary = results
    .map((result) => {
      return `${result.collectionName}: migrated ${result.migrated}, skipped ${result.skipped}, failed ${result.failed}, inspected ${result.inspected}`;
    })
    .join(' | ');

  console.log(`Done. ${summary}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
