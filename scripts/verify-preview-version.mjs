const FULL_GIT_COMMIT_SHA = /^[0-9a-f]{40}$/i;

export function assertPreviewVersionMetadata(version, commitSha) {
  if (typeof commitSha !== "string" || !FULL_GIT_COMMIT_SHA.test(commitSha)) {
    throw new Error("Expected a 40-character Git commit SHA for the Preview release.");
  }

  const annotations = version?.annotations;
  if (annotations?.["workers/tag"] !== commitSha) {
    throw new Error("Preview version tag does not match the workflow commit.");
  }

  const expectedMessage = "Preview release from commit " + commitSha;
  if (annotations?.["workers/message"] !== expectedMessage) {
    throw new Error("Preview version message does not match the workflow commit.");
  }
}
