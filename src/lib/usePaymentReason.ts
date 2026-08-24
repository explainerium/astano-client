"use client"

import { useTranslations } from "next-intl"
import useMoney from "./useMoney"
import type { PaymentIneligibleReason, PaymentValueLimits } from "@/types/storefront"

/**
 * Why a payment method is greyed out, in words the customer can act on.
 *
 * One implementation for both places a customer chooses a method — checkout and
 * accepting a quote. They had drifted: checkout mapped reason codes to
 * sentences, the quote screen showed a disabled radio and nothing else, so the
 * same customer could be told "available from your second order onwards" in one
 * place and left guessing in the other. A quote is where the value limit is
 * most likely to bite, which made that the worse of the two.
 *
 * The value limits are named rather than alluded to. "Not available for this
 * order" leaves a customer with nothing to do next; "available up to €10,000"
 * lets them split the order, pay another way, or pick up the phone — and the
 * figure is the shop's own setting, formatted with the shop's own separators,
 * so changing the limit changes the sentence.
 */
export const usePaymentReason = () => {
	const t = useTranslations("checkout")
	const money = useMoney()

	return (
		method: Partial<PaymentValueLimits> & { eligible: boolean; reason?: PaymentIneligibleReason }
	): string | undefined => {
		if (method.eligible) return undefined

		switch (method.reason) {
			case "NOT_ENOUGH_ORDER_HISTORY":
				return t("reasonNotEnoughOrderHistory")

			case "REQUIRES_VALIDATED_VAT_ID":
				return t("reasonRequiresValidatedVatId")

			/*
			 * Named amounts where there is one to name.
			 *
			 * `money` returns null for anything it cannot format, and a sentence
			 * ending "up to an order value of ." is worse than the plain wording
			 * — so the bounded phrasing is used only once there is a figure.
			 */
			case "ORDER_TOTAL_TOO_LOW": {
				const amount = money(method.minOrderTotal)
				return amount ? t("reasonBelowMinimumAmount", { amount }) : t("reasonBelowMinimum")
			}

			case "ORDER_TOTAL_TOO_HIGH": {
				const amount = money(method.maxOrderTotal)
				return amount ? t("reasonAboveMaximumAmount", { amount }) : t("reasonAboveMaximum")
			}

			/*
			 * Not "unavailable in your country" — nobody has said which country it
			 * is yet. See AWAITING_COUNTRY on the API side.
			 */
			case "AWAITING_COUNTRY":
				return t("reasonAwaitingCountry")

			case "COUNTRY_NOT_ALLOWED":
				return t("reasonCountryNotAllowed")

			case "REQUIRES_LOGIN":
				return t("reasonRequiresLogin")

			// INACTIVE, ROLE_NOT_ALLOWED, and anything a newer API adds. Both say
			// more about the shop's configuration than about this customer, and
			// neither gives them something to do.
			default:
				return t("notEligible")
		}
	}
}

export default usePaymentReason
