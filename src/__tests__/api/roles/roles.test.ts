/**
 * @jest-environment node
 */

import { GET as listRolesRoute, POST as createRoleRoute } from "../../../app/api/roles/route";
import { GET as getRoleRoute } from "../../../app/api/roles/[id]/route";
import { GET as listPermissionsRoute } from "../../../app/api/permissions/route";
import { listRoles, getRoleWithPermissions, createRole, listPermissions } from "../../../services/permissionService";
import { hasPermission } from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";

jest.mock("../../../services/permissionService");
jest.mock("../../../lib/jwt");
jest.mock("../../../lib/supabase-admin", () => ({ supabaseAdmin: {} }));

const mockRequireAuth = requireAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;

const VIEWER = { id: "u2", userType: "user", permissions: ["users:view"] };

function makeRequest(method: string, body: unknown = {}) {
  // GET/HEAD 不允许带 body
  const withBody = method !== "GET" && method !== "HEAD";
  return new Request("http://localhost/api/roles", {
    method,
    ...(withBody ? { body: JSON.stringify(body) } : {}),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue(VIEWER);
  mockHasPermission.mockResolvedValue(true);
  (listRoles as jest.Mock).mockResolvedValue([]);
  (getRoleWithPermissions as jest.Mock).mockResolvedValue({ id: "r1", name: "Viewer", permissions: [] });
  (createRole as jest.Mock).mockResolvedValue({ id: "r2", name: "New" });
  (listPermissions as jest.Mock).mockResolvedValue([]);
});

describe("权限管理 — 只读开放，写操作仅超管", () => {
  it("lets a regular user with users:view read the role list", async () => {
    const response = await listRolesRoute();

    expect(response.status).toBe(200);
  });

  it("lets a regular user with users:view read a single role", async () => {
    const response = await getRoleRoute(makeRequest("GET"), { params: Promise.resolve({ id: "r1" }) });

    expect(response.status).toBe(200);
  });

  it("lets a regular user with users:view read the permission catalog", async () => {
    const response = await listPermissionsRoute();

    expect(response.status).toBe(200);
  });

  it("hides the role list from users without users:view", async () => {
    mockHasPermission.mockResolvedValue(false);

    const response = await listRolesRoute();

    expect(response.status).toBe(403);
  });

  it("refuses role creation by a non-admin", async () => {
    const response = await createRoleRoute(makeRequest("POST", { name: "Evil", permissionIds: [] }));

    expect(response.status).toBe(403);
    expect(createRole).not.toHaveBeenCalled();
  });

  it("allows role creation by the super admin", async () => {
    mockRequireAuth.mockResolvedValue({ id: "admin", userType: "admin", permissions: [] });

    const response = await createRoleRoute(makeRequest("POST", { name: "Editor", permissionIds: [] }));

    expect(response.status).toBe(201);
    expect(createRole).toHaveBeenCalled();
  });
});
