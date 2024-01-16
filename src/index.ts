import * as core from "@actions/core";
import fs from "fs/promises";
import { Glob } from "glob";
import * as path from "path";
import * as YAML from "yaml";

(async function (): Promise<void> {
    const workflowMap = await discoverWorkflows();
})();

/**
 * Map GitHub workflow cosmetic names (defined within the file) to their file names
 */
async function discoverWorkflows(): Promise<Map<string, string>> {
    let map = new Map();
    for await (const workflow_path of new Glob(
        ".github/workflows/*.y?(a)ml",
        {},
    )) {
        let file_text = await fs.readFile(workflow_path, { encoding: "utf-8" });
        let workflow_yaml = YAML.parse(file_text);
        if (workflow_yaml !== null && workflow_yaml.hasOwnProperty("name")) {
            const cosmetic_name = workflow_yaml.name;
            const short_name = path.parse(workflow_path).name;
            core.debug(`${cosmetic_name} -> ${short_name}`);
            map.set(cosmetic_name, short_name);
        } else {
            core.warning(`Couldn't read name from ${workflow_path}`);
        }
    }
    core.debug(`Discovered ${map.size} workflows`);
    return map;
}
