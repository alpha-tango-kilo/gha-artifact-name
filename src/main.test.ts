import { describe, expect, test, beforeEach, jest } from "@jest/globals";
import * as core from "@actions/core";
import { parseOverridesInput } from "./main";

// Mock the GitHub Actions core library
jest.mock("./index");
jest.mock("@actions/core");
jest.mock("@actions/github");

const getMultilineInputMock = <jest.Mock<typeof core.getMultilineInput>>(
    core.getMultilineInput
);

beforeEach(() => {
    jest.clearAllMocks();
});

describe("parseOverridesInput", () => {
    test("happy path", () => {
        getMultilineInputMock.mockImplementation((name: string): string[] => {
            switch (name) {
                case "overrides":
                    return ["forgetfulness: forgor"];
                default:
                    throw new Error(`didn't expect getMultilineInput("${name}")`);
            }
        });

        expect(parseOverridesInput()).toEqual(new Map([["forgetfulness", "forgor"]]));
    });
});
