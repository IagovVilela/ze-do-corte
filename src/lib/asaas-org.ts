import "server-only";

import { prisma } from "@/lib/prisma";
import { decryptAsaasSecret } from "@/lib/asaas-crypto";

export async function getOrgAsaasApiKey(
  organizationId: string,
): Promise<string | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      asaasEnabled: true,
      asaasApiKeyEnc: true,
    },
  });
  if (!org?.asaasEnabled || !org.asaasApiKeyEnc) return null;
  try {
    return decryptAsaasSecret(org.asaasApiKeyEnc);
  } catch (error) {
    console.error("Falha ao decifrar API key Asaas da org", organizationId, error);
    return null;
  }
}
