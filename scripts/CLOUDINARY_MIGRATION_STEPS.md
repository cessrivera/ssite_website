# Cloudinary Account Migration Steps

This project now points new uploads to:
- `VITE_CLOUDINARY_CLOUD_NAME=dphrxngbc`

## 1. In the new Cloudinary account
1. Create an unsigned upload preset named `site_uploads`.
2. Ensure folder mode allows paths like `ssite/officers`, `ssite/events`, etc.
3. Get API credentials from Dashboard:![1773561902660](image/CLOUDINARY_MIGRATION_STEPS/1773561902660.png)
   - Cloud name
   - API key
   - API secret

## 2. Install dependencies
Run once from project root:

```powershell
npm install
```

## 3. Copy assets old -> new Cloudinary
Set env vars in the same terminal session and run migration:

```powershell
$env:OLD_CLOUDINARY_CLOUD_NAME="dnux0xjzr"
$env:OLD_CLOUDINARY_API_KEY="<old_api_key>"
$env:OLD_CLOUDINARY_API_SECRET="<old_api_secret>"
$env:NEW_CLOUDINARY_CLOUD_NAME="dphrxngbc"
$env:NEW_CLOUDINARY_API_KEY="<new_api_key>"
$env:NEW_CLOUDINARY_API_SECRET="<new_api_secret>"
$env:CLOUDINARY_PREFIX="ssite"
$env:CLOUDINARY_CONCURRENCY="4"

npm run migrate:cloudinary:assets
```

Output file:
- `cloudinary-migration-map.json` (old/new URL mapping + failures)

## 4. Rewrite Firestore URLs to new cloud name
Use a service account JSON key for the target Firebase project (the one your app uses).

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
$env:TARGET_PROJECT_ID="ssite-81018"
$env:OLD_CLOUDINARY_CLOUD_NAME="dnux0xjzr"
$env:NEW_CLOUDINARY_CLOUD_NAME="dphrxngbc"
$env:FIRESTORE_COLLECTIONS="announcements,events,officers"

npm run migrate:cloudinary:firestore
```

## 5. Verify
1. Open admin pages and check old entries still show images.
2. Create a new event/announcement/officer image and confirm URL uses `res.cloudinary.com/dphrxngbc`.
3. Confirm no failed records from script output.

## Notes
- If old Cloudinary account remains active, existing old URLs still work until you remove that account.
- Keep a backup of Firestore before URL rewrite.
