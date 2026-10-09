/**
 * @jest-environment node
 */

import { POST } from "../../../app/api/users/route";
import { createUser, findByEmail, findByUsername } from "../../../services/userService";
import { hasPermission, assignRolesToUser, getRoleWithPermissions } from "../../../services/permissionService";
import { requireAuth } from "../../../lib/jwt";
import { SUPER_ADMIN_NOT_CREATABLE, SUPER_ADMIN_ROLE_ID } from "../../../types/permission";

jest.mock("../../../services/userService");
jest.mock("../../../services/permissionService");
jest.mock("../../../lib/jwt");
jest.mock("../../../lib/supabase-admin", () => ({ supabaseAdmin: {} }));

const mockRequireAuth = requireAuth as jest.Mock;
const mockHasPermission = hasPermission as jest.Mock;
const mockGetRole = getRoleWithPermissions as jest.Mock;
const mockAssignRoles = assignRolesToUser as jest.Mock;
const mockCreateUser = createUser as jest.Mock;
const mockFindByEmail = findByEmail as jest.Mock;
const mockFindByUsername = findByUsername as jest.Mock;

const CONTENT_MANAGER = { id: "role_content_manager", name: "Content Manager", permissions: [] };

const createdUser = {
  id: "user-new",
  username: "newbie",
  email: "newbie@test.com",
  userType: "user",
};

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  }) as any;
}

const validBody = {
  username: "newbie",
  email: "newbie@test.com",
  password: "password123",
  roleId: CONTENT_MANAGER.id,
  profile: { name: "新来的", phone: "13800000000" },
};

describe("POST /api/users", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: "admin", userType: "admin", permissions: [] });
    mockHasPermission.mockResolvedValue(true);
    mockGetRole.mockResolvedValue(CONTENT_MANAGER);
    mockAssignRoles.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue(createdUser);
    mockFindByEmail.mockResolvedValue(null);
    mockFindByUsername.mockResolvedValue(null);
  });

  it("returns 401 when not authenticated", async () => {
    mockRequireAuth.mockRejectedValue(new Error("Unauthorized"));

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(401);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller lacks users:create", async () => {
    mockRequireAuth.mockResolvedValue({ id: "u1", userType: "user", permissions: [] });
    mockHasPermission.mockResolvedValue(false);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(403);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("refuses to create a super admin even if the client asks for one", async () => {
    const response = await POST(makeRequest({ ...validBody, userType: "admin" }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SUPER_ADMIN_NOT_CREATABLE);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("refuses to assign the super admin role", async () => {
    const response = await POST(makeRequest({ ...validBody, roleId: SUPER_ADMIN_ROLE_ID }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SUPER_ADMIN_NOT_CREATABLE);
    expect(mockCreateUser).not.toHaveBeenCalled();
    expect(mockAssignRoles).not.toHaveBeenCalled();
  });

  it("returns 400 when no role is chosen", async () => {
    const response = await POST(makeRequest({ ...validBody, roleId: undefined }));

    expect(response.status).toBe(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("returns 400 when the role does not exist", async () => {
    mockGetRole.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is taken", async () => {
    mockFindByEmail.mockResolvedValue({ id: "someone" });

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(409);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("creates a regular user bound to the chosen role", async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("user-new");
    // user_type 恒为 'user'，用户类型只由角色体现
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({ username: "newbie", userType: "user", roleId: CONTENT_MANAGER.id }),
    );
    expect(mockAssignRoles).toHaveBeenCalledWith("user-new", [CONTENT_MANAGER.id]);
  });

  it("returns 403 when the service layer rejects a super admin", async () => {
    mockCreateUser.mockRejectedValue(new Error(SUPER_ADMIN_NOT_CREATABLE));

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(SUPER_ADMIN_NOT_CREATABLE);
  });
});
