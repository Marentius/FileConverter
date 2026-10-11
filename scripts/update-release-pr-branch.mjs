import { pathToFileURL } from "node:url";

const releaseBranch = "release-please--branches--main";

export async function updateReleasePrBranch({
  repository,
  token,
  apiUrl = "https://api.github.com",
  fetchImpl = fetch,
}) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || ""))
    throw new Error("Invalid GitHub repository.");
  if (!token) throw new Error("Missing GitHub token.");

  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const query = new URLSearchParams({
    state: "open",
    base: "main",
    head: `${repository.split("/")[0]}:${releaseBranch}`,
    per_page: "100",
  });
  const list = await fetchImpl(`${apiUrl}/repos/${repository}/pulls?${query}`, {
    headers,
  });
  if (!list.ok)
    throw new Error(`Could not list release PRs: HTTP ${list.status}.`);

  const pullRequests = (await list.json()).filter(
    (pr) =>
      pr.head?.ref === releaseBranch &&
      pr.head.repo?.full_name === repository &&
      pr.base?.ref === "main",
  );
  if (pullRequests.length === 0) return { status: "no-open-release-pr" };
  if (pullRequests.length !== 1)
    throw new Error("Expected at most one open release-please PR.");

  const [pr] = pullRequests;
  if (pr.mergeable_state !== "behind")
    return {
      status: pr.mergeable_state || "unknown",
      number: pr.number,
    };

  const update = await fetchImpl(
    `${apiUrl}/repos/${repository}/pulls/${pr.number}/update-branch`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ expected_head_sha: pr.head.sha }),
    },
  );
  if (!update.ok)
    throw new Error(
      `Could not update release PR #${pr.number}: HTTP ${update.status}.`,
    );
  return { status: "update-requested", number: pr.number };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const result = await updateReleasePrBranch({
    repository: process.env.GITHUB_REPOSITORY,
    token: process.env.RELEASE_PLEASE_TOKEN,
  });
  console.log(
    result.status === "update-requested"
      ? `Requested an update of release PR #${result.number} with main.`
      : result.status === "no-open-release-pr"
        ? "No open release-please PR to update."
        : `Release PR ${result.number ?? ""} is not behind main (${result.status}).`,
  );
}
