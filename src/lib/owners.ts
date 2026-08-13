import { prisma } from "./prisma";

export interface OwnerOption {
  id: number;
  name: string;
  type: string;
}

export async function getOwners(): Promise<OwnerOption[]> {
  const owners = await prisma.owner.findMany({
    orderBy: { name: "asc" },
  });

  return owners.map((owner) => ({
    id: owner.id,
    name: owner.name,
    type: owner.type,
  }));
}
