import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { affected } from "../scripts/ci-changes.mjs";
import { releaseMetadataOnly } from "../scripts/release-metadata.mjs";
import { selectRun } from "../scripts/release-ci.mjs";
import { verify } from "../scripts/artifacts.mjs";
import { updateReleasePrBranch } from "../scripts/update-release-pr-branch.mjs";
import {
  desktopFiles,
  verifyDesktopFiles,
} from "../scripts/desktop-artifacts.mjs";

test("release branch updater refreshes only a behind first-party release PR", async () => {
  const calls = [];
  const pr = {
    number: 176,
    mergeable_state: "behind",
    head: {
      ref: "release-please--branches--main",
      sha: "release-head-sha",
      repo: { full_name: "Marentius/FileConverter" },
    },
    base: { ref: "main" },
  };
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    return calls.length === 1
      ? { ok: true, json: async () => [pr] }
      : { ok: true };
  };

  assert.deepEqual(
    await updateReleasePrBranch({
      repository: "Marentius/FileConverter",
      token: "token",
      fetchImpl,
    }),
    { status: "update-requested", number: 176 },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[1].options.method, "PUT");
  assert.deepEqual(JSON.parse(calls[1].options.body), {
    expected_head_sha: "release-head-sha",
  });
});

test("release branch updater skips absent, current, and fork release PRs", async () => {
  const firstPartyPr = {
    number: 176,
    mergeable_state: "clean",
    head: {
      ref: "release-please--branches--main",
      sha: "head-sha",
      repo: { full_name: "Marentius/FileConverter" },
    },
    base: { ref: "main" },
  };
  for (const pullRequests of [
    [],
    [firstPartyPr],
    [
      {
        ...firstPartyPr,
        head: {
          ...firstPartyPr.head,
          repo: { full_name: "someone/FileConverter" },
        },
      },
    ],
  ]) {
    let calls = 0;
    const result = await updateReleasePrBranch({
      repository: "Marentius/FileConverter",
      token: "token",
      fetchImpl: async () => {
        calls += 1;
        return { ok: true, json: async () => pullRequests };
      },
    });
    assert.equal(calls, 1);
    assert.notEqual(result.status, "update-requested");
  }
});

test("desktop promotion requires the installers for each OS and rejects legacy archives", () => {
  for (const platform of ["linux-x64", "win-x64", "macos-arm64"]) {
    const files = desktopFiles(platform, "1.10.0");
    assert.doesNotThrow(() => verifyDesktopFiles(files, platform, "1.10.0"));
    assert.throws(() => verifyDesktopFiles(files.slice(1), platform, "1.10.0"));
    assert.throws(() =>
      verifyDesktopFiles([...files, files[0]], platform, "1.10.0"),
    );
    assert.throws(() => verifyDesktopFiles(files, platform, "1.9.0"));
    assert.throws(() =>
      verifyDesktopFiles(
        ["FileConverter-linux-x64-1.10.0.zip"],
        platform,
        "1.10.0",
      ),
    );
  }
});
test("GUI changes do not run CLI jobs, engine changes also validate its GUI consumer", () => {
  assert.deepEqual(affected(["packages/gui/src/App.tsx"]), {
    core: false,
    gui: true,
  });
  assert.deepEqual(affected(["packages/core/src/cli.ts"]), {
    core: true,
    gui: true,
  });
  assert.deepEqual(affected(["package-lock.json"]), { core: true, gui: true });
  assert.deepEqual(affected(["README.md"]), { core: false, gui: false });
  assert.deepEqual(affected(["packages/gui/README.md"]), {
    core: false,
    gui: false,
  });
  assert.deepEqual(affected([".npmrc"]), { core: true, gui: true });
  assert.deepEqual(affected([".release-please-manifest.json"]), {
    core: true,
    gui: true,
  });
  assert.deepEqual(affected([".github/workflows/release.yml"]), {
    core: true,
    gui: true,
  });
});

function releaseFixture() {
  const repo = { full_name: "Marentius/FileConverter" };
  const event = {
    repository: repo,
    pull_request: {
      head: { ref: "release-please--branches--main", repo },
      base: { ref: "main" },
    },
  };
  const metadata = (core, gui) => ({
    "packages/core/package.json": {
      name: "@fileconverter/core",
      version: core,
      scripts: { build: "tsup" },
      dependencies: { sharp: "^0.35.5" },
    },
    "packages/gui/package.json": {
      name: "@fileconverter/gui",
      version: gui,
      dependencies: { "@fileconverter/core": core, react: "^19.2.4" },
    },
    ".release-please-manifest.json": {
      "packages/core": core,
      "packages/gui": gui,
    },
    "package-lock.json": {
      lockfileVersion: 3,
      packages: {
        "packages/core": { version: core },
        "packages/gui": {
          version: gui,
          dependencies: { "@fileconverter/core": core, react: "^19.2.4" },
        },
        "node_modules/sharp": { version: "0.35.5", integrity: "sha512-tested" },
      },
    },
  });
  const before = metadata("1.10.0", "1.11.0");
  const after = metadata("1.11.0", "1.11.1");
  const files = [
    ...Object.keys(after),
    "packages/core/CHANGELOG.md",
    "packages/gui/CHANGELOG.md",
  ];
  const classify = () =>
    releaseMetadataOnly(
      event,
      files,
      (file) => JSON.stringify(before[file]),
      (file) => JSON.stringify(after[file]),
    );
  return { event, before, after, files, classify };
}

test("release-only PRs skip product jobs for independent and combined version bumps", () => {
  const fixture = releaseFixture();
  assert.equal(fixture.classify(), true);
  fixture.after["packages/core/package.json"].version = "1.10.0";
  fixture.after["packages/gui/package.json"].dependencies[
    "@fileconverter/core"
  ] = "1.10.0";
  fixture.after[".release-please-manifest.json"]["packages/core"] = "1.10.0";
  fixture.after["package-lock.json"].packages["packages/core"].version =
    "1.10.0";
  fixture.after["package-lock.json"].packages["packages/gui"].dependencies[
    "@fileconverter/core"
  ] = "1.10.0";
  assert.equal(fixture.classify(), true);
});

test("ordinary PRs, fork PRs, main pushes, and manual runs retain product CI", () => {
  const ordinary = releaseFixture();
  ordinary.event.pull_request.head.ref = "fix/update-version";
  assert.equal(ordinary.classify(), false);
  const fork = releaseFixture();
  fork.event.pull_request.head.repo = { full_name: "someone/FileConverter" };
  assert.equal(fork.classify(), false);
  const main = releaseFixture();
  delete main.event.pull_request;
  assert.equal(main.classify(), false);
  assert.equal(
    releaseMetadataOnly(
      {},
      [],
      () => {},
      () => {},
    ),
    false,
  );
  assert.deepEqual(affected(main.files), { core: true, gui: true });
});

test("release PRs with source, script, dependency, or lock integrity changes retain full CI", () => {
  for (const file of [
    "packages/core/src/cli.ts",
    "package.json",
    "scripts/package-cli.mjs",
  ]) {
    const fixture = releaseFixture();
    fixture.files.push(file);
    assert.equal(fixture.classify(), false);
  }
  for (const mutate of [
    (f) => {
      f.after["packages/core/package.json"].scripts.build = "other-command";
    },
    (f) => {
      f.after["packages/core/package.json"].dependencies.sharp = "^0.36.0";
    },
    (f) => {
      f.after["package-lock.json"].packages["node_modules/sharp"].version =
        "0.36.0";
    },
    (f) => {
      f.after["package-lock.json"].packages["node_modules/sharp"].integrity =
        "sha512-other";
    },
  ]) {
    const fixture = releaseFixture();
    mutate(fixture);
    assert.equal(fixture.classify(), false);
  }
});

test("missing metadata and inconsistent release versions cannot skip product validation", () => {
  for (const mutate of [
    (f) => {
      delete f.after["package-lock.json"];
    },
    (f) => {
      f.after[".release-please-manifest.json"]["packages/gui"] = "9.0.0";
    },
    (f) => {
      f.after["package-lock.json"].packages["packages/core"].version = "9.0.0";
    },
    (f) => {
      f.after["packages/gui/package.json"].dependencies["@fileconverter/core"] =
        "9.0.0";
    },
    (f) => {
      f.after["package-lock.json"].packages["packages/gui"].dependencies[
        "@fileconverter/core"
      ] = "9.0.0";
    },
    (f) => {
      f.after["packages/core/package.json"].version = "not-a-version";
    },
  ]) {
    const fixture = releaseFixture();
    mutate(fixture);
    assert.equal(fixture.classify(), false);
  }
});
test("promotion rejects wrong commit/version/product, tampering, and unrecorded files", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "artifact-test-"));
  try {
    const name = "desktop.zip",
      sha = "a".repeat(40),
      data = "tested binary";
    fs.writeFileSync(path.join(directory, name), data);
    const metadata = {
      product: "gui",
      platform: "linux-x64",
      version: "2.1.0",
      sha,
      files: [
        { name, sha256: createHash("sha256").update(data).digest("hex") },
      ],
    };
    fs.writeFileSync(
      path.join(directory, "metadata.json"),
      JSON.stringify(metadata),
    );
    assert.equal(verify(directory, "gui", "2.1.0", sha).files.length, 1);
    assert.throws(() => verify(directory, "gui", "2.1.0", "b".repeat(40)));
    assert.throws(() => verify(directory, "gui", "2.2.0", sha));
    assert.throws(() => verify(directory, "cli", "2.1.0", sha));
    fs.writeFileSync(path.join(directory, "extra.zip"), data);
    assert.throws(() => verify(directory, "gui", "2.1.0", sha));
    fs.unlinkSync(path.join(directory, "extra.zip"));
    fs.writeFileSync(path.join(directory, name), "tampered");
    assert.throws(() => verify(directory, "gui", "2.1.0", sha));
    metadata.files[0].name = "../secret";
    fs.writeFileSync(
      path.join(directory, "metadata.json"),
      JSON.stringify(metadata),
    );
    assert.throws(() => verify(directory, "gui", "2.1.0", sha));
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("publication follows the tag commit CI even when main has advanced", () => {
  const sha = "a".repeat(40);
  const success = {
    databaseId: 1,
    headSha: sha,
    event: "push",
    headBranch: "main",
    status: "completed",
    conclusion: "success",
  };
  const newer = { ...success, databaseId: 2, headSha: "b".repeat(40) };
  assert.equal(selectRun([newer, success], sha).databaseId, 1);
  const live = { ...success, status: "in_progress", conclusion: "" };
  assert.equal(selectRun([newer, live], sha).databaseId, 1);
  assert.throws(() => selectRun([newer], sha));
  assert.throws(() => selectRun([{ ...success, conclusion: "failure" }], sha));
  assert.throws(() => selectRun([{ ...success, event: "pull_request" }], sha));
  assert.throws(() =>
    selectRun([{ ...success, headBranch: "untrusted" }], sha),
  );
});
