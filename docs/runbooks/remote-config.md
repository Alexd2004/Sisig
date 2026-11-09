# Runbook: Remote Config, Kill Switches and Forced Update

Use this runbook to switch off ordering (for example during a POS outage), switch off
receipt scanning, show an announcement, or make outdated apps update. The values live in
`public.app_config` (PLAT-06). The admin team will build toggles for them. Until then,
change them with SQL as described here.

- How the table works: [SUPABASE.md](../SUPABASE.md#remote-config-app_config).
- How the app uses it: [ARCHITECTURE.md](../ARCHITECTURE.md#plat-06-remote-config-and-forced-update).

## Before you start

- **Environment.** Only the hosted dev project exists today. There is no staging or
  production project yet. Use the same steps there once they exist.
- **Where to run SQL.** Use either:
  - the Supabase dashboard: **SQL Editor**, then run the statement; or
  - the CLI from the repo root, once the project is linked
    ([SUPABASE.md](../SUPABASE.md#working-with-the-hosted-dev-project)):

    ```bash
    pnpm exec supabase db query --linked "select key, value from public.app_config order by key"
    ```

  Both run as a privileged role, so RLS does not stop a mistake. Run the `select` first.
  Studio's **Table Editor** works too: edit the `value` cell as JSON and set `updated_at`.
- **Values are JSON.** Booleans are `'true'` or `'false'`. Strings need JSON quotes inside
  the SQL quotes: `'"1.4.0"'`. Use `to_jsonb('text'::text)` for a message, so quotes in the
  text are escaped for you. `'null'` clears a value.
- **Set `updated_at = now()`** in every UPDATE. No trigger does it for you.
- **When it takes effect.** Open apps fetch the config every 5 minutes and every time they
  come back to the foreground. A fresh launch fetches it straight away.
- **A bad value is ignored.** If a value does not match its type (for example `'"1.4"'`
  for a version), the app uses its bundled default for that key and reports it. Check
  your value against the table in [SUPABASE.md](../SUPABASE.md#remote-config-app_config).

Check the current values:

```sql
select key, value, updated_at from public.app_config order by key;
```

## Switch off ordering

```sql
update public.app_config
   set value = 'false', updated_at = now()
 where key = 'ordering_enabled';

update public.app_config
   set value = to_jsonb('Online ordering is paused while we fix our till. Please order at the counter.'::text),
       updated_at = now()
 where key = 'ordering_paused_message';
```

The Order tab hides its menu and checkout and shows "Ordering is paused" with your message
(at most 280 characters). With `ordering_paused_message` set to `null`, the app shows its
own default text.

To confirm: open the app, send it to the background and bring it back, then open the Order
tab.

## Switch ordering back on

```sql
update public.app_config
   set value = 'true', updated_at = now()
 where key = 'ordering_enabled';

update public.app_config
   set value = 'null', updated_at = now()
 where key = 'ordering_paused_message';
```

## Switch receipt scanning off or on

```sql
update public.app_config
   set value = 'false', updated_at = now()   -- 'true' to switch it back on
 where key = 'receipt_scan_enabled';
```

No receipt-scan screen exists yet. The receipt-scanning feature reads this switch through
`useFeature('receiptScan')` when it is built.

## Force an update

Do these checks first. A mistake here locks customers out of the app.

1. **The new version is live in the store** for that platform, and your version number is
   not higher than the version in the store. Otherwise customers are asked to install an
   update that does not exist.
2. **The store link is set and works** for that platform (`store_url_ios` or
   `store_url_android`). Without a link, the app does not block (it fails open) and
   reports the problem, so the update would not be forced. The Android link is set by the
   baseline. The iOS link is `null` until the app has an App Store listing.
3. **Use the app's `version` (x.y.z)** from `apps/mobile/app.json` of the release you
   require, not a build number.

Store links must be https on `apps.apple.com` (iOS) or `play.google.com` (Android). The
app rejects any other value and reports it, then uses its bundled default for that key:
for iOS that is no link, so iOS is not blocked; for Android it is the Play listing for
`com.sisig.mobile`, so Android is still blocked with that link.

To see the screen without touching customers, test on Android (iOS has no store link
yet, so iOS fails open and shows nothing). In your local checkout, set `version` in
`apps/mobile/app.json` to `0.0.1` and restart Metro (the dev client reads the version from
Metro, so no rebuild is needed), then set `min_supported_version_android` to `'"0.0.2"'`.
Customers on real releases are not affected. Afterwards, set the minimum back to
`'"0.0.0"'` and do not commit the lowered `app.json` version. Do not test by setting the
minimum just above the current release: there is no staging project, so the minimum
applies to every customer at once.

Then set the minimum for one platform. For iOS, replace `REPLACE_WITH_APP_STORE_URL` with
the real listing link before you run it; as written, the app rejects it and iOS is not
blocked:

```sql
-- Set the App Store link once the listing exists.
update public.app_config
   set value = '"REPLACE_WITH_APP_STORE_URL"', updated_at = now()
 where key = 'store_url_ios';

update public.app_config
   set value = '"1.4.0"', updated_at = now()
 where key = 'min_supported_version_ios';      -- or min_supported_version_android
```

Installs below that version see a full-screen "Update required" screen with an "Update
now" button that opens the store. It cannot be dismissed. It appears on launch and on the
next foreground. An app that is offline at launch still shows it if its last fetched
config required it, but the app never blocks because of a failed fetch.

To undo, set the minimum back to `'"0.0.0"'`.

## Recommend an update

```sql
update public.app_config
   set value = '"1.4.0"', updated_at = now()
 where key = 'recommended_version';
```

Installs below that version, but not below the minimum, see a dismissible "A new version is
available" banner at the top of the Home tab, at most once per day. It uses the same store
links. To stop it, set the value back to `'"0.0.0"'`.

## Show or clear an announcement

```sql
update public.app_config
   set value = to_jsonb('Closed Monday for the holiday.'::text), updated_at = now()
 where key = 'announcement_message';

-- Clear it:
update public.app_config
   set value = 'null', updated_at = now()
 where key = 'announcement_message';
```

The announcement shows at the top of the Home tab until you clear it (at most 280
characters).

## Set the Uber Eats link

```sql
update public.app_config
   set value = '"https://www.ubereats.com/ca/store/..."', updated_at = now()
 where key = 'uber_eats_url';
```

The app validates it (https on `ubereats.com` only). No screen shows it yet.

## Do not

- Delete the baseline rows. The app falls back to its defaults, which is safe, but the
  `description` column that explains each key is lost.
- Add new keys for features that do not read them. Unknown keys are ignored and reported.
- Raise a minimum version above the latest store release.
