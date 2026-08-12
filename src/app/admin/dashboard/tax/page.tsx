"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { Loader2, Plus, TriangleAlert } from "lucide-react"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import { Button } from "@/components/ui/button"
import { useTaxClassesQuery } from "@/redux/api/taxApi"
import TaxClassCard from "./_components/TaxClassCard"

export default function TaxPage() {
	const t = useTranslations("admin")
	const { data: classes, isLoading, isError, error } = useTaxClassesQuery()


	// A product with no class of its own falls back to the default. Without one,
	// those products are simply untaxed — silently, and only visible on an
	// invoice that has already gone out.
	const hasDefault = classes?.some((c) => c.isDefault)

	return (
		<div className="space-y-4">
			<Toolbar
				primaryAction={
					<Button asChild size="lg">
						<Link href="/admin/dashboard/tax/classes/new">
							<Plus />{t("newTaxClass")}</Link>
					</Button>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingTaxClasses")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotLoadTaxClasses")}
				</div>
			)}

			{classes && classes.length > 0 && !hasDefault && (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<TriangleAlert className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>No default class.</strong> Any product that has not picked a
						class of its own is charged no tax at all. Mark one class as the
						default.
					</p>
				</div>
			)}

			{classes?.length === 0 && (
				<div className="bg-card space-y-3 rounded-lg border border-dashed p-16 text-center">
					<p className="text-muted-foreground text-sm">
						{t("noTaxClassesYet")}
					</p>
					<Button asChild>
						<Link href="/admin/dashboard/tax/classes/new">
							<Plus />{t("newTaxClass")}</Link>
					</Button>
				</div>
			)}

			{classes?.map((taxClass) => (
				<TaxClassCard key={taxClass.id} taxClass={taxClass} />
			))}
		</div>
	)
}
