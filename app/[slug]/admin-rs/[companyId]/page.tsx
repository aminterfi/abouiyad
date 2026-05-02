import { redirect } from 'next/navigation'

type Params = Promise<{ slug: string; companyId: string }>

export default async function AdminRsCompanyAliasPage({ params }: { params: Params }) {
  const { slug, companyId } = await params
  redirect(`/${slug}/cabinet/clients/${companyId}`)
}
