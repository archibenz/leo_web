import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";

/** Current page segment shown in the header — pass a nav item or `{ title, icon? }`. */
export type AppBreadcrumbPage = {
	title: string;
	icon?: ReactNode;
};

export function AppBreadcrumbs({ page }: { page?: AppBreadcrumbPage | null }) {
	const t = useTranslations("admin");

	if (!page?.title) {
		return null;
	}

	// aria-label обязателен, и не для порядка. Примитив реестра ставит своему
	// <nav> имя "breadcrumb" по-английски, а наш вызов шёл голым: на /ru/admin
	// единственный <nav> на странице назывался «breadcrumb», то есть читалка в
	// русской админке произносила английское слово. Проверено обходом страницы
	// 17.09, поймано сторожем components/ui/__tests__/no-bare-registry-name.
	//
	// Слово выбрано простое, а не «навигационная цепочка»: роль landmark и так
	// произносится как «навигация», а имя должно говорить человеку, что это.
	return (
		<Breadcrumb aria-label={t("breadcrumbs")}>
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbPage className="flex items-center gap-2 [&>svg]:size-3.5">
						{page.icon}
						{page.title}
					</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
