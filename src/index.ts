import * as core from "@actions/core";
import * as github from "@actions/github";
import fs from "fs/promises";
import { Glob } from "glob";
import * as path from "path";
import * as YAML from "yaml";

/**
 * Map GitHub workflow cosmetic names (defined within the file) to their file names
 */
async function discoverWorkflows(): Promise<Map<string, string>> {
    const map = new Map();
    for await (const workflowPath of new Glob(
        ".github/workflows/*.y?(a)ml",
        {},
    )) {
        const fileText = await fs.readFile(workflowPath, {
            encoding: "utf-8",
        });
        const workflowYaml = YAML.parse(fileText);
        if (
            workflowYaml !== null &&
            Object.prototype.hasOwnProperty.call(workflowYaml, "name")
        ) {
            const cosmeticName: string = workflowYaml.name;
            const shortName = path.parse(workflowPath).name;
            core.debug(`${cosmeticName} -> ${shortName}`);
            map.set(cosmeticName, shortName);
        } else {
            core.warning(`Couldn't read name from ${workflowPath}`);
        }
    }
    core.debug(`Discovered ${map.size} workflows`);
    return map;
}

(async function main(): Promise<void> {
    const workflowMap = await discoverWorkflows();
    // Fallback to GitHub repository name if no cosmetic name is given
    const repoName = core.getInput("repo-name") || github.context.repo.repo;
    // TODO: runAttempt is not yet in a published version of @actions/github
    // It was merged into main 2023/11/28: https://github.com/actions/toolkit/commit/faa425440f86f9c16587a19dfb59491253a2c92a
    let currentWorkflow = workflowMap.get(github.context.workflow);
    if (currentWorkflow === undefined) {
        core.warning(`unrecognised workflow "${github.context.workflow}"`);
        currentWorkflow = "unknown";
    }
    const artifactName = `${repoName} ${currentWorkflow}#${github.context.runNumber}`;
    core.debug(`artifact name: ${artifactName}`);
    core.setOutput("artifact-name", artifactName);
    core.exportVariable("ARTIFACT_NAME", artifactName);
})();
