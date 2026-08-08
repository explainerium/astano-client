import type { Metadata } from "next"
import CompareTable from "./_components/CompareTable"

export const metadata: Metadata = {
	title: "Compare",
	// A comparison is built from whatever this one visitor picked, so there is
	// nothing here worth indexing and every URL would be a duplicate.
	robots: { index: false, follow: true },
}

export default function ComparePage() {
	return <CompareTable />
}
