/**
 * Google Tasks Integration Service (PWA Engine v62)
 * Handles all REST API requests to Google Tasks API using the authorized bearer token.
 */

export interface GoogleTaskList {
  id: string;
  title: string;
  updated: string;
  selfLink: string;
}

export interface GoogleTask {
  id: string;
  title: string;
  updated: string;
  selfLink: string;
  parent?: string;
  position?: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  deleted?: boolean;
  hidden?: boolean;
}

/**
 * Fetch list of Task Lists
 */
export async function listTaskLists(token: string): Promise<GoogleTaskList[]> {
  try {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned code ${response.status} when listing lists`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error("Error listing Google task lists:", err);
    throw err;
  }
}

/**
 * Create a new Task List
 */
export async function createTaskList(token: string, title: string): Promise<GoogleTaskList> {
  try {
    const response = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title })
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned code ${response.status} when creating list`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error creating Google task list:", err);
    throw err;
  }
}

/**
 * Fetch tasks for a given Task List
 */
export async function listTasks(token: string, taskListId: string, showCompleted = true): Promise<GoogleTask[]> {
  try {
    const url = new URL(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`);
    url.searchParams.append('showCompleted', showCompleted ? 'true' : 'false');
    url.searchParams.append('showHidden', 'true');
    url.searchParams.append('maxResults', '100');

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Tasks API returned code ${response.status} for list ${taskListId}`);
    }

    const data = await response.json();
    return data.items || [];
  } catch (err) {
    console.error(`Error listing tasks for list ${taskListId}:`, err);
    throw err;
  }
}

/**
 * Create a task in a list
 */
export async function createTask(
  token: string,
  taskListId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  try {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tasks API returned code ${response.status} when creating task: ${text}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error creating Google task:", err);
    throw err;
  }
}

/**
 * Update a task's details or completion status
 */
export async function updateTask(
  token: string,
  taskListId: string,
  taskId: string,
  updates: Partial<GoogleTask>
): Promise<GoogleTask> {
  try {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tasks API returned code ${response.status} when patching task: ${text}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Error updating Google task:", err);
    throw err;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(token: string, taskListId: string, taskId: string): Promise<void> {
  try {
    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tasks API returned code ${response.status} when deleting task: ${text}`);
    }
  } catch (err) {
    console.error("Error deleting Google task:", err);
    throw err;
  }
}
