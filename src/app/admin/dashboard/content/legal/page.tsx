import { loadShippedLegal } from "@/content/legal"
import LegalContentForm from "../_components/LegalContentForm"

/**
 * Impressum, Datenschutz and AGB.
 *
 * A server component, and that is the whole point of the split: the three
 * documents that ship with the storefront are read here, on the server, and
 * handed to the form as ordinary props. Importing them into the client bundle
 * instead would have put a quarter of a megabyte of legal HTML into every
 * dashboard page load.
 *
 * They are read so the editor opens showing the document that is on the site —
 * the fields on the other content screens do the same with the message
 * catalogue. An empty box on this screen used to mean "nobody has edited this",
 * which is not what it looked like: it looked like the page was empty.
 */
export default async function LegalContentPage() {
	return <LegalContentForm shipped={await loadShippedLegal()} />
}
