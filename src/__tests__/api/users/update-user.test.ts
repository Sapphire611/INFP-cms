/**
 * @jest-environment node
 */

import { PATCH, DELETE } from "../../../app/api/users/[id]/route";
import { findUserById, updateUser, deleteUser } from "../../../services/userService";
import { hasPermission } from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { mockQueryBuilder, mockResolve } from "../../helpers/supabase-mock";
import { SUPER_ADMIN_NOT_CREATABLE } from "../../../types/permission";

jest.mock("../../../services/userService");
// 判断规则（userEditBlockReason）用真的，只把最底层的库查询换掉 ——
// 这样下面测的是真规则，而不是 mock 的返回值
jest.mock("../../../services/permissionService", () => ({
  ...jest.requireActual("../../../services/permissionService"),
  hasPermission: jest.fn(),
}));
jest.mock("../../../lib/jwt");
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
const mockFrom = supabaseAdmin.from as jest.Mock;
const mockFindUserById = findUserById as jest.Mock;
const mockUpdateUser = updateUser as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;

const REGULAR_USER = { id: "u2", username: "regular", email: "r@test.com", userType: "user" };
const SUPER_ADMIN = { id: "u1", username: "boss", email: "boss@test.com", userType: "admin" };

// 内容管理员：user_type 是 'user'，靠角色拿到 users:update
const CONTENT_MANAGER = { id: "u3", userType: "user", permissions: ["users:update"] };

const params = Promise.resolve({ id: "u2" });

function makeRequest(method: string, body: unknown = {}) {
  return new Request("http://localhost/api/users/u2", {
    method,
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUserRolesRows = [];
  mockRequireAuth.mockResolvedValue({ id: "admin", userType: "admin", permissions: [] });
  mockHasPermission.mockResolvedValue(true);
  mockFindUserById.mockResolvedValue(REGULAR_USER);
  mockUpdateUser.mockResolvedValue(REGULAR_USER);
  mockDeleteUser.mockResolvedValue(REGULAR_USER);
});

describe("PATCH /api/users/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const response = await PATCH(makeRequest("PATCH"), { params });

    expect(response.status).toBe(401);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller lacks users:update", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u9", userType: "user", permissions: [] });
    mockHasPermission.mockResolvedValue(false);

    const response = await PATCH(makeRequest("PATCH"), { params });

    expect(response.status).toBe(403);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("refuses to promote someone to super admin", async () => {
    const response = await PATCH(makeRequest("PATCH", { userType: "admin" }), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SUPER_ADMIN_NOT_CREATABLE);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("refuses to let a non-admin touch the super admin account", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u9", userType: "user", permissions: ["users:update"] });
    mockFindUserById.mockResolvedValue(SUPER_ADMIN);

    const response = await PATCH(makeRequest("PATCH", { username: "hijack" }), { params });

    expect(response.status).toBe(403);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("lets an admin edit their own account", async () => {
    mockRequireAuth.mockResolvedValue({ ...CONTENT_MANAGER, id: "u2" });

    const response = await PATCH(makeRequest("PATCH", { username: "me" }), { params });

    expect(response.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalled();
    // 自己人不用查
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("refuses to let an admin edit another admin", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);
    mockUserRolesRows = ADMIN_ROLE_ROWS;

    const response = await PATCH(makeRequest("PATCH", { password: "hijacked" }), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权修改其他管理员");
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("lets an admin edit a plain user", async () => {
    mockRequireAuth.mockResolvedValue(CONTENT_MANAGER);

    const response = await PATCH(makeRequest("PATCH", { username: "renamed" }), { params });

    expect(response.status).toBe(200);
    expect(mockFrom).toHaveBeenCalled();
  });

  it("lets the super admin edit an admin", async () => {
    mockUserRolesRows = ADMIN_ROLE_ROWS;

    const response = await PATCH(makeRequest("PATCH", { username: "renamed" }), { params });

    expect(response.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("updates a regular user", async () => {
    const response = await PATCH(makeRequest("PATCH", { username: "renamed" }), { params });

    expect(response.status).toBe(200);
    expect(mockUpdateUser).toHaveBeenCalledWith("u2", expect.objectContaining({ username: "renamed" }));
  });
});

describe("DELETE /api/users/[id]", () => {
  it("returns 403 when the caller lacks users:delete", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u9", userType: "user", permissions: [] });
    mockHasPermission.mockResolvedValue(false);

    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(403);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("refuses to let a non-admin delete the super admin account", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u9", userType: "user", permissions: ["users:delete"] });
    mockFindUserById.mockResolvedValue(SUPER_ADMIN);

    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(403);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("refuses to let an admin delete another admin", async () => {
    mockRequireAuth.mockResolvedValue({ ...CONTENT_MANAGER, permissions: ["users:delete"] });
    mockUserRolesRows = ADMIN_ROLE_ROWS;

    const response = await DELETE(makeRequest("DELETE"), { params });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe("无权删除其他管理员");
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("lets an admin delete their own account", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u2", userType: "user", permissions: ["users:delete"] });

    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith("u2");
  });

  it("deletes a regular user", async () => {
    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith("u2");
  });
});
