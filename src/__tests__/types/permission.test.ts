import { firstAccessibleRoute, isAssignableRole, SUPER_ADMIN_ROLE_ID, ROUTE_PERMISSIONS } from "@/types/permission";

describe("isAssignableRole", () => {
  it("refuses the super admin role", () => {
    expect(isAssignableRole(SUPER_ADMIN_ROLE_ID)).toBe(false);
  });

  it("accepts ordinary roles", () => {
    expect(isAssignableRole("role_content_manager")).toBe(true);
    expect(isAssignableRole("role_viewer")).toBe(true);
  });
});

describe("firstAccessibleRoute", () => {
  it("returns null when the user can view nothing", () => {
    expect(firstAccessibleRoute(() => false)).toBeNull();
  });

  it("sends a dashboard viewer to the dashboard", () => {
    expect(firstAccessibleRoute((key) => key === "dashboard:view")).toBe("/cms/dashboard");
  });

  it("sends a users-only role to /cms/users, not the dashboard", () => {
    // 写死 /cms/dashboard 的话这种人会被 middleware 弹到 /unauthorized
    expect(firstAccessibleRoute((key) => key === "users:view")).toBe("/cms/users");
  });

  it("only ever returns paths registered in ROUTE_PERMISSIONS", () => {
    const href = firstAccessibleRoute(() => true);
    expect(Object.keys(ROUTE_PERMISSIONS)).toContain(href);
  });

  it("sends the super admin to the first registered route", () => {
    // 超管的 hasPermission 恒为 true，等价于「什么都能看」
    expect(firstAccessibleRoute(() => true)).toBe("/cms/dashboard");
  });
});
