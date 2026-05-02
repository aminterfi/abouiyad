import { redirect } from 'next/navigation'

type Params = Promise<{ slug: string }>

export default async function AdminRsDocumentsAliasPage({ params }: { params: Params }) {
  const { slug } = await params
  redirect(`/${slug}/cabinet/documents`)
}
