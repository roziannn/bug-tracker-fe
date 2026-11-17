import { ServiceRequestDetailPage } from "@/features/service-requests/components/service-request-detail-page";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ServiceRequestDetailPage id={(await params).id} />;
}
