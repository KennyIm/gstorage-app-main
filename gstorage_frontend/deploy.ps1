$BUCKET = "s3://gstorage-frontend-medalla"
$DIST_ID = "EYFTRJ6ZJ9NS7"

npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

aws s3 sync dist/ "$BUCKET" --exclude "index.html" --cache-control "public, max-age=31536000, immutable"
aws s3 cp dist/index.html "$BUCKET/index.html" --metadata-directive REPLACE --cache-control "max-age=0, no-cache, no-store, must-revalidate" --content-type "text/html"
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/index.html"