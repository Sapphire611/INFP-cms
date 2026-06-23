import { mockQueryBuilder, mockResolve, mockReject } from "@/__tests__/helpers/supabase-mock";

// eslint-disable-next-line no-var
var mockClient: any;

jest.mock("@supabase/supabase-js", () => {
  mockClient = {
    auth: {
      admin: { createUser: jest.fn() },
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(() => mockQueryBuilder()),
  };
  return { createClient: jest.fn(() => mockClient) };
});

import {
  getUserPermissions,
  hasPermission,
  listRoles,
  createRole,
  deleteRole,
  getUserRoles,
  getBatchUserRoles,
  assignRolesToUser,
  getRoleWithPermissions,
  updateRole,
} from "@/services/permissionService";

const mockRole = {
  id: "role_abc123",
  name: "Editor",
  description: "Can edit content",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
};

const mockPermission = {
  id: "perm_1",
  module: "users",
  action: "view",
  description: "View users",
};

function setupFrom(data: any, error: any = null) {
  const builder = mockQueryBuilder();
  if (error instanceof Error) mockReject(builder, error);
  else mockResolve(builder, data, error);
  mockClient.from.mockReturnValue(builder);
}

function setupFromSequence(results: Array<{ data: any; error?: any }>) {
  mockClient.from.mockReset();
  for (const r of results) {
    const builder = mockQueryBuilder();
    if (r.error instanceof Error) mockReject(builder, r.error);
    else mockResolve(builder, r.data, r.error ?? null);
    mockClient.from.mockReturnValueOnce(builder);
  }
}

describe("getUserPermissions", () => {
  it("returns permission keys from joined roles", async () => {
    setupFrom([
      {
        roles: {
          role_permissions: [
            { permissions: { module: "users", action: "view" } },
            { permissions: { module: "users", action: "edit" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1");
    expect(permissions).toContain("users:view");
    expect(permissions).toContain("users:edit");
    expect(permissions).toHaveLength(2);
  });

  it("deduplicates permissions", async () => {
    setupFrom([
      {
        roles: {
          role_permissions: [
            { permissions: { module: "users", action: "view" } },
            { permissions: { module: "users", action: "view" } },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1");
    expect(permissions).toHaveLength(1);
  });

  it("returns empty array when user has no roles", async () => {
    setupFrom([]);
    const permissions = await getUserPermissions("user-1");
    expect(permissions).toEqual([]);
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("Failed to fetch user permissions: DB error"));
    await expect(getUserPermissions("user-1")).rejects.toThrow("Failed to fetch user permissions");
  });

  it("skips entries with missing module or action", async () => {
    setupFrom([
      {
        roles: {
          role_permissions: [
            { permissions: { module: "users", action: "view" } },
            { permissions: { module: null, action: "edit" } },
            { permissions: null },
          ],
        },
      },
    ]);

    const permissions = await getUserPermissions("user-1");
    expect(permissions).toEqual(["users:view"]);
  });

  it("skips user_roles without a roles object", async () => {
    setupFrom([{ roles: null }]);
    const permissions = await getUserPermissions("user-1");
    expect(permissions).toEqual([]);
  });
});

describe("hasPermission", () => {
  it("returns true for admin regardless of actual permissions", async () => {
    const result = await hasPermission("admin-id", "admin", "users", "delete");
    expect(result).toBe(true);
  });

  it("checks actual permissions for non-admin", async () => {
    setupFrom([
      {
        roles: {
          role_permissions: [{ permissions: { module: "users", action: "view" } }],
        },
      },
    ]);

    const result = await hasPermission("user-id", "user", "users", "view");
    expect(result).toBe(true);
  });

  it("returns false when non-admin lacks permission", async () => {
    setupFrom([]);
    const result = await hasPermission("user-id", "user", "users", "delete");
    expect(result).toBe(false);
  });
});

describe("listRoles", () => {
  it("returns transformed role list", async () => {
    setupFrom([mockRole]);
    const roles = await listRoles();
    expect(roles).toHaveLength(1);
    expect(roles[0].name).toBe("Editor");
    expect(roles[0].createdAt).toBeInstanceOf(Date);
  });
});

describe("getRoleWithPermissions", () => {
  it("returns role with nested permissions", async () => {
    setupFrom({
      ...mockRole,
      role_permissions: [{ permissions: mockPermission }],
    });

    const role = await getRoleWithPermissions("role_1");
    expect(role).not.toBeNull();
    expect(role!.name).toBe("Editor");
    expect(role!.permissions).toHaveLength(1);
    expect(role!.permissions[0].module).toBe("users");
  });

  it("returns null on error", async () => {
    setupFrom(null, "Not found");
    const role = await getRoleWithPermissions("nonexistent");
    expect(role).toBeNull();
  });
});

describe("createRole", () => {
  it("creates role with permissions", async () => {
    setupFromSequence([{ data: mockRole }, { data: null }]);
    const role = await createRole("Editor", "desc", ["perm_1"]);
    expect(role.name).toBe("Editor");
    expect(role.id).toMatch(/^role_/);
  });
});

describe("updateRole", () => {
  it("updates role name and permissions", async () => {
    setupFromSequence([{ data: null }, { data: null }, { data: null }]);
    await expect(
      updateRole("role_1", { name: "New Name", permissionIds: ["perm_1"] })
    ).resolves.not.toThrow();
  });
});

describe("deleteRole", () => {
  it("deletes role", async () => {
    setupFrom(null);
    await expect(deleteRole("role_1")).resolves.not.toThrow();
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("Delete failed"));
    await expect(deleteRole("role_1")).rejects.toThrow("Delete failed");
  });
});

describe("getUserRoles", () => {
  it("returns roles for a user", async () => {
    setupFrom([{ roles: mockRole }]);
    const roles = await getUserRoles("user-1");
    expect(roles).toHaveLength(1);
    expect(roles[0].name).toBe("Editor");
  });
});

describe("getBatchUserRoles", () => {
  it("returns Map of userId to roles", async () => {
    setupFrom([
      { user_id: "user-1", roles: mockRole },
      { user_id: "user-2", roles: { ...mockRole, id: "role_2", name: "Viewer" } },
    ]);

    const map = await getBatchUserRoles(["user-1", "user-2"]);
    expect(map.size).toBe(2);
    expect(map.get("user-1")![0].name).toBe("Editor");
    expect(map.get("user-2")![0].name).toBe("Viewer");
  });

  it("returns empty Map for empty userIds", async () => {
    const map = await getBatchUserRoles([]);
    expect(map.size).toBe(0);
  });

  it("throws on error", async () => {
    setupFrom(null, new Error("DB error"));
    await expect(getBatchUserRoles(["user-1"])).rejects.toThrow("DB error");
  });
});

describe("assignRolesToUser", () => {
  it("replaces all roles for a user", async () => {
    setupFromSequence([{ data: null }, { data: null }]);
    await expect(
      assignRolesToUser("user-1", ["role_1", "role_2"])
    ).resolves.not.toThrow();
  });

  it("only deletes when empty roleIds", async () => {
    setupFrom(null);
    await expect(assignRolesToUser("user-1", [])).resolves.not.toThrow();
  });
});
