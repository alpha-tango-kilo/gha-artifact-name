# GitHub Action Artifact Name Generator

**Generate pleasing artifact names that match the workflow & run**

For example, [this run](https://github.com/GloriousEggroll/proton-ge-custom/actions/runs/7457239085) would generate the artifact name `proton-ge-custom release#42`, because it is the fourty-second run of the `release.yml` workflow in the `proton-ge-custom` repository.
Naturally, certain elements of this name can be adjusted through [configuration](#all-your-options)

## Why does this exist?

If you download and check out artifacts on your local machine on a regular basis, it can be a pain remembering which one's the latest one, if you're looking at the right thing, etc.
This GitHub action generates artifact names based on the workflow run (the same one you see in browser), so you always know which artifact download corresponded with which build

<!-- TODO: add image -->

## Usage

Pre-requisites:
* A checkout of your repository (optional, but the workflow name will be "unknown")

### Example

Say you have a `build.yaml` workflow file

```yml
steps:
- name: Checkout main
  uses: actions/checkout@v4
- name: Generate artifact name
  id: artifact-name
  uses: alpha-tango-kilo/gha-artifact-name@v1
  with:
    repo_name: My Cool Project
- name: Upload build artifact
  uses: actions/upload-artifact@v4
  with:
    name: ${{ steps.artifact-name.outputs.artifact-name }}
    path: target/release/mycoolexecutable
```

After the action has been run, `${{ steps.artifact-name.outputs.artifact-name }}` and `$ARTIFACT_NAME` will be "My Cool Project build#14" (as the workflow is called `build.yml` and this is the fourteenth time it has been run)

### All your options
<!-- Note: this heading is linked to, update it if you update the heading name! -->

All example values and generated artifact names are based on [this run](https://github.com/GloriousEggroll/proton-ge-custom/actions/runs/7457239085) from Proton GE

| Option name 	| Description                                                  	| Default value        	| Example value 	| Artifact name        	|
|-------------	|--------------------------------------------------------------	|----------------------	|---------------	|----------------------	|
| `repo-name` 	| Overwrites the GitHub repository name for something prettier 	| The GitHub repo name 	| Proton GE     	| Proton GE release#42 	|
