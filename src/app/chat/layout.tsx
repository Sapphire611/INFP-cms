import { verifyAuth } from "@/lib/jwt";
import { firstAccessibleRoute } from "@/types/permission";
import { ChatProvider } from "@/stores/chat";
import { IconSidebar } from "./_components/icon-sidebar";
import { ChatHeader } from "./_components/chat-header";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  // 服务端算好「切换到 CMS」该跳哪：JWT 是验签过的，且首屏就能带上，
  // 不用等客户端挂载后读 cookie 再补按钮。
  const auth = await verifyAuth();
  const cmsHref = auth
    ? firstAccessibleRoute(
        (key) => auth.userType === "admin" || (auth.permissions ?? []).includes(key)
      )
    : null;

  return (
    <ChatProvider>
      <div className="flex h-screen flex-col">
        <ChatHeader />
        <div className="flex flex-1 overflow-hidden">
          <IconSidebar cmsHref={cmsHref} />
          {children}
        </div>
      </div>
    </ChatProvider>
  );
}
