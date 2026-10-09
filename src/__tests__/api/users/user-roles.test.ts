/**
 * @jest-environment node
 */

import { GET, PUT } from "../../../app/api/users/[id]/roles/route";
import { assignRolesToUser, getUserRoles, hasPermission } from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";
import { SUPER_ADMIN_NOT_CREATABLE, SUPER_ADMIN_ROLE_ID } from "../../../types/permission";

jest.mock("../../../services/permissionService");
jest.mock("../../../lib/jwt");
jest.mock("../../../lib/supabase-admin", () => ({ supabaseAdmin: {} }));

const mockRequireAuth = requireAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockGetUserRoles = getUserRoles as jest.Mock;
const mockAssignRoles = assignRolesToUser as jest.Mock;

// 内容管理员：user_type 是 'user'，靠角色拿到 users:update —— 但角色分配只认超管
const CONTENT_MANAGER = { id: "u3", userType: "user", permissions: ["users:update"] };

const params = Promise.resolve({ id: "u2" });

function makeRequest(method: string, body?: unknown) {
  return new Request("http://localhost/api/users/u2/roles", {
    method,
    // GET 不能带 body
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ id: "admin", userType: "admin", permissions: [] });
  mockHasPermission.mockResolvedValue(true);
  mockGetUserRoles.mockResolvedValue([]);
  mockAssignRoles.mockResolvedValue(undefined);
});

describe("GET /api/users/[id]/roles", () => {
  it("returns 403 without users:view", async () => {
    mockHasPermission.mockResolvedValue(false);

    const response = await GET(makeRequest("GET"), { params });

    expect(response.status).toBe(403);
  });

  it("returns the roles of a user", async () => {
    mockGetUserRoles.mockResolvedValue([{ id: "role_viewer", name: "Viewer" }]);

    const response = await GET(makeRequest("GET"), { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.roles).toHaveLength(1);
  });
});

describe("PUT /api/users/[id]/roles", () => {
  it("returns 403 for a non-super-admin, even with users:update", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_viewer"] }), { params });

    expect(response.status).toBe(403);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("refuses to let an admin change their own role", async () => {
    mockRequireAuth.mockResolvedValue({ ...CONTENT_MANAGER, id: "u2" });

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_viewer"] }), { params });

    expect(response.status).toBe(403);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("returns 400 when roleIds is not an array", async () => {
    const response = await PUT(makeRequest("PUT", { roleIds: "role_viewer" }), { params });

    expect(response.status).toBe(400);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("refuses the super admin role even for the super admin", async () => {
    const response = await PUT(makeRequest("PUT", { roleIds: [SUPER_ADMIN_ROLE_ID] }), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SUPER_ADMIN_NOT_CREATABLE);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("lets the super admin assign roles", async () => {
    const response = await PUT(makeRequest("PUT", { roleIds: ["role_content_manager"] }), { params });

    expect(response.status).toBe(200);
    expect(mockAssignRoles).toHaveBeenCalledWith("u2", ["role_content_manager"]);
  });
});
