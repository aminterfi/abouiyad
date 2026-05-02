import { redirect } from 'next/navigation'

type Params = Promise<{ slug: string }>

export default async function AdminRsDemandesAliasPage({ params }: { params: Params }) {
  const { slug } = await params
  redirect(`/${slug}/cabinet/demandes`)
}
