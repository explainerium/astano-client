import type { ReactNode } from "react"

export const AuthShell = ({
	title,
	subtitle,
	children,
	footer,
}: {
	title: string
	subtitle?: string
	children: ReactNode
	footer?: ReactNode
}) => (
	<div className="flex flex-1 items-center justify-center px-6 py-16">
		<div className="w-full max-w-sm">
			<div className="mb-8 text-center">
				<p className="font-heading text-xl font-semibold tracking-tight">astano®</p>
				<h1 className="font-heading mt-6 text-2xl font-semibold tracking-tight">{title}</h1>
				{subtitle && <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>}
			</div>

			{children}

			{footer && <div className="text-muted-foreground mt-6 text-center text-sm">{footer}</div>}
		</div>
	</div>
)

export default AuthShell
