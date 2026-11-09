# Setup guide (about 20 minutes)

## 1. Supabase (database and photos)
1. Go to supabase.com, sign up, click **New project**. Name it `bazar`. Region: **Mumbai (ap-south-1)**. Save the database password.
2. Open **SQL Editor > New query**. Paste everything from `db/schema.sql`. Click **Run**.
3. Open **Project Settings > API**. Copy the **Project URL** and the **service_role** key (click Reveal). Keep the service_role key private.

## 2. Vercel settings
Vercel > your project > **Settings > Environment Variables**. Add the five variables from `vercel-env-values.txt`, plus the two Supabase values from step 1. Apply to all environments.

## 3. Upload to a preview branch first
Upload the new files to a new GitHub branch (for example `store`), inside the `bazar` folder. Vercel makes a private preview link for that branch. The live site stays untouched.

## 4. Test on the preview link
Open `/admin`, log in, create a category, add a product with photos and its WhatsApp link, then check the product on the preview site.

## 5. Go live
On GitHub, merge the `store` branch into `main`. Vercel updates clickfor.in.

## 6. First login
Log in at `https://www.clickfor.in/admin` and change the password under **Account**.
