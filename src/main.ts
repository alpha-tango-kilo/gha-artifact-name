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
    searchRoot: string,
    overrides: Map<string, string>,
): Promise<Map<string, string>> {
    const map = new Map();
    for await (const workflowPathString of new Glob(
        `${searchRoot}/*.y?(a)ml`,
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
            const shortName =
                overrides.get(workflowPath.name) || workflowPath.name;
            const cosmeticName: string = workflowYaml.name;
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
export function parseOverridesInput(): Map<string, string> {
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

/**
 * Loads overrides from a file. Performs no validation other than parsing as YAML
 */
async function loadOverridesFile(
    path: string,
): Promise<Map<string, string> | undefined> {
    const fileText = await fs.readFile(path, {
        encoding: "utf-8",
    });
    const overridesYaml = YAML.parse(fileText);
    if (overridesYaml !== null) {
        return new Map(Object.entries(overridesYaml));
    } else {
        core.warning(`${path} wasn't parseable, ignoring`);
        return undefined;
    }
}

/**
 * Work out where to look for workflows
 *
 * Looks at input `repo-root`, falling back on $GITHUB_WORKSPACE and the
 * current working directory, then appends `/.github/workflows`
 */
function getSearchRoot(): string {
    const repoRoot =
        core.getInput("repo-root") || process.env.GITHUB_WORKSPACE || ".";
    core.debug(`appending .github/workflows to ${repoRoot}`);
    return path.resolve(repoRoot, ".github/workflows");
}

export async function main(): Promise<void> {
    core.debug("hello gha-artifact-name");

    core.debug("getting searchRoot");
    const searchRoot = getSearchRoot();
    core.debug(`searchRoot: ${searchRoot}`);

    core.debug("getting overrides from GitHub Action input");
    const overridesFromInput = parseOverridesInput();
    core.debug("getting overrides from file");
    const overridesFile = core.getInput("overrides-file");
    let overridesFromFile = undefined;
    if (overridesFile) {
        overridesFromFile = await loadOverridesFile(overridesFile);
    }
    core.debug("merging overrides from file & GitHub Action input");
    // GitHub Action input takes precedent
    const overrides = overridesFromFile
        ? new Map([...overridesFromFile, ...overridesFromInput])
        : overridesFromInput;

    core.debug("discovering workflows");
    const workflowMap = await discoverWorkflows(searchRoot, overrides);

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
}
