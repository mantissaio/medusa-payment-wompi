/** @type {import('semantic-release').GlobalConfig} */
module.exports = {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", { changelogFile: "CHANGELOG.md" }],
    "@semantic-release/npm",
    [
      "@semantic-release/git",
      {
        assets: ["CHANGELOG.md", "package.json", "pnpm-lock.yaml"],
        message: "chore(release): ${nextRelease.version} [skip ci]",
      },
    ],
    "@semantic-release/github",
  ],
};
