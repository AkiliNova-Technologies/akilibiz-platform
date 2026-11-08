import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="flex flex-1 flex-col p-0 h-full">
      <div className="flex flex-col gap-4 md:gap-6 top-0 relative min-h-screen dark:bg-[#121212]">
        <Outlet />
      </div>
    </div>
  );
}
