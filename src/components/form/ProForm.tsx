"use client"

import type { ReactNode } from "react"
import {
	FormProvider,
	useForm,
	type DefaultValues,
	type FieldValues,
	type Resolver,
	type SubmitHandler,
} from "react-hook-form"

export interface ProFormProps<TValues extends FieldValues = FieldValues> {
	children: ReactNode
	onSubmit: SubmitHandler<TValues>
	/**
	 * Usually zodResolver(schema). Generic so the schema's shape flows into
	 * TValues and onSubmit receives typed values — a non-generic version widens
	 * everything to FieldValues and a renamed field stops being a type error.
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	resolver?: Resolver<TValues, any, any>
	defaultValues?: DefaultValues<TValues>
	/**
	 * Clear the fields after a successful submit.
	 *
	 * Off by default, unlike the healthcare original. A create-and-close modal
	 * wants it; an edit form does not — a product editor that blanks itself on
	 * save looks exactly like it lost the record.
	 */
	resetOnSubmit?: boolean
	className?: string
	id?: string
}

/**
 * Form shell. Holds the react-hook-form context so every Pro* field below can
 * find it with useFormContext and no props have to be threaded down.
 *
 * onSubmit may be async — it is awaited, so formState.isSubmitting stays true
 * for the whole request and ProSubmit can show a spinner without extra state.
 */
export const ProForm = <TValues extends FieldValues = FieldValues>({
	children,
	onSubmit,
	resolver,
	defaultValues,
	resetOnSubmit = false,
	className,
	id,
}: ProFormProps<TValues>) => {
	const methods = useForm<TValues>({
		...(resolver ? { resolver } : {}),
		...(defaultValues ? { defaultValues } : {}),
	})

	const submit: SubmitHandler<TValues> = async (data) => {
		await onSubmit(data)
		if (resetOnSubmit) methods.reset()
	}

	return (
		<FormProvider {...methods}>
			<form id={id} className={className} onSubmit={methods.handleSubmit(submit)} noValidate>
				{children}
			</form>
		</FormProvider>
	)
}

export default ProForm
