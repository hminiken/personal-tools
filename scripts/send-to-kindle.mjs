// Send all unshelved BookLore books to the Kindles.
//
// For each unshelved book: emails it to every configured recipient, adds a
// "Sent to kindle" tag, and files it on the "Sent to Kindle" shelf so it
// won't be picked up again. Idempotent — books already shelved are ignored.
//
// Config comes from env (set in .env.local, inherited when run from the
// Misc Tools page). Standalone:
//   node --env-file=.env.local scripts/send-to-kindle.mjs

const BASE_URL = process.env.BOOKLORE_URL;
const USERNAME = process.env.BOOKLORE_USER;
const PASSWORD = process.env.BOOKLORE_PASS;

const SENT_TO_KINDLE_SHELF_ID = 5;
const EMAIL_PROVIDER_ID = 1;
const RECIPIENT_IDS = [1, 2];
const TAG_TO_ADD = 'Sent to kindle';

if (!BASE_URL || !USERNAME || !PASSWORD) {
  console.error('Missing BOOKLORE_URL / BOOKLORE_USER / BOOKLORE_PASS env vars.');
  process.exit(1);
}

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

console.log('Authenticating...');
let token;
try {
  const login = await api('/auth/login', {
    method: 'POST',
    body: { username: USERNAME, password: PASSWORD },
  });
  token = login.accessToken;
  console.log('[+] Logged in\n');
} catch (e) {
  console.error(`[-] Login failed: ${e.message}`);
  process.exit(1);
}

console.log('Fetching unshelved books...');
let bookIds;
try {
  bookIds = (await api('/app/books/ids?unshelved=true', { token })) ?? [];
} catch (e) {
  console.error(`[-] Failed to fetch unshelved books: ${e.message}`);
  process.exit(1);
}

if (bookIds.length === 0) {
  console.log('No unshelved books found. Nothing to do.');
  process.exit(0);
}
console.log(`Found ${bookIds.length} book(s) to process.\n`);

let failures = 0;

for (const bookId of bookIds) {
  let bookDetails;
  try {
    bookDetails = await api(`/books/${bookId}`, { token });
    console.log(`Processing: ${bookDetails.title} (ID: ${bookId})`);
  } catch (e) {
    console.error(`[-] Failed to fetch details for book ID ${bookId}, skipping: ${e.message}`);
    failures += 1;
    continue;
  }

  for (const recipientId of RECIPIENT_IDS) {
    try {
      await api('/email/book', {
        method: 'POST',
        token,
        body: { bookId, providerId: EMAIL_PROVIDER_ID, recipientId },
      });
      console.log(`  [+] Emailed to recipient ${recipientId}`);
    } catch (e) {
      console.error(`  [-] Failed to email recipient ${recipientId}: ${e.message}`);
      failures += 1;
    }
  }

  try {
    const metadata = bookDetails.metadata ?? {};
    const currentTags = metadata.tags ?? [];
    if (!currentTags.includes(TAG_TO_ADD)) {
      metadata.tags = [...currentTags, TAG_TO_ADD];
      await api(`/books/${bookId}/metadata`, { method: 'PUT', token, body: metadata });
      console.log(`  [+] Tag '${TAG_TO_ADD}' added`);
    } else {
      console.log('  [-] Tag already exists, skipping.');
    }
  } catch (e) {
    console.error(`  [-] Failed to update tags: ${e.message}`);
    failures += 1;
  }

  try {
    await api('/books/shelves', {
      method: 'POST',
      token,
      body: {
        bookIds: [bookId],
        shelvesToAssign: [SENT_TO_KINDLE_SHELF_ID],
        shelvesToUnassign: [],
      },
    });
    console.log("  [+] Assigned to 'Sent to Kindle' shelf");
  } catch (e) {
    console.error(`  [-] Failed to assign to shelf: ${e.message}`);
    failures += 1;
  }

  console.log('--------------------------------------');
}

if (failures > 0) {
  console.error(`Finished with ${failures} failure(s) — see above.`);
  process.exit(1);
}
console.log('Finished processing all books!');
