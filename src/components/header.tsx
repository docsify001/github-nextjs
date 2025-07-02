import { AuthButton } from "@/components/auth-button";
import Link from "next/link";

export default function Header() {
	return (
		<nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
			<div className="w-full max-w-5xl flex justify-between items-center p-3 px-5 text-sm">
				<div className="flex gap-5 items-center font-semibold">
					<Link href={"/"}>首页</Link>
					<Link href={"/protected/tasks/monitor"} className="hover:underline">
						任务管理
					</Link>
					<Link href={"/protected/projects"} className="hover:underline">
						项目管理
					</Link>
					<Link href={"/protected/auth-status"} className="hover:underline">
						认证状态
					</Link>
				</div>
				<AuthButton />
			</div>
		</nav>
	);
}
