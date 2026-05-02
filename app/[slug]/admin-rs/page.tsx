import { redirect } from 'next/navigation'
import { isManagementSlug } from '@/lib/workspace'

type Params = Promise<{ slug: string }>

export default async function AdminRsAliasPage({ params }: { params: Params }) {
  const { slug } = await params
  if (!isManagementSlug(slug)) {
    redirect(`/${slug}/client`)
  }
  redirect(`/${slug}/cabinet/clients`)
}
