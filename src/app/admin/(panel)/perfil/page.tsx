import { redirect } from "next/navigation";

import { AdminProfileForm } from "@/components/admin-profile-form";
import { AdminPushNotifications } from "@/components/admin-push-notifications";
import { AnimatedSection } from "@/components/animated-section";
import { SectionTitle } from "@/components/section-title";
import { getStaffAccessOrNull } from "@/lib/admin-auth";
import { isCloudinaryConfigured } from "@/lib/cloudinary-server";

export const dynamic = "force-dynamic";

export default async function AdminPerfilPage() {
  const access = await getStaffAccessOrNull();
  if (!access) {
    redirect("/admin/login");
  }

  return (
    <main className="flex-1">
      <section className="container-max pt-6 pb-16">
        <AnimatedSection>
          <SectionTitle eyebrow="Conta" title="Meu perfil" />
          <div className="mt-8">
            <AdminProfileForm
              email={access.email ?? ""}
              displayName={access.displayName}
              phone={access.phone}
              profileImageUrl={access.profileImageUrl}
              avatarUploadEnabled={isCloudinaryConfigured()}
            />
            <div className="mt-8">
              <AdminPushNotifications />
            </div>
          </div>
        </AnimatedSection>
      </section>
    </main>
  );
}
