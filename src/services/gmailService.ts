/**
 * Gmail Integration Service (PWA Engine v60)
 * Handles all REST API requests to Google Gmail API using the authorized bearer token.
 */

export interface GmailMessage {
  id: string;
  threadId: string;
  snippet: string;
  internalDate: string;
  subject?: string;
  from?: string;
  date?: string;
  body?: string;
}

/**
 * Base64URL encoder that correctly handles Unicode (Hebrew, etc.) characters.
 */
function base64urlEncode(str: string): string {
  const utf8Bytes = new TextEncoder().encode(str);
  let binary = '';
  utf8Bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Helper to decode body content from Gmail message structure.
 */
function decodeMessagePart(part: any): string {
  if (part.body && part.body.data) {
    try {
      const base64 = part.body.data.replace(/-/g, '+').replace(/_/g, '/');
      const binStr = atob(base64);
      const bytes = new Uint8Array(binStr.length);
      for (let i = 0; i < binStr.length; i++) {
        bytes[i] = binStr.charCodeAt(i);
      }
      return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
      console.warn("Failed to decode message part", e);
      return '';
    }
  }

  if (part.parts && part.parts.length > 0) {
    return part.parts.map((p: any) => decodeMessagePart(p)).join('\n');
  }

  return '';
}

/**
 * Fetch list of messages
 */
export async function listGmailMessages(token: string, q = ''): Promise<GmailMessage[]> {
  try {
    const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
    url.searchParams.append('maxResults', '15');
    if (q) {
      url.searchParams.append('q', q);
    }

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Gmail API returned code ${response.status}`);
    }

    const data = await response.json();
    if (!data.messages) return [];

    // Fetch individual messages details in parallel (max 10 to be nice)
    const messagesDetails = await Promise.all(
      data.messages.slice(0, 10).map(async (msg: { id: string }) => {
        try {
          return await getGmailMessage(token, msg.id);
        } catch (err) {
          console.error(`Failed to get details for Gmail msg ${msg.id}`, err);
          return null;
        }
      })
    );

    return messagesDetails.filter((m): m is GmailMessage => m !== null);
  } catch (err) {
    console.error("Error listing Gmail messages:", err);
    throw err;
  }
}

/**
 * Fetch individual message details
 */
export async function getGmailMessage(token: string, messageId: string): Promise<GmailMessage> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`;
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error(`Gmail API dynamic fetch returned code ${response.status}`);
  }

  const data = await response.json();
  const headers = data.payload?.headers || [];
  const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || 'אין נושא';
  const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || 'לא ידוע';
  const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';

  // Parse body
  let body = '';
  if (data.payload) {
    body = decodeMessagePart(data.payload);
  }
  if (!body) {
    body = data.snippet || '';
  }

  return {
    id: data.id,
    threadId: data.threadId,
    snippet: data.snippet || '',
    internalDate: data.internalDate,
    subject,
    from,
    date,
    body
  };
}

/**
 * Send Gmail email message
 */
export async function sendGmailMessage(
  token: string,
  to: string,
  subject: string,
  body: string
): Promise<any> {
  // Construct email in RFC 822 format (Plain MIME)
  const mimeParts = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`, // Properly base64 encode utf-8 headers
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    body
  ];

  const rawMime = mimeParts.join('\r\n');
  const encodedRaw = base64urlEncode(rawMime);

  const url = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      raw: encodedRaw
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail Send returned code ${response.status}: ${errorText}`);
  }

  return await response.json();
}
