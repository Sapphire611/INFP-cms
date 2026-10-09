/**
 * @jest-environment node
 */

import { GET, PUT } from "../../../app/api/users/[id]/roles/route";
import { findUserById } from "../../../services/userService";
import {
  assignRolesToUser,
  getUserRoles,
  hasPermission,
  isSensitiveRole,
} from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";
import { mockQueryBuilder, mockResolve } from "../../helpers/supabase-mock";
import {
  SENSITIVE_ROLE_NOT_GRANTABLE,
  SUPER_ADMIN_NOT_CREATABLE,
  SUPER_ADMIN_ROLE_ID,
} from "../../../types/permission";

jest.mock("../../../services/userService");
jest.mock("../../../lib/jwt");
// 判断规则（userEditBlockReason）用真的，只把最底层的库查询换掉
jest.mock("../../../services/permissionService", () => ({
  ...jest.requireActual("../../../services/permissionService"),
  hasPermission: jest.fn(),
  isSensitiveRole: jest.fn(),
  getUserRoles: jest.fn(),
  assignRolesToUser: jest.fn(),
}));
jest.mock("../../../lib/supabase-admin", () => ({
  supabaseAdmin: {
    from: jest.fn(() => {
      const builder = mockQueryBuilder();
      mockResolve(builder, mockUserRolesRows);
      return builder;
    }),
  },
}));

/** 「目标用户挂着什么角色」—— 决定他算不算管理员。空数组 = 普通用户 */
let mockUserRolesRows: any[] = [];
/** 目标带 users:update 角色 */
const ADMIN_ROLE_ROWS = [
  { user_id: "u2", roles: { role_permissions: [{ permissions: { module: "users", action: "update" } }] } },
];

const mockRequireAuth = requireAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockIsSensitiveRole = isSensitiveRole as jest.Mock;
const mockGetUserRoles = getUserRoles as jest.Mock;
const mockAssignRoles = assignRolesToUser as jest.Mock;
const mockFindUserById = findUserById as jest.Mock;

const PLAIN_USER = { id: "u2", username: "regular", email: "r@test.com", userType: "user" };
const SUPER_ADMIN = { id: "u1", username: "boss", email: "boss@test.com", userType: "admin" };
// 内容管理员：user_type 是 'user'，靠角色拿到 users:update
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
  mockUserRolesRows = [];
  mockRequireAuth.mockResolvedValue({ id: "admin", userType: "admin", permissions: [] });
  mockHasPermission.mockResolvedValue(true);
  mockIsSensitiveRole.mockResolvedValue(false);
  mockGetUserRoles.mockResolvedValue([]);
  mockAssignRoles.mockResolvedValue(undefined);
  mockFindUserById.mockResolvedValue(PLAIN_USER);
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
  it("returns 403 without users:update", async () => {
    mockHasPermission.mockResolvedValue(false);

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

  it("refuses a sensitive role for a non-super-admin", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);
    mockIsSensitiveRole.mockResolvedValue(true);

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_content_manager"] }), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SENSITIVE_ROLE_NOT_GRANTABLE);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("lets the super admin assign a sensitive role", async () => {
    mockIsSensitiveRole.mockResolvedValue(true);

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_content_manager"] }), { params });

    expect(response.status).toBe(200);
    expect(mockAssignRoles).toHaveBeenCalledWith("u2", ["role_content_manager"]);
  });

  it("lets an admin assign a plain role to a plain user", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_viewer"] }), { params });

    expect(response.status).toBe(200);
    expect(mockAssignRoles).toHaveBeenCalledWith("u2", ["role_viewer"]);
  });

  it("refuses to let an admin re-role another admin", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);
    mockUserRolesRows = ADMIN_ROLE_ROWS;

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_viewer"] }), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权修改其他管理员");
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("refuses to let an admin re-role the super admin", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);
    mockFindUserById.mockResolvedValue(SUPER_ADMIN);

    const response = await PUT(makeRequest("PUT", { roleIds: ["role_viewer"] }), { params });

    expect(response.status).toBe(403);
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });
});
