import DashboardOverview from "./_components/DashboardOverview"

/**
 * The admin landing screen.
 *
 * Every figure comes from GET /admin/dashboard/summary — there is no
 * placeholder data on this page any more. The rule for which orders count as
 * revenue lives in the API next to the orders themselves, not here next to the
 * chart that draws them.
 */
export default function DashboardPage() {
	return <DashboardOverview />
}
