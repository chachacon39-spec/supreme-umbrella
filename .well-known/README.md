# Digital Asset Links — placeholder, do not ship as-is

`assetlinks.json` proves to Chrome that the Quill & Ledger Android app
(a Trusted Web Activity) and this website belong to the same owner. Until
both placeholders below are replaced with real values, the app will still
open, but Chrome will show a browser address bar at the top instead of
running fullscreen.

1. **package_name** — the Android package name of the TWA. It is in the
   Bubblewrap project as `packageId` in `twa-manifest.json` (the value
   Bubblewrap generated when the wrapper was created).
2. **sha256_cert_fingerprints** — the SHA-256 fingerprint of the **app
   signing key**, not the upload key. In Play Console, after the app is
   created and the first AAB is uploaded: **Release > Setup > App signing
   > App signing key certificate > SHA-256 certificate fingerprint**.
   Paste that fingerprint here, replacing the placeholder, with no spaces
   or extra characters.

After replacing both values, push this repo so GitHub Pages serves the
file at:

  https://chachacon39-spec.github.io/supreme-umbrella/.well-known/assetlinks.json

It must be served as `application/json` over HTTPS from exactly that
path, with no redirect. Verify it at:

  https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://chachacon39-spec.github.io/supreme-umbrella&relation=delegate_permission/common.handle_all_urls
