import admin from 'firebase-admin';

const required = ['TARGET_PROJECT_ID', 'OLD_CLOUDINARY_CLOUD_NAME', 'NEW_CLOUDINARY_CLOUD_NAME'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing env var: ${key}`);
  }
}

const projectId = process.env.TARGET_PROJECT_ID;
const oldCloud = process.env.OLD_CLOUDINARY_CLOUD_NAME;
const newCloud = process.env.NEW_CLOUDINARY_CLOUD_NAME;

const collections = (process.env.FIRESTORE_COLLECTIONS || 'announcements,events,officers')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

const oldBase = `res.cloudinary.com/${oldCloud}`;
const newBase = `res.cloudinary.com/${newCloud}`;

admin.initializeApp({ projectId });
const db = admin.firestore();

function deepReplace(value) {
  if (typeof value === 'string') {
    if (value.includes(oldBase)) {
      return { changed: true, value: value.replaceAll(oldBase, newBase) };
    }
    return { changed: false, value };
  }

  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const out = deepReplace(item);
      if (out.changed) {
        changed = true;
      }
      return out.value;
    });
    return { changed, value: next };
  }

  if (value && typeof value === 'object') {
    let changed = false;
    const next = {};
    for (const [k, v] of Object.entries(value)) {
      const out = deepReplace(v);
      if (out.changed) {
        changed = true;
      }
      next[k] = out.value;
    }
    return { changed, value: next };
  }

  return { changed: false, value };
}

async function processCollection(name) {
  const snap = await db.collection(name).get();
  let changedDocs = 0;

  for (const docSnap of snap.docs) {
    const original = docSnap.data();
    const out = deepReplace(original);

    if (!out.changed) {
      continue;
    }

    await docSnap.ref.set(out.value, { merge: true });
    changedDocs += 1;
    console.log(`Updated ${name}/${docSnap.id}`);
  }

  return { collection: name, totalDocs: snap.size, changedDocs };
}

async function main() {
  console.log(`Rewriting Firestore URLs from '${oldBase}' to '${newBase}' in project '${projectId}'...`);

  const results = [];
  for (const name of collections) {
    const result = await processCollection(name);
    results.push(result);
  }

  const summary = results
    .map((r) => `${r.collection}: ${r.changedDocs}/${r.totalDocs} docs changed`)
    .join(' | ');

  console.log(`Done. ${summary}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
