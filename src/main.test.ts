import { describe, expect, test, beforeEach, jest } from "@jest/globals";
import * as core from "@actions/core";
import { getSearchRoot, parseOverridesInput } from "./main";

// Mock the GitHub Actions core library
jest.mock("@actions/core");
// jest.mock("@actions/github");

const getInputMock = <jest.Mock<typeof core.getInput>>core.getInput;
const getMultilineInputMock = <jest.Mock<typeof core.getMultilineInput>>(
    core.getMultilineInput
);

beforeEach(() => {
    jest.clearAllMocks();
});

describe("parseOverridesInput", () => {
    test("one", () => {
        getMultilineInputMock.mockImplementation((name: string): string[] => {
            expect(name).toBe("overrides");
            return ["forgetfulness: forgor"];
        });

        expect(parseOverridesInput()).toEqual(
            new Map([["forgetfulness", "forgor"]]),
        );
    });

    test("many", () => {
        getMultilineInputMock.mockImplementation((name: string): string[] => {
            expect(name).toBe("overrides");
            return [
                "forgetfulness: forgor",
                "heehee: hoho",
                "are you winning: son",
            ];
        });

        const expected = new Map([
            ["forgetfulness", "forgor"],
            ["heehee", "hoho"],
            ["are you winning", "son"],
        ]);
        expect(parseOverridesInput()).toEqual(expected);
    });

    test("no seperator", () => {
        getMultilineInputMock.mockImplementation((name: string): string[] => {
            expect(name).toBe("overrides");
            return ["forgetfulness forgor"];
        });
        expect(parseOverridesInput()).toEqual(new Map());
    });

    test("mixed valid & invalid", () => {
        getMultilineInputMock.mockImplementation((name: string): string[] => {
            expect(name).toBe("overrides");
            return ["forgetfulness forgor", "heehee: hoho"];
        });
        expect(parseOverridesInput()).toEqual(new Map([["heehee", "hoho"]]));
    });
});

describe("getSearchRoot", () => {
    test("repo-root set", () => {
        getInputMock.mockImplementation((name: string): string => {
            expect(name).toBe("repo-root");
            return "/repo/root";
        });

        expect(getSearchRoot()).toBe("/repo/root/.github/workflows");
    });

    test("$GITHUB_WORKSPACE set", () => {
        getInputMock.mockImplementation((name: string): string => {
            expect(name).toBe("repo-root");
            return "";
        });
        process.env["GITHUB_WORKSPACE"] = "/github/workspace";

        expect(getSearchRoot()).toBe("/github/workspace/.github/workflows");
    });

    test("nothing set", () => {
        getInputMock.mockImplementation((name: string): string => {
            expect(name).toBe("repo-root");
            return "";
        });

        expect(getSearchRoot()).toBe("./.github/workflows");
    });
});
