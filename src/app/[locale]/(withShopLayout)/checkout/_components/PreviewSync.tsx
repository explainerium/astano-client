"use client"

import { useEffect, useRef } from "react"
import { useWatch } from "react-hook-form"

/** What the API needs before it will quote anything. */
const REQUIRED = ["firstName", "lastName", "street1", "postcode", "city", "countryCode"] as const

type AddressValues = Record<string, string | undefined>

const isComplete = (address: AddressValues | undefined) =>
	Boolean(address) &&
	REQUIRED.every((field) => address![field]?.trim()) &&
	address!.countryCode!.trim().length === 2

/**
 * Watches the delivery address and asks the server to recalculate totals.
 *
 * A separate component on purpose. `useWatch` re-renders only the component
 * that calls it, so putting it here keeps every keystroke in the address form
 * from re-rendering the whole checkout — and `watch()` on the form owner would
 * not re-render these leaves at all.
 *
 * The preview endpoint validates the whole address object even though it only
 * reads the country and region off it, so nothing is sent until every required
 * field is filled. That is the right moment anyway: there is no useful quote
 * for a half-typed destination.
 *
 * The delivery method is watched too, because shipping is taxable — choosing
 * one moves the VAT, not just the shipping line.
 */
export const PreviewSync = ({
	shipToDifferent,
	shippingMethodId,
	onRecalculate,
}: {
	shipToDifferent: boolean
	shippingMethodId: string | null
	onRecalculate: (destination: AddressValues, shippingMethodId: string | null) => void
}) => {
	const billing = useWatch({ name: "billing" }) as AddressValues | undefined
	const shipping = useWatch({ name: "shipping" }) as AddressValues | undefined

	const destination = shipToDifferent ? shipping : billing

	/**
	 * Held in a ref so the debounce depends on the watched values alone.
	 * Depending on the callback would restart the timer every time the parent
	 * re-rendered — and on a page whose parent re-renders on every preview,
	 * that turns a debounce into a request loop.
	 */
	const recalculate = useRef(onRecalculate)
	useEffect(() => {
		recalculate.current = onRecalculate
	}, [onRecalculate])

	/** Serialised so the effect compares values, not object identity. */
	const key = destination ? JSON.stringify(destination) : ""
	const ready = isComplete(destination)

	/*
	 * Nothing is asked for until the address is complete.
	 *
	 * A call on mount was tried, to fill the page sooner. It did not belong here:
	 * the only thing that genuinely needed to appear early was the payment list,
	 * and that now loads from its own query. All the mount call achieved was a
	 * failed request whose error banner read "Your order could not be placed" on
	 * a page nobody had typed into.
	 */
	useEffect(() => {
		if (!ready || !key) return
		const timer = setTimeout(() => {
			recalculate.current(JSON.parse(key) as AddressValues, shippingMethodId)
		}, 400)
		return () => clearTimeout(timer)
	}, [key, ready, shippingMethodId])

	return null
}

export default PreviewSync
