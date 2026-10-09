/**
 * @jest-environment node
 */

import { PATCH, DELETE } from "../../../app/api/users/[id]/route";
import { findUserById, updateUser, deleteUser } from "../../../services/userService";
import { hasPermission } from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";
import { SUPER_ADMIN_NOT_CREATABLE } from "../../../types/permission";

jest.mock("../../../services/userService");
jest.mock("../../../services/permissionService");
jest.mock("../../../lib/jwt");
jest.mock("../../../lib/supabase-admin", () => ({ supabaseAdmin: {} }));

const mockRequireAuth = requireAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockFindUserById = findUserById as jest.Mock;
const mockUpdateUser = updateUser as jest.Mock;
const mockDeleteUser = deleteUser as jest.Mock;

const REGULAR_USER = { id: "u2", username: "regular", email: "r@test.com", userType: "user" };
const SUPER_ADMIN = { id: "u1", username: "boss", email: "boss@test.com", userType: "admin" };

const params = Promise.resolve({ id: "u2" });

function makeRequest(method: string, body: unknown = {}) {
  return new Request("http://localhost/api/users/u2", {
    method,
    body: JSON.stringify(body),
  }) as any;
}

beforeEach(() => {
  jest.clearAllMocks();
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
    mockRequireAuth.mockResolvedValue({ id: "u2", userType: "user", permissions: ["users:update"] });
    mockFindUserById.mockResolvedValue(SUPER_ADMIN);

    const response = await PATCH(makeRequest("PATCH", { username: "hijack" }), { params });

    expect(response.status).toBe(403);
    expect(mockUpdateUser).not.toHaveBeenCalled();
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
    mockRequireAuth.mockResolvedValue({ id: "u2", userType: "user", permissions: ["users:delete"] });
    mockFindUserById.mockResolvedValue(SUPER_ADMIN);

    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(403);
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("deletes a regular user", async () => {
    const response = await DELETE(makeRequest("DELETE"), { params });

    expect(response.status).toBe(200);
    expect(mockDeleteUser).toHaveBeenCalledWith("u2");
  });
});
