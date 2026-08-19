import AsyncStorage from "@react-native-async-storage/async-storage";

const GITHUB_TOKEN_KEY = "spartancode.github.token.v1";
const GITHUB_USER_KEY = "spartancode.github.user.v1";

export type GitHubUser = {
  login: string;
  avatar_url: string;
  name: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
};

export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  updated_at: string;
  default_branch: string;
};

export type GitHubIssue = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
  created_at: string;
  updated_at: string;
  labels: Array<{ name: string; color: string }>;
  user: { login: string; avatar_url: string };
};

export type GitHubPR = {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  body: string | null;
  created_at: string;
  updated_at: string;
  head: { ref: string; sha: string };
  base: { ref: string };
  user: { login: string; avatar_url: string };
};

export async function readGitHubToken(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(GITHUB_TOKEN_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function writeGitHubToken(token: string): Promise<void> {
  await AsyncStorage.setItem(GITHUB_TOKEN_KEY, token);
}

export async function clearGitHubToken(): Promise<void> {
  await AsyncStorage.removeItem(GITHUB_TOKEN_KEY);
}

export async function readGitHubUser(): Promise<GitHubUser | null> {
  try {
    const raw = await AsyncStorage.getItem(GITHUB_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function writeGitHubUser(user: GitHubUser): Promise<void> {
  await AsyncStorage.setItem(GITHUB_USER_KEY, JSON.stringify(user));
}

export async function clearGitHubUser(): Promise<void> {
  await AsyncStorage.removeItem(GITHUB_USER_KEY);
}

function authHeaders(token: string) {
  return {
    Authorization: `token ${token}`,
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SpartanCode-Android/0.1.0",
  };
}

export async function fetchGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: authHeaders(token),
  });
  if (!response.ok) {
    throw new Error(`GitHub authentication failed (${response.status})`);
  }
  const user: GitHubUser = await response.json();
  await writeGitHubUser(user);
  return user;
}

export async function fetchRepos(
  token: string,
  page = 1,
  perPage = 30,
): Promise<GitHubRepo[]> {
  const response = await fetch(
    `https://api.github.com/user/repos?sort=updated&per_page=${perPage}&page=${page}`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch repositories (${response.status})`);
  }
  return response.json();
}

export async function fetchIssues(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
): Promise<GitHubIssue[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues?state=${state}&per_page=30`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch issues (${response.status})`);
  }
  return response.json();
}

export async function fetchPullRequests(
  token: string,
  owner: string,
  repo: string,
  state: "open" | "closed" | "all" = "open",
): Promise<GitHubPR[]> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=${state}&per_page=30`,
    { headers: authHeaders(token) },
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch pull requests (${response.status})`);
  }
  return response.json();
}

export async function createIssue(
  token: string,
  owner: string,
  repo: string,
  title: string,
  body?: string,
): Promise<GitHubIssue> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to create issue (${response.status})`);
  }
  return response.json();
}

export async function createPullRequest(
  token: string,
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
): Promise<GitHubPR> {
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ title, head, base, body }),
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to create pull request (${response.status})`);
  }
  return response.json();
}
