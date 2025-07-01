import { pdb_acquireLock, pdb_isLocked, pseudoDb } from "@/app/pseudo-db";

export async function GET() {
  if (pdb_isLocked()) {
    return Response.json({
      isUsedByAnotherRequest: true,
      pseudoDb,
    });
  } else {
    await pdb_acquireLock();
    return Response.json({
      didAcquireLock: true,
      newDb: pseudoDb,
    });
  }
}
