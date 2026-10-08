import { isDeepStrictEqual } from "node:util";

const workspaces = ["packages/core", "packages/gui"];
const metadataFiles = new Set([
  ".release-please-manifest.json",
  "package-lock.json",
  ...workspaces.flatMap((workspace) => [
    `${workspace}/package.json`,
    `${workspace}/CHANGELOG.md`,
  ]),
]);

function snapshot(read) {
  const manifest = JSON.parse(read(".release-please-manifest.json"));
  const lock = JSON.parse(read("package-lock.json"));
  const packages = workspaces.map((workspace) =>
    JSON.parse(read(`${workspace}/package.json`)),
  );
  const coreVersion = packages[0].version;
  for (const [index, workspace] of workspaces.entries()) {
    const version = packages[index].version;
    if (
      !/^\d+\.\d+\.\d+$/.test(version) ||
      manifest[workspace] !== version ||
      lock.packages[workspace].version !== version
    )
      throw new Error(`Inconsistent release version for ${workspace}.`);
    delete manifest[workspace];
    delete packages[index].version;
    delete lock.packages[workspace].version;
  }
  if (
    packages[1].dependencies["@fileconverter/core"] !== coreVersion ||
    lock.packages["packages/gui"].dependencies["@fileconverter/core"] !==
      coreVersion
  )
    throw new Error("Desktop core dependency does not match the release.");
  delete packages[1].dependencies["@fileconverter/core"];
  delete lock.packages["packages/gui"].dependencies["@fileconverter/core"];
  return { manifest, lock, packages };
}

// Only version fields, the matching workspace dependency, and changelogs may
// differ. A dependency, script, or source change must retain normal product CI.
export function releaseMetadataOnly(event, files, readBefore, readAfter) {
  const pr = event.pull_request;
  if (
    !pr ||
    !event.repository?.full_name ||
    pr.head?.repo?.full_name !== event.repository.full_name ||
    pr.head.ref !== "release-please--branches--main" ||
    pr.base?.ref !== "main" ||
    files.length === 0 ||
    files.some((file) => !metadataFiles.has(file))
  )
    return false;
  try {
    return isDeepStrictEqual(snapshot(readBefore), snapshot(readAfter));
  } catch {
    // Deleted files, invalid JSON, or inconsistent versions require full CI.
    return false;
  }
}
