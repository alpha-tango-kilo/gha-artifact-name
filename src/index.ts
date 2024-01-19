import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import { Glob } from "glob";
import * as path from "path";
import * as YAML from "yaml";

/**
 * Map GitHub workflow cosmetic names (defined within the file) to their file names
 */
async function discoverWorkflows(
    overrides: Map<string, string>,
): Promise<Map<string, string>> {
    const map = new Map();
    for await (const workflowPathString of new Glob(
        ".github/workflows/*.y?(a)ml",
        {},
    )) {
        const workflowPath = path.parse(workflowPathString);
        const fileText = await fs.readFile(workflowPathString, {
            encoding: "utf-8",
        });
        const workflowYaml = YAML.parse(fileText);
        if (
            workflowYaml !== null &&
            Object.prototype.hasOwnProperty.call(workflowYaml, "name")
        ) {
            const shortName = workflowPath.name;
            const cosmeticName: string =
                overrides.get(shortName) || workflowYaml.name;
            core.debug(`discovered workflow: ${cosmeticName} -> ${shortName}`);
            map.set(cosmeticName, shortName);
        } else {
            core.warning(`Couldn't read name from ${workflowPathString}`);
        }
    }
    core.debug(`discovered ${map.size} workflows`);
    return map;
}

/**
 * Get user overrides, specified as "file stem: short name", e.g. "release: build"
 */
function getOverrides(): Map<string, string> {
    const overrides = new Map();
    const overridesInput = core.getMultilineInput("overrides") || [];
    for (const line of overridesInput) {
        if (!line.includes(":")) continue;
        const [fileRaw, nameRaw] = line.split(":", 2);
        const file = fileRaw.trim();
        const name = nameRaw.trim();
        if (file.endsWith(".yml") || file.endsWith(".yaml")) {
            core.warning(
                `Override file "${fileRaw}" has an unnecessary extension, and probably won't match`,
            );
        }
        core.debug(`added override: ${file} -> ${name}`);
        overrides.set(file, name);
    }
    core.debug(`found ${overrides.size} overrides`);
    return overrides;
}

(async function main(): Promise<void> {
    core.debug("hello gha-artifact-name");
    core.debug("getting overrides");
    const overrides = getOverrides();
    core.debug("discovering workflows");
    const workflowMap = await discoverWorkflows(overrides);

    core.debug("generating name");
    // Fallback to GitHub repository name if no cosmetic name is given
    const repoName = core.getInput("repo-name") || github.context.repo.repo;
    // TODO: runAttempt is not yet in a published version of @actions/github
    // It was merged into main 2023/11/28: https://github.com/actions/toolkit/commit/faa425440f86f9c16587a19dfb59491253a2c92a
    let currentWorkflow = workflowMap.get(github.context.workflow);
    if (currentWorkflow === undefined) {
        core.warning(`Unrecognised workflow "${github.context.workflow}"`);
        currentWorkflow = "unknown";
    }
    const artifactName = `${repoName} ${currentWorkflow}#${github.context.runNumber}`;
    console.log(`artifact name: ${artifactName}`);
    core.setOutput("artifact-name", artifactName);
    core.exportVariable("ARTIFACT_NAME", artifactName);
})();
