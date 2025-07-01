import { setTimeout } from "timers/promises";
import { v4 as uuidv4 } from "uuid";

export const pseudoDb = {
  isLocked: false,
  instanceDate: new Date(),
  lastUpdated: new Date(),
  _v: "1",
  id: uuidv4(),
};

export const pdb_isLocked = () => {
  return pseudoDb.isLocked;
};

export const pdb_acquireLock = async () => {
  pseudoDb.isLocked = true;

  await setTimeout(25_000, "free");

  pseudoDb.lastUpdated = new Date();
  pseudoDb.isLocked = false;

  return pseudoDb;
};

console.log("@db-instance", pseudoDb.id);
