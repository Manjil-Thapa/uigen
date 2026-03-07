import { test, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { ToolCallBadge, getToolCallLabel, getFileName } from "../ToolCallBadge";

afterEach(() => {
  cleanup();
});

// --- getFileName ---

test("getFileName extracts filename from a simple path", () => {
  expect(getFileName("/App.jsx")).toBe("App.jsx");
});

test("getFileName extracts filename from a nested path", () => {
  expect(getFileName("src/components/Button.tsx")).toBe("Button.tsx");
});

test("getFileName returns the value unchanged when there is no slash", () => {
  expect(getFileName("index.ts")).toBe("index.ts");
});

// --- getToolCallLabel ---

test("getToolCallLabel returns 'Creating' for str_replace_editor create", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "create", path: "/App.jsx" })
  ).toBe("Creating App.jsx");
});

test("getToolCallLabel returns 'Editing' for str_replace_editor str_replace", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "str_replace", path: "src/Card.tsx" })
  ).toBe("Editing Card.tsx");
});

test("getToolCallLabel returns 'Editing' for str_replace_editor insert", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "insert", path: "/index.ts" })
  ).toBe("Editing index.ts");
});

test("getToolCallLabel returns 'Reading' for str_replace_editor view", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "view", path: "/styles.css" })
  ).toBe("Reading styles.css");
});

test("getToolCallLabel returns 'Undoing edit' for str_replace_editor undo_edit", () => {
  expect(
    getToolCallLabel("str_replace_editor", { command: "undo_edit", path: "/App.jsx" })
  ).toBe("Undoing edit in App.jsx");
});

test("getToolCallLabel returns 'Deleting' for file_manager delete", () => {
  expect(
    getToolCallLabel("file_manager", { command: "delete", path: "/old.tsx" })
  ).toBe("Deleting old.tsx");
});

test("getToolCallLabel returns rename label for file_manager rename", () => {
  expect(
    getToolCallLabel("file_manager", {
      command: "rename",
      path: "/Button.tsx",
      new_path: "/IconButton.tsx",
    })
  ).toBe("Renaming Button.tsx → IconButton.tsx");
});

test("getToolCallLabel falls back to toolName for unknown tools", () => {
  expect(getToolCallLabel("some_unknown_tool", {})).toBe("some_unknown_tool");
});

// --- ToolCallBadge rendering ---

test("ToolCallBadge shows done indicator when state is result", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="result"
    />
  );
  expect(screen.getByTestId("done-indicator")).toBeDefined();
  expect(screen.queryByTestId("loading-indicator")).toBeNull();
});

test("ToolCallBadge shows loading indicator when state is call", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/App.jsx" }}
      state="call"
    />
  );
  expect(screen.getByTestId("loading-indicator")).toBeDefined();
  expect(screen.queryByTestId("done-indicator")).toBeNull();
});

test("ToolCallBadge shows loading indicator when state is partial-call", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "str_replace", path: "/App.jsx" }}
      state="partial-call"
    />
  );
  expect(screen.getByTestId("loading-indicator")).toBeDefined();
});

test("ToolCallBadge renders friendly label text", () => {
  render(
    <ToolCallBadge
      toolName="str_replace_editor"
      args={{ command: "create", path: "/Button.tsx" }}
      state="result"
    />
  );
  expect(screen.getByText("Creating Button.tsx")).toBeDefined();
});

test("ToolCallBadge renders file_manager delete label", () => {
  render(
    <ToolCallBadge
      toolName="file_manager"
      args={{ command: "delete", path: "src/old.tsx" }}
      state="call"
    />
  );
  expect(screen.getByText("Deleting old.tsx")).toBeDefined();
});
