/**
 * Google Calendar Integration Service (PWA Engine v63)
 * Handles all REST API requests to Google Calendar API v3 using the authorized bearer token.
 */

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
  status?: string;
  created?: string;
  updated?: string;
}

/**
 * Fetch list of upcoming events from the user's primary calendar
 */
export async function listCalendarEvents(token: string, maxResults = 50): Promise<GoogleCalendarEvent[]> {
  try {
    const timeMin = new Date().toISOString(); // Only get upcoming events or very recent ones from today onwards
    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', timeMin);
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');
    url.searchParams.append('maxResults', String(maxResults));

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Calendar API returned code ${response.status} when listing events`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error("Error listing Google calendar events:", err);
    throw err;
  }
}

/**
 * Create a new event in the primary calendar
 */
export async function createCalendarEvent(
  token: string,
  event: {
    summary: string;
    description?: string;
    location?: string;
    startTime: string; // ISO String
    endTime: string;   // ISO String
  }
): Promise<GoogleCalendarEvent> {
  try {
    const body = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: event.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      },
      end: {
        dateTime: event.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      }
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Calendar API returned code ${response.status} when creating event: ${text}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error creating Google calendar event:", err);
    throw err;
  }
}

/**
 * Update an existing calendar event (Patch)
 */
export async function updateCalendarEvent(
  token: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    location?: string;
    startTime?: string;
    endTime?: string;
  }
): Promise<GoogleCalendarEvent> {
  try {
    const body: any = {};
    if (updates.summary !== undefined) body.summary = updates.summary;
    if (updates.description !== undefined) body.description = updates.description;
    if (updates.location !== undefined) body.location = updates.location;
    if (updates.startTime) {
      body.start = {
        dateTime: updates.startTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      };
    }
    if (updates.endTime) {
      body.end = {
        dateTime: updates.endTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jerusalem'
      };
    }

    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      style: undefined, // no-op but clean
      body: JSON.stringify(body)
    } as any);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Calendar API returned code ${response.status} when updating event: ${text}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error updating Google calendar event:", err);
    throw err;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteCalendarEvent(token: string, eventId: string): Promise<void> {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Calendar API returned code ${response.status} when deleting event: ${text}`);
    }
  } catch (err) {
    console.error("Error deleting Google calendar event:", err);
    throw err;
  }
}
