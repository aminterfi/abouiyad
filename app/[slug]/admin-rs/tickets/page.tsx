import { redirect } from 'next/navigation'

type Params = Promise<{ slug: string }>

export default async function AdminRsTicketsAliasPage({ params }: { params: Params }) {
  const { slug } = await params
  redirect(`/${slug}/cabinet/tickets`)
}
